-- F2.2b / F3.3d: admin prints random location codes; residents resolve only a code they possess.
create or replace function public.get_qr_sheet()
returns table (id uuid, name text, kind text, qr_code text)
language sql stable security definer set search_path = '' as $$
  select l.id, l.name, l.kind, l.qr_code
  from public.locations l
  where l.org_id = private.my_org() and private.my_role() = 'admin' and l.active
  order by l.name
$$;

create or replace function public.resolve_qr(p_code text)
returns table (id uuid, name text, kind text, lat double precision, lng double precision)
language sql stable security definer set search_path = '' as $$
  select l.id, l.name, l.kind, l.lat, l.lng
  from public.locations l
  where l.org_id = private.my_org() and l.active and l.qr_code = p_code
    and length(p_code) between 16 and 80
  limit 1
$$;

revoke all on function public.get_qr_sheet(), public.resolve_qr(text) from public, anon;
grant execute on function public.get_qr_sheet(), public.resolve_qr(text) to authenticated;
