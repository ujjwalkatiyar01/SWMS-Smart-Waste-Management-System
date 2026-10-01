-- 0800 — Verified staff sign-up (user decision 2026-10-01). Each organisation keeps a staff list
-- (staff ID + work email + role + worker type). Sign-up as worker or admin works only when the typed
-- staff ID and the email match an unused entry; the role always comes from the list, never the form.
-- No government database is connected: this list, maintained by the organisation, is the check.

alter table public.users
  add column staff_id text,
  add column worker_type text check (worker_type in ('collector', 'driver'));

create table public.staff_roster (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  staff_id text not null check (staff_id ~ '^[A-Za-z0-9-]{3,40}$'),
  email text not null check (length(email) between 3 and 254),
  role text not null check (role in ('worker', 'admin')),
  worker_type text check (worker_type in ('collector', 'driver')),
  claimed_by uuid references public.users(id),
  claimed_at timestamptz,
  added_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  check ((role = 'worker') = (worker_type is not null))
);
create unique index staff_roster_org_staff_id on public.staff_roster (org_id, upper(staff_id));
create unique index staff_roster_org_email on public.staff_roster (org_id, lower(email));

-- Only the organisation's admins read the list; changes go through the functions below.
alter table public.staff_roster enable row level security;
create policy staff_roster_admin_read on public.staff_roster for select to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) = 'admin');
revoke all on public.staff_roster from anon;
revoke insert, update, delete on public.staff_roster from authenticated;

-- Same checks as 0005 for every sign-up; a staff_id in the metadata switches to the verified path.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := (new.raw_user_meta_data ->> 'org_id')::uuid;
  v_area uuid := nullif(new.raw_user_meta_data ->> 'area_id', '')::uuid;
  v_staff_id text := nullif(trim(new.raw_user_meta_data ->> 'staff_id'), '');
  v_entry public.staff_roster;
begin
  if not exists (select 1 from public.organizations o where o.id = v_org) then
    raise exception 'Unknown organisation';
  end if;
  if v_area is not null and not exists
     (select 1 from public.areas a where a.id = v_area and a.org_id = v_org and a.active) then
    raise exception 'Area does not belong to this organisation';
  end if;

  if v_staff_id is null then
    insert into public.users (id, org_id, name, email, phone, area_id, role)
    values (new.id, v_org, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email,
            new.raw_user_meta_data ->> 'phone', v_area, 'resident');
    return new;
  end if;

  select * into v_entry from public.staff_roster r
  where r.org_id = v_org and upper(r.staff_id) = upper(v_staff_id)
    and lower(r.email) = lower(new.email) and r.claimed_by is null
  for update;
  -- The chosen role and worker type must match the list too, so a collector ID cannot open a driver account.
  if not found
     or v_entry.role is distinct from (new.raw_user_meta_data ->> 'staff_role')
     or (v_entry.role = 'worker'
         and v_entry.worker_type is distinct from (new.raw_user_meta_data ->> 'worker_type')) then
    raise exception 'Staff ID not verified';
  end if;

  insert into public.users (id, org_id, name, email, phone, area_id, role, staff_id, worker_type)
  values (new.id, v_org, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email,
          new.raw_user_meta_data ->> 'phone', v_area, v_entry.role, v_entry.staff_id, v_entry.worker_type);
  update public.staff_roster set claimed_by = new.id, claimed_at = now() where id = v_entry.id;
  perform private.notify_role(v_org, 'admin', 'staff_signup', 'user', new.id,
    'Verified staff sign-up: ' || coalesce(new.raw_user_meta_data ->> 'name', new.email)
    || ' (' || v_entry.staff_id || ')');
  return new;
end $$;

create or replace function public.add_staff_id(
  p_staff_id text, p_email text, p_role text, p_worker_type text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if private.my_role() is distinct from 'admin' then raise exception 'Not allowed'; end if;
  insert into public.staff_roster (org_id, staff_id, email, role, worker_type, added_by)
  values (private.my_org(), upper(trim(p_staff_id)), lower(trim(p_email)), p_role,
          case when p_role = 'worker' then p_worker_type end, auth.uid())
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Staff ID or email already listed';
end $$;

-- An entry that was already used to sign up stays as the record of who verified with it.
create or replace function public.remove_staff_id(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if private.my_role() is distinct from 'admin' then raise exception 'Not allowed'; end if;
  delete from public.staff_roster
  where id = p_id and org_id = private.my_org() and claimed_by is null;
  if not found then raise exception 'Not allowed'; end if;
end $$;

revoke all on function public.add_staff_id(text, text, text, text), public.remove_staff_id(uuid) from public, anon;
grant execute on function public.add_staff_id(text, text, text, text), public.remove_staff_id(uuid) to authenticated;
