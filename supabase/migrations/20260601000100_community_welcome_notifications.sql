create extension if not exists "pgcrypto";

alter table public.event_attendees
  add column if not exists community_welcome_sent boolean,
  add column if not exists community_welcome_sent_at timestamptz,
  add column if not exists community_welcome_sent_by uuid references auth.users(id) on delete set null,
  add column if not exists community_consent_at timestamptz;

update public.event_attendees
set community_welcome_sent = false
where community_welcome_sent is null;

alter table public.event_attendees
  alter column community_welcome_sent set default false,
  alter column community_welcome_sent set not null;

update public.event_attendees attendee
set community_consent_at = coalesce(
  nullif(to_jsonb(attendee)->>'created_at', '')::timestamptz,
  nullif(to_jsonb(attendee)->>'consent_at', '')::timestamptz,
  nullif(to_jsonb(attendee)->>'ticket_generated_at', '')::timestamptz,
  nullif(to_jsonb(attendee)->>'invitation_generated_at', '')::timestamptz,
  nullif(to_jsonb(attendee)->>'updated_at', '')::timestamptz,
  now()
)
where attendee.community_consent = true
  and attendee.community_consent_at is null;

create index if not exists event_attendees_community_welcome_pending_idx
  on public.event_attendees (community_consent_at desc, id)
  where community_consent = true
    and community_welcome_sent = false;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select auth.role() = 'authenticated';
$$;

alter table public.event_attendees enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_attendees'
      and policyname = 'event attendees select admin'
  ) then
    create policy "event attendees select admin"
      on public.event_attendees
      for select
      to authenticated
      using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_attendees'
      and policyname = 'event attendees insert admin'
  ) then
    create policy "event attendees insert admin"
      on public.event_attendees
      for insert
      to authenticated
      with check (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_attendees'
      and policyname = 'event attendees update admin'
  ) then
    create policy "event attendees update admin"
      on public.event_attendees
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_attendees'
      and policyname = 'event attendees delete admin'
  ) then
    create policy "event attendees delete admin"
      on public.event_attendees
      for delete
      to authenticated
      using (public.is_admin());
  end if;
end $$;

create or replace function public.get_community_welcome_pending_count()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  return (
    select count(*)::integer
    from public.event_attendees attendee
    where attendee.community_consent = true
      and attendee.community_welcome_sent = false
  );
end;
$$;

create or replace function public.list_community_welcome_pending(p_limit integer default 8)
returns table (
  attendee_id uuid,
  event_id uuid,
  event_title text,
  event_date text,
  first_name text,
  last_name text,
  full_name text,
  email text,
  community_consent_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 8), 50));
begin
  if not public.is_admin() then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  return query
  select
    attendee.id,
    attendee.event_id,
    coalesce(
      nullif(to_jsonb(event_record)->>'title', ''),
      nullif(to_jsonb(event_record)->>'name', ''),
      'Evento'
    ),
    nullif(to_jsonb(event_record)->>'event_date', ''),
    attendee.first_name,
    attendee.last_name,
    attendee.full_name,
    attendee.email,
    attendee.community_consent_at,
    nullif(to_jsonb(attendee)->>'created_at', '')::timestamptz
  from public.event_attendees attendee
  left join public.events event_record on event_record.id = attendee.event_id
  where attendee.community_consent = true
    and attendee.community_welcome_sent = false
  order by coalesce(
    attendee.community_consent_at,
    nullif(to_jsonb(attendee)->>'created_at', '')::timestamptz,
    nullif(to_jsonb(attendee)->>'ticket_generated_at', '')::timestamptz,
    nullif(to_jsonb(attendee)->>'invitation_generated_at', '')::timestamptz,
    nullif(to_jsonb(attendee)->>'updated_at', '')::timestamptz
  ) desc nulls last,
  attendee.id desc
  limit v_limit;
end;
$$;

create or replace function public.mark_community_welcome_sent(p_attendee_id uuid)
returns table (
  attendee_id uuid,
  community_welcome_sent_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  return query
  update public.event_attendees attendee
  set
    community_welcome_sent = true,
    community_welcome_sent_at = now(),
    community_welcome_sent_by = auth.uid()
  where attendee.id = p_attendee_id
    and attendee.community_consent = true
  returning attendee.id, attendee.community_welcome_sent_at;

  if not found then
    raise exception 'Pendiente de bienvenida no encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.get_community_welcome_pending_count() from public;
revoke all on function public.list_community_welcome_pending(integer) from public;
revoke all on function public.mark_community_welcome_sent(uuid) from public;

grant execute on function public.get_community_welcome_pending_count() to authenticated;
grant execute on function public.list_community_welcome_pending(integer) to authenticated;
grant execute on function public.mark_community_welcome_sent(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.event_attendees;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

notify pgrst, 'reload schema';
