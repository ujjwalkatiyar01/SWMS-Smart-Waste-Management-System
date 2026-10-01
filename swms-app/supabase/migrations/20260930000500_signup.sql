-- 0005 — 06 §6. Source of truth: DOCUMENTATION/06-PHYSICAL-SCHEMA.md; copied without changes.

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := (new.raw_user_meta_data ->> 'org_id')::uuid;
  v_area uuid := nullif(new.raw_user_meta_data ->> 'area_id', '')::uuid;
begin
  if not exists (select 1 from public.organizations o where o.id = v_org) then
    raise exception 'Unknown organisation';
  end if;
  if v_area is not null and not exists
     (select 1 from public.areas a where a.id = v_area and a.org_id = v_org and a.active) then
    raise exception 'Area does not belong to this organisation';
  end if;
  insert into public.users (id, org_id, name, email, phone, area_id, role)
  values (new.id, v_org, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email,
          new.raw_user_meta_data ->> 'phone', v_area, 'resident');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- The sign-up page needs organisation and area names before login (names only, no settings)
create or replace function public.list_orgs_for_signup()
returns table (id uuid, name text, type text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.name, o.type from public.organizations o order by o.name
$$;

create or replace function public.list_areas_for_signup(p_org uuid)
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.name from public.areas a where a.org_id = p_org and a.active order by a.name
$$;
