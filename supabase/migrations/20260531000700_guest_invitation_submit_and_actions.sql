create extension if not exists "pgcrypto";

alter table public.event_attendees
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists terms_accepted_at timestamptz;

update public.event_attendees
set privacy_accepted_at = coalesce(privacy_accepted_at, consent_at, ticket_generated_at, invitation_generated_at)
where accepted_privacy = true
  and privacy_accepted_at is null;

update public.event_attendees
set terms_accepted_at = coalesce(terms_accepted_at, consent_at, ticket_generated_at, invitation_generated_at)
where accepted_terms = true
  and terms_accepted_at is null;

drop function if exists public.guest_invitation(text);
drop function if exists public.get_guest_invitation(text);
drop function if exists public.generate_guest_invitation(text, text, text, text, text, text, boolean, boolean, boolean, text);
drop function if exists public.submit_guest_invitation(text, text, text, text, text, text, text, boolean, boolean, boolean, text);
drop function if exists public.submit_guest_invitation(uuid, text, text, text, text, text, text, boolean, boolean, boolean, text);

create or replace function public.get_guest_invitation(p_invitation_token text)
returns table (
  attendee_id uuid,
  event_id uuid,
  invitation_token text,
  first_name text,
  last_name text,
  full_name text,
  email text,
  instagram_handle text,
  phone text,
  guest_type text,
  ticket_status text,
  check_in_status text,
  checked_in_at timestamptz,
  accepted_privacy boolean,
  accepted_terms boolean,
  consent_at timestamptz,
  privacy_version text,
  terms_version text,
  community_consent boolean,
  community_consent_at timestamptz,
  ticket_generated_at timestamptz,
  ticket_downloaded_at timestamptz,
  invitation_expires_at timestamptz,
  qr_token text,
  access_code text,
  event_title text,
  event_date text,
  event_location text,
  event_description text,
  invitation_template_bucket text,
  invitation_template_path text,
  invitation_qr_x integer,
  invitation_qr_y integer,
  invitation_qr_width integer,
  invitation_qr_height integer,
  latest_invitation_bucket text,
  latest_invitation_path text,
  latest_invitation_file_name text,
  latest_invitation_generated_at timestamptz,
  latest_invitation_download_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.event_attendees
  set ticket_status = 'expired'
  where public.event_attendees.invitation_token = trim(coalesce(p_invitation_token, ''))
    and public.event_attendees.ticket_status = 'pending'
    and public.event_attendees.invitation_expires_at is not null
    and public.event_attendees.invitation_expires_at < now();

  return query
  with latest_invitation as (
    select generated.*
    from public.generated_invitations generated
    join public.event_attendees attendee on attendee.id = generated.attendee_id
    where attendee.invitation_token = trim(coalesce(p_invitation_token, ''))
    order by generated.generated_at desc
    limit 1
  )
  select
    attendee.id,
    attendee.event_id,
    attendee.invitation_token,
    attendee.first_name,
    attendee.last_name,
    attendee.full_name,
    attendee.email,
    attendee.instagram_handle,
    attendee.phone,
    attendee.guest_type,
    case
      when attendee.check_in_status = 'checked_in' or attendee.checked_in_at is not null then 'used'
      when attendee.check_in_status = 'cancelled' then 'cancelled'
      else coalesce(attendee.ticket_status, 'pending')
    end,
    attendee.check_in_status,
    attendee.checked_in_at,
    attendee.accepted_privacy,
    attendee.accepted_terms,
    attendee.consent_at,
    attendee.privacy_version,
    attendee.terms_version,
    attendee.community_consent,
    attendee.community_consent_at,
    attendee.ticket_generated_at,
    attendee.ticket_downloaded_at,
    attendee.invitation_expires_at,
    attendee.qr_token,
    attendee.access_code,
    coalesce(nullif(to_jsonb(event_record)->>'title', ''), nullif(to_jsonb(event_record)->>'name', ''), 'Evento'),
    event_record.event_date::text,
    event_record.location,
    event_record.description,
    coalesce(event_record.invitation_template_bucket, 'invitation-templates'),
    event_record.invitation_template_path,
    event_record.invitation_qr_x,
    event_record.invitation_qr_y,
    event_record.invitation_qr_width,
    event_record.invitation_qr_height,
    latest_invitation.bucket,
    latest_invitation.path,
    latest_invitation.file_name,
    latest_invitation.generated_at,
    latest_invitation.download_count
  from public.event_attendees attendee
  join public.events event_record on event_record.id = attendee.event_id
  left join latest_invitation on true
  where attendee.invitation_token = trim(coalesce(p_invitation_token, ''))
    and nullif(to_jsonb(event_record)->>'deleted_at', '') is null
    and (
      coalesce(to_jsonb(event_record)->>'status', '') = 'upcoming'
      or coalesce(nullif(to_jsonb(event_record)->>'is_published', ''), 'false')::boolean = true
    )
  limit 1;
end;
$$;

create or replace function public.guest_invitation(p_invitation_token text)
returns table (
  attendee_id uuid,
  event_id uuid,
  invitation_token text,
  first_name text,
  last_name text,
  full_name text,
  email text,
  instagram_handle text,
  phone text,
  guest_type text,
  ticket_status text,
  check_in_status text,
  checked_in_at timestamptz,
  accepted_privacy boolean,
  accepted_terms boolean,
  consent_at timestamptz,
  privacy_version text,
  terms_version text,
  community_consent boolean,
  community_consent_at timestamptz,
  ticket_generated_at timestamptz,
  ticket_downloaded_at timestamptz,
  invitation_expires_at timestamptz,
  qr_token text,
  access_code text,
  event_title text,
  event_date text,
  event_location text,
  event_description text,
  invitation_template_bucket text,
  invitation_template_path text,
  invitation_qr_x integer,
  invitation_qr_y integer,
  invitation_qr_width integer,
  invitation_qr_height integer,
  latest_invitation_bucket text,
  latest_invitation_path text,
  latest_invitation_file_name text,
  latest_invitation_generated_at timestamptz,
  latest_invitation_download_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query select * from public.get_guest_invitation(p_invitation_token);
end;
$$;

create or replace function public.submit_guest_invitation(
  p_invitation_token text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_instagram_handle text,
  p_occupation text,
  p_privacy_accepted boolean,
  p_terms_accepted boolean,
  p_community_consent boolean default false,
  p_user_agent text default null
)
returns table (
  result text,
  message text,
  attendee_id uuid,
  event_id uuid,
  invitation_token text,
  qr_token text,
  access_code text,
  ticket_status text,
  ticket_generated_at timestamptz,
  first_name text,
  last_name text,
  full_name text,
  email text,
  phone text,
  instagram_handle text,
  guest_type text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access_code text;
  v_attendee public.event_attendees%rowtype;
  v_community_at timestamptz;
  v_email text := lower(nullif(trim(coalesce(p_email, '')), ''));
  v_event public.events%rowtype;
  v_first_name text := nullif(trim(coalesce(p_first_name, '')), '');
  v_full_name text;
  v_generated_at timestamptz;
  v_instagram_handle text := nullif(regexp_replace(trim(coalesce(p_instagram_handle, '')), '^@+', ''), '');
  v_ip text;
  v_last_name text := nullif(trim(coalesce(p_last_name, '')), '');
  v_occupation text := nullif(trim(coalesce(p_occupation, '')), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_qr_token text;
  v_result text;
  v_user_agent text;
begin
  if v_instagram_handle is not null then
    v_instagram_handle := '@' || v_instagram_handle;
  end if;

  select *
  into v_attendee
  from public.event_attendees attendee
  where attendee.invitation_token = trim(coalesce(p_invitation_token, ''))
  limit 1
  for update;

  if not found then
    return query select 'invalid'::text, 'Este link no esta disponible o expiro.'::text, null::uuid, null::uuid, null::text, null::text, null::text, null::text, null::timestamptz, null::text, null::text, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  select *
  into v_event
  from public.events event_record
  where event_record.id = v_attendee.event_id
  limit 1;

  if not found
    or nullif(to_jsonb(v_event)->>'deleted_at', '') is not null
    or not (
      coalesce(to_jsonb(v_event)->>'status', '') = 'upcoming'
      or coalesce(nullif(to_jsonb(v_event)->>'is_published', ''), 'false')::boolean = true
    )
  then
    return query select 'invalid'::text, 'Este link no esta disponible o expiro.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, coalesce(v_attendee.ticket_status, 'pending'), v_attendee.ticket_generated_at, v_attendee.first_name, v_attendee.last_name, v_attendee.full_name, v_attendee.email, v_attendee.phone, v_attendee.instagram_handle, v_attendee.guest_type;
    return;
  end if;

  if v_attendee.invitation_expires_at is not null and v_attendee.invitation_expires_at < now() and v_attendee.ticket_status = 'pending' then
    update public.event_attendees
    set ticket_status = 'expired'
    where id = v_attendee.id
    returning * into v_attendee;

    return query select 'expired'::text, 'Este link no esta disponible o expiro.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, 'expired'::text, v_attendee.ticket_generated_at, v_attendee.first_name, v_attendee.last_name, v_attendee.full_name, v_attendee.email, v_attendee.phone, v_attendee.instagram_handle, v_attendee.guest_type;
    return;
  end if;

  if v_attendee.check_in_status = 'cancelled' or v_attendee.ticket_status = 'cancelled' then
    return query select 'cancelled'::text, 'Este link no esta disponible o expiro.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, 'cancelled'::text, v_attendee.ticket_generated_at, v_attendee.first_name, v_attendee.last_name, v_attendee.full_name, v_attendee.email, v_attendee.phone, v_attendee.instagram_handle, v_attendee.guest_type;
    return;
  end if;

  if v_attendee.check_in_status = 'checked_in' or v_attendee.checked_in_at is not null or v_attendee.ticket_status = 'used' then
    return query select 'used'::text, 'Esta entrada ya fue utilizada.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, 'used'::text, v_attendee.ticket_generated_at, v_attendee.first_name, v_attendee.last_name, v_attendee.full_name, v_attendee.email, v_attendee.phone, v_attendee.instagram_handle, v_attendee.guest_type;
    return;
  end if;

  if not coalesce(p_privacy_accepted, false) or not coalesce(p_terms_accepted, false) then
    return query select 'legal_required'::text, 'Debes aceptar la politica de privacidad y los terminos para continuar.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, coalesce(v_attendee.ticket_status, 'pending'), v_attendee.ticket_generated_at, v_attendee.first_name, v_attendee.last_name, v_attendee.full_name, v_attendee.email, v_attendee.phone, v_attendee.instagram_handle, v_attendee.guest_type;
    return;
  end if;

  if v_first_name is null or v_last_name is null then
    return query select 'missing_data'::text, 'Ingresa nombre y apellido.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, coalesce(v_attendee.ticket_status, 'pending'), v_attendee.ticket_generated_at, v_attendee.first_name, v_attendee.last_name, v_attendee.full_name, v_attendee.email, v_attendee.phone, v_attendee.instagram_handle, v_attendee.guest_type;
    return;
  end if;

  if v_email is null or position('@' in v_email) < 2 then
    return query select 'missing_data'::text, 'Ingresa un correo electronico valido.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, coalesce(v_attendee.ticket_status, 'pending'), v_attendee.ticket_generated_at, v_attendee.first_name, v_attendee.last_name, v_attendee.full_name, v_attendee.email, v_attendee.phone, v_attendee.instagram_handle, v_attendee.guest_type;
    return;
  end if;

  if v_phone is null or v_occupation is null then
    return query select 'missing_data'::text, 'Completa telefono y ocupacion.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, coalesce(v_attendee.ticket_status, 'pending'), v_attendee.ticket_generated_at, v_attendee.first_name, v_attendee.last_name, v_attendee.full_name, v_attendee.email, v_attendee.phone, v_attendee.instagram_handle, v_attendee.guest_type;
    return;
  end if;

  v_qr_token := coalesce(nullif(v_attendee.qr_token, ''), gen_random_uuid()::text);
  v_access_code := coalesce(nullif(v_attendee.access_code, ''), public.generate_attendee_access_code(v_attendee.event_id));
  v_generated_at := coalesce(v_attendee.ticket_generated_at, now());
  v_full_name := trim(v_first_name || ' ' || v_last_name);
  v_community_at := case when coalesce(p_community_consent, false) then coalesce(v_attendee.community_consent_at, now()) else null end;
  v_ip := nullif(split_part(coalesce(public.get_request_header('cf-connecting-ip'), public.get_request_header('x-forwarded-for'), ''), ',', 1), '');
  v_user_agent := left(nullif(trim(coalesce(p_user_agent, public.get_request_header('user-agent'), '')), ''), 1000);
  v_result := case when v_attendee.ticket_status = 'generated' then 'already_generated' else 'generated' end;

  update public.event_attendees
  set
    access_code = v_access_code,
    accepted_privacy = true,
    accepted_terms = true,
    community_consent = coalesce(p_community_consent, false),
    community_consent_at = v_community_at,
    consent_at = now(),
    consent_ip = v_ip,
    consent_source = 'guest_link',
    consent_user_agent = v_user_agent,
    email = v_email,
    first_name = v_first_name,
    full_name = v_full_name,
    guest_type = v_occupation,
    instagram_handle = coalesce(v_instagram_handle, v_attendee.instagram_handle),
    invitation_generated_at = v_generated_at,
    last_name = v_last_name,
    phone = v_phone,
    privacy_accepted_at = coalesce(v_attendee.privacy_accepted_at, now()),
    privacy_version = '1.0',
    qr_token = v_qr_token,
    terms_accepted_at = coalesce(v_attendee.terms_accepted_at, now()),
    terms_version = '1.0',
    ticket_generated_at = v_generated_at,
    ticket_status = 'generated'
  where id = v_attendee.id
  returning * into v_attendee;

  return query select
    v_result,
    case when v_result = 'already_generated' then 'Entrada ya generada.' else 'Entrada generada correctamente.' end,
    v_attendee.id,
    v_attendee.event_id,
    v_attendee.invitation_token,
    v_attendee.qr_token,
    v_attendee.access_code,
    v_attendee.ticket_status,
    v_attendee.ticket_generated_at,
    v_attendee.first_name,
    v_attendee.last_name,
    v_attendee.full_name,
    v_attendee.email,
    v_attendee.phone,
    v_attendee.instagram_handle,
    v_attendee.guest_type;
end;
$$;

create or replace function public.generate_guest_invitation(
  p_invitation_token text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_guest_type text,
  p_accepted_privacy boolean,
  p_accepted_terms boolean,
  p_community_consent boolean,
  p_user_agent text default null
)
returns table (
  result text,
  message text,
  attendee_id uuid,
  event_id uuid,
  invitation_token text,
  qr_token text,
  access_code text,
  ticket_status text,
  ticket_generated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    submitted.result,
    submitted.message,
    submitted.attendee_id,
    submitted.event_id,
    submitted.invitation_token,
    submitted.qr_token,
    submitted.access_code,
    submitted.ticket_status,
    submitted.ticket_generated_at
  from public.submit_guest_invitation(
    p_invitation_token,
    p_first_name,
    p_last_name,
    p_email,
    p_phone,
    null,
    p_guest_type,
    p_accepted_privacy,
    p_accepted_terms,
    p_community_consent,
    p_user_agent
  ) submitted;
end;
$$;

grant execute on function public.get_guest_invitation(text) to anon, authenticated;
grant execute on function public.guest_invitation(text) to anon, authenticated;
grant execute on function public.submit_guest_invitation(text, text, text, text, text, text, text, boolean, boolean, boolean, text) to anon, authenticated;
grant execute on function public.generate_guest_invitation(text, text, text, text, text, text, boolean, boolean, boolean, text) to anon, authenticated;

notify pgrst, 'reload schema';
