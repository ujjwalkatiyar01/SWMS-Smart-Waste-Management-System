-- Case lifecycle from 06 §8.2 (F4, F5): reject, correct type, return, close, reopen, follow,
-- instruction, evidence, delay note. Each function owns one allowed change and checks role,
-- organisation and current status itself.

create or replace function private.is_open_case(p_status text) returns boolean
language sql immutable set search_path = '' as $$
  select p_status in ('submitted','assigned','returned','awaiting_review','disputed','reopened')
$$;

-- F5: admin rejects an invalid, duplicate or out-of-area report (only while submitted)
create or replace function public.reject_report(p_report uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me public.users;
  v_r public.reports;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_r from public.reports where id = p_report for update;
  if v_me.id is null or v_r.id is null or v_r.org_id <> v_me.org_id or v_me.role <> 'admin' then
    raise exception 'Not allowed';
  end if;
  if v_r.status <> 'submitted' then raise exception 'This case cannot be rejected in its current status'; end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'Add a reason'; end if;

  update public.reports set status = 'rejected', close_reason = trim(p_reason) where id = p_report;
  perform private.log_event(v_r.org_id, p_report, v_me.id, 'rejected', trim(p_reason));
  perform private.notify_case(p_report, 'rejected', 'Your report was not accepted. Open it to see the reason.');
end $$;

-- F5: admin corrects a wrong issue type; the due time is recomputed from the report time
create or replace function public.correct_issue_type(p_report uuid, p_type text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me public.users;
  v_r public.reports;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_r from public.reports where id = p_report for update;
  if v_me.id is null or v_r.id is null or v_r.org_id <> v_me.org_id or v_me.role <> 'admin' then
    raise exception 'Not allowed';
  end if;
  if not private.is_open_case(v_r.status) then raise exception 'This case cannot be changed in its current status'; end if;
  if not exists (select 1 from public.organizations o
                 where o.id = v_r.org_id and o.deadline_hours_json ? p_type) then
    raise exception 'Invalid issue type';
  end if;
  if p_type = v_r.issue_type then return; end if;

  update public.reports set issue_type = p_type,
    due_at = private.due_at_for(v_r.org_id, p_type, v_r.waste_category, v_r.created_at)
  where id = p_report;
  perform private.log_event(v_r.org_id, p_report, v_me.id, 'type_changed',
    replace(v_r.issue_type, '_', ' ') || ' → ' || replace(p_type, '_', ' '));
end $$;

-- F4.5: the assigned worker gives the task back with a reason; the due time does not change
create or replace function public.return_report(p_report uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me public.users;
  v_r public.reports;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_r from public.reports where id = p_report for update;
  if v_me.id is null or v_r.id is null or v_r.assigned_worker_id <> v_me.id or v_r.status <> 'assigned' then
    raise exception 'Not allowed';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'Add a reason'; end if;

  update public.reports set status = 'returned', assigned_worker_id = null where id = p_report;
  perform private.log_event(v_r.org_id, p_report, v_me.id, 'returned', trim(p_reason));
  perform private.notify_role(v_r.org_id, 'admin', 'returned', 'report', p_report, 'A worker returned a task');
end $$;

-- F5: admin closes a case after review or a dispute; p_valid decides whether it counts for rewards (D3)
create or replace function public.close_report(p_report uuid, p_reason text, p_valid boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me public.users;
  v_r public.reports;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_r from public.reports where id = p_report for update;
  if v_me.id is null or v_r.id is null or v_r.org_id <> v_me.org_id or v_me.role <> 'admin' then
    raise exception 'Not allowed';
  end if;
  if v_r.status not in ('awaiting_review','disputed') then
    raise exception 'This case cannot be closed in its current status';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'Add a reason'; end if;

  update public.reports set status = 'closed', close_reason = trim(p_reason), closed_at = now(),
    sla_met = (now() <= due_at), closed_as_valid = coalesce(p_valid, false)
  where id = p_report;
  perform private.log_event(v_r.org_id, p_report, v_me.id, 'closed', trim(p_reason));
  if coalesce(p_valid, false) then perform private.award_points(p_report); end if;
  perform private.notify_case(p_report, 'closed', 'Your case was closed by an admin');
end $$;

-- F4.7: the reporter reopens a closed case inside the reopen window; later problems are new reports
create or replace function public.reopen_report(p_report uuid, p_reason text, p_photo text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me public.users;
  v_r public.reports;
  v_org public.organizations;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_r from public.reports where id = p_report for update;
  if v_me.id is null or v_r.id is null or v_r.reporter_id <> v_me.id or v_r.status <> 'closed' then
    raise exception 'Not allowed';
  end if;
  select * into v_org from public.organizations where id = v_r.org_id;
  if v_r.closed_at is null or now() > v_r.closed_at + make_interval(days => v_org.reopen_window_days) then
    raise exception 'The reopen window has ended';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'Add a reason'; end if;
  if p_photo is not null and p_photo not like v_r.org_id::text || '/reports/' || p_report::text || '/%' then
    raise exception 'Invalid photo';
  end if;

  update public.reports set status = 'reopened', reopen_count = reopen_count + 1 where id = p_report;
  perform private.log_event(v_r.org_id, p_report, v_me.id, 'reopened', trim(p_reason), p_photo);
  perform private.notify_role(v_r.org_id, 'admin', 'reopened', 'report', p_report, 'A closed case was reopened');
end $$;

-- F3.3b: a resident follows someone else's open case at a registered place instead of reporting again
create or replace function public.follow_report(p_report uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me public.users;
  v_r public.reports;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_r from public.reports where id = p_report;
  if v_me.id is null or v_me.role <> 'resident' or v_r.id is null or v_r.org_id <> v_me.org_id
     or v_r.reporter_id = v_me.id or v_r.location_id is null or not private.is_open_case(v_r.status) then
    raise exception 'Not allowed';
  end if;
  insert into public.report_followers (org_id, report_id, user_id) values (v_r.org_id, p_report, v_me.id)
  on conflict (report_id, user_id) do nothing;
end $$;

-- F5.2: supervisor or higher authority adds an instruction to an open case
create or replace function public.add_instruction(p_report uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me public.users;
  v_r public.reports;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_r from public.reports where id = p_report;
  if v_me.id is null or v_r.id is null or v_r.org_id <> v_me.org_id
     or v_me.role not in ('supervisor','higher_authority') or not private.is_open_case(v_r.status) then
    raise exception 'Not allowed';
  end if;
  if length(trim(coalesce(p_note, ''))) = 0 then raise exception 'Add a reason'; end if;

  perform private.log_event(v_r.org_id, p_report, v_me.id, 'instruction', trim(p_note));
  perform private.notify_role(v_r.org_id, 'admin', 'instruction', 'report', p_report, 'New instruction on a case');
  perform private.notify(v_r.org_id, v_r.assigned_worker_id, 'instruction', 'report', p_report, 'New instruction on your task');
end $$;

-- R4: the reporter or a follower adds a photo or note to an open case (no new report)
create or replace function public.add_evidence(p_report uuid, p_photo text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me public.users;
  v_r public.reports;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_r from public.reports where id = p_report;
  if v_me.id is null or v_r.id is null or v_r.org_id <> v_me.org_id or not private.is_open_case(v_r.status)
     or not (v_r.reporter_id = v_me.id or exists (
       select 1 from public.report_followers f where f.report_id = p_report and f.user_id = v_me.id)) then
    raise exception 'Not allowed';
  end if;
  if p_photo is null and length(trim(coalesce(p_note, ''))) = 0 then raise exception 'Add a photo or a note'; end if;
  if p_photo is not null and p_photo not like v_r.org_id::text || '/reports/' || p_report::text || '/evidence-%' then
    raise exception 'Invalid photo';
  end if;

  perform private.log_event(v_r.org_id, p_report, v_me.id, 'evidence_added', nullif(trim(coalesce(p_note, '')), ''), p_photo);
  perform private.notify_role(v_r.org_id, 'admin', 'evidence_added', 'report', p_report, 'New evidence added to a case');
end $$;

-- R5: admin or the assigned worker records why an overdue case is late and what happens next
create or replace function public.add_delay_note(p_report uuid, p_reason text, p_next_step text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me public.users;
  v_r public.reports;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_r from public.reports where id = p_report;
  if v_me.id is null or v_r.id is null or v_r.org_id <> v_me.org_id
     or not (v_me.role = 'admin' or v_r.assigned_worker_id = v_me.id) then
    raise exception 'Not allowed';
  end if;
  if not private.is_open_case(v_r.status) or now() <= v_r.due_at then
    raise exception 'This case is not overdue';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 or length(trim(coalesce(p_next_step, ''))) = 0 then
    raise exception 'Add a reason and a next step';
  end if;

  insert into public.report_events (org_id, report_id, actor_id, type, note, data)
  values (v_r.org_id, p_report, v_me.id, 'delay_note', trim(p_reason),
          jsonb_build_object('reason', trim(p_reason), 'next_step', trim(p_next_step)));
  perform private.notify_role(v_r.org_id, 'admin', 'delay_note', 'report', p_report, 'A delay reason was recorded');
  perform private.notify_role(v_r.org_id, 'supervisor', 'delay_note', 'report', p_report, 'A delay reason was recorded');
end $$;

revoke all on function private.is_open_case(text) from public;
revoke all on function
  public.reject_report(uuid, text), public.correct_issue_type(uuid, text), public.return_report(uuid, text),
  public.close_report(uuid, text, boolean), public.reopen_report(uuid, text, text), public.follow_report(uuid),
  public.add_instruction(uuid, text), public.add_evidence(uuid, text, text), public.add_delay_note(uuid, text, text)
  from public, anon;
grant execute on function
  public.reject_report(uuid, text), public.correct_issue_type(uuid, text), public.return_report(uuid, text),
  public.close_report(uuid, text, boolean), public.reopen_report(uuid, text, text), public.follow_report(uuid),
  public.add_instruction(uuid, text), public.add_evidence(uuid, text, text), public.add_delay_note(uuid, text, text)
  to authenticated;
