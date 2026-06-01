create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select auth.role() = 'authenticated';
$$;

create or replace function public.get_community_welcome_pending(p_limit integer default 500)
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
  v_limit integer := greatest(1, least(coalesce(p_limit, 500), 1000));
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
    )::text,
    nullif(to_jsonb(event_record)->>'event_date', '')::text,
    attendee.first_name,
    attendee.last_name,
    attendee.full_name,
    attendee.email,
    attendee.community_consent_at,
    nullif(to_jsonb(attendee)->>'created_at', '')::timestamptz
  from public.event_attendees attendee
  left join public.events event_record on event_record.id = attendee.event_id
  where attendee.community_consent is true
    and attendee.community_welcome_sent is false
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

create or replace function public.list_community_welcome_pending(p_limit integer default 500)
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
begin
  if not public.is_admin() then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  return query
  select *
  from public.get_community_welcome_pending(p_limit);
end;
$$;

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
    where attendee.community_consent is true
      and attendee.community_welcome_sent is false
  );
end;
$$;

revoke all on function public.get_community_welcome_pending(integer) from public;
revoke all on function public.list_community_welcome_pending(integer) from public;
revoke all on function public.get_community_welcome_pending_count() from public;

grant execute on function public.get_community_welcome_pending(integer) to authenticated;
grant execute on function public.list_community_welcome_pending(integer) to authenticated;
grant execute on function public.get_community_welcome_pending_count() to authenticated;

notify pgrst, 'reload schema';
