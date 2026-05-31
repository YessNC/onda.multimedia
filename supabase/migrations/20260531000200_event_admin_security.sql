create extension if not exists "pgcrypto";

alter table public.events
  add column if not exists title text,
  add column if not exists event_date date,
  add column if not exists location text,
  add column if not exists description text,
  add column if not exists status text not null default 'draft',
  add column if not exists visibility text not null default 'private',
  add column if not exists ticket_button_enabled boolean not null default false,
  add column if not exists ticket_url text,
  add column if not exists ticket_button_label text not null default 'Comprar entradas',
  add column if not exists qr_checkin_enabled boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists deleted_at timestamptz;

update public.events
set
  status = case lower(coalesce(status, ''))
    when 'draft' then 'draft'
    when 'borrador' then 'draft'
    when 'upcoming' then 'upcoming'
    when 'published' then 'upcoming'
    when 'publicado' then 'upcoming'
    when 'proximo' then 'upcoming'
    when 'archived' then 'archived'
    when 'archive' then 'archived'
    when 'archivo' then 'archived'
    when 'cancelled' then 'cancelled'
    when 'canceled' then 'cancelled'
    when 'cancelado' then 'cancelled'
    else 'draft'
  end,
  visibility = case lower(coalesce(visibility, ''))
    when 'public' then 'public'
    when 'publico' then 'public'
    when 'private' then 'private'
    when 'privado' then 'private'
    else 'private'
  end,
  ticket_button_enabled = coalesce(ticket_button_enabled, false),
  ticket_button_label = coalesce(nullif(ticket_button_label, ''), 'Comprar entradas'),
  qr_checkin_enabled = coalesce(qr_checkin_enabled, false);

update public.events
set
  ticket_button_enabled = false,
  ticket_url = null
where visibility = 'private';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_status_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_status_check
      check (status in ('draft', 'upcoming', 'archived', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'events_visibility_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_visibility_check
      check (visibility in ('public', 'private'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'events_private_ticket_disabled_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_private_ticket_disabled_check
      check (visibility = 'public' or ticket_button_enabled = false);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'events_ticket_url_http_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_ticket_url_http_check
      check (ticket_url is null or ticket_url ~* '^https?://');
  end if;
end $$;

create index if not exists events_admin_active_idx
  on public.events (event_date, status)
  where deleted_at is null;

create index if not exists events_public_published_idx
  on public.events (event_date)
  where deleted_at is null and status = 'upcoming';

alter table public.event_attendees
  add column if not exists check_in_status text not null default 'pending',
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_in_by uuid references auth.users(id) on delete set null;

update public.event_attendees
set check_in_status = case lower(coalesce(check_in_status, ''))
  when 'pending' then 'pending'
  when 'pendiente' then 'pending'
  when 'checked_in' then 'checked_in'
  when 'checked-in' then 'checked_in'
  when 'validado' then 'checked_in'
  when 'used' then 'checked_in'
  when 'cancelled' then 'cancelled'
  when 'canceled' then 'cancelled'
  when 'cancelado' then 'cancelled'
  else 'pending'
end;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'event_attendees_check_in_status_check'
      and conrelid = 'public.event_attendees'::regclass
  ) then
    alter table public.event_attendees
      add constraint event_attendees_check_in_status_check
      check (check_in_status in ('pending', 'checked_in', 'cancelled'));
  end if;
end $$;

create table if not exists public.check_in_logs (
  id uuid primary key default gen_random_uuid(),
  attendee_id uuid references public.event_attendees(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  token_scanned text not null,
  scanned_by uuid references auth.users(id) on delete set null,
  result text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.check_in_logs
  add column if not exists attendee_id uuid references public.event_attendees(id) on delete set null,
  add column if not exists event_id uuid references public.events(id) on delete set null,
  add column if not exists token_scanned text,
  add column if not exists scanned_by uuid references auth.users(id) on delete set null,
  add column if not exists result text,
  add column if not exists message text,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'check_in_logs_result_check'
      and conrelid = 'public.check_in_logs'::regclass
  ) then
    alter table public.check_in_logs
      add constraint check_in_logs_result_check
      check (result in ('checked_in', 'already_used', 'cancelled', 'not_found', 'wrong_event', 'error'));
  end if;
end $$;

create index if not exists check_in_logs_event_created_idx
  on public.check_in_logs (event_id, created_at desc);

create index if not exists check_in_logs_attendee_created_idx
  on public.check_in_logs (attendee_id, created_at desc);

alter table public.check_in_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'check_in_logs'
      and policyname = 'check in logs select authenticated'
  ) then
    create policy "check in logs select authenticated"
      on public.check_in_logs
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'check_in_logs'
      and policyname = 'check in logs insert authenticated'
  ) then
    create policy "check in logs insert authenticated"
      on public.check_in_logs
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

create or replace function public.validate_attendee_qr_for_event(
  p_qr_token text,
  p_event_id uuid
)
returns table (
  result text,
  message text,
  attendee_id uuid,
  event_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attendee public.event_attendees%rowtype;
  v_scanned_by uuid := auth.uid();
  v_status text;
begin
  select *
  into v_attendee
  from public.event_attendees
  where qr_token = p_qr_token
  limit 1;

  if not found then
    insert into public.check_in_logs (event_id, token_scanned, scanned_by, result, message)
    values (p_event_id, p_qr_token, v_scanned_by, 'not_found', 'Entrada no encontrada.');

    return query select 'not_found'::text, 'Entrada no encontrada.'::text, null::uuid, p_event_id;
    return;
  end if;

  if v_attendee.event_id is distinct from p_event_id then
    insert into public.check_in_logs (attendee_id, event_id, token_scanned, scanned_by, result, message)
    values (v_attendee.id, p_event_id, p_qr_token, v_scanned_by, 'wrong_event', 'Esta entrada pertenece a otro evento.');

    return query select
      'wrong_event'::text,
      'Esta entrada pertenece a otro evento.'::text,
      v_attendee.id,
      p_event_id;
    return;
  end if;

  v_status := coalesce(v_attendee.check_in_status, 'pending');

  if v_status = 'cancelled' then
    insert into public.check_in_logs (attendee_id, event_id, token_scanned, scanned_by, result, message)
    values (v_attendee.id, v_attendee.event_id, p_qr_token, v_scanned_by, 'cancelled', 'Entrada cancelada.');

    return query select 'cancelled'::text, 'Entrada cancelada.'::text, v_attendee.id, v_attendee.event_id;
    return;
  end if;

  if v_status = 'checked_in' or v_attendee.checked_in_at is not null then
    insert into public.check_in_logs (attendee_id, event_id, token_scanned, scanned_by, result, message)
    values (v_attendee.id, v_attendee.event_id, p_qr_token, v_scanned_by, 'already_used', 'Entrada ya utilizada.');

    return query select 'already_used'::text, 'Entrada ya utilizada.'::text, v_attendee.id, v_attendee.event_id;
    return;
  end if;

  update public.event_attendees
  set
    check_in_status = 'checked_in',
    checked_in_at = now(),
    checked_in_by = v_scanned_by
  where id = v_attendee.id;

  insert into public.check_in_logs (attendee_id, event_id, token_scanned, scanned_by, result, message)
  values (v_attendee.id, v_attendee.event_id, p_qr_token, v_scanned_by, 'checked_in', 'Entrada validada correctamente.');

  return query select
    'checked_in'::text,
    'Entrada validada correctamente.'::text,
    v_attendee.id,
    v_attendee.event_id;
end;
$$;

grant execute on function public.validate_attendee_qr_for_event(text, uuid) to authenticated;
