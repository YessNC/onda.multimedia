create extension if not exists "pgcrypto";

alter table public.event_attendees
  add column if not exists invitation_token text,
  add column if not exists invitation_expires_at timestamptz,
  add column if not exists ticket_status text not null default 'pending',
  add column if not exists ticket_generated_at timestamptz,
  add column if not exists ticket_downloaded_at timestamptz,
  add column if not exists accepted_privacy boolean not null default false,
  add column if not exists accepted_terms boolean not null default false,
  add column if not exists consent_at timestamptz,
  add column if not exists consent_source text,
  add column if not exists privacy_version text not null default '1.0',
  add column if not exists terms_version text not null default '1.0',
  add column if not exists community_consent boolean not null default false,
  add column if not exists community_consent_at timestamptz,
  add column if not exists consent_ip text,
  add column if not exists consent_user_agent text;

update public.event_attendees
set invitation_token = gen_random_uuid()::text
where invitation_token is null or trim(invitation_token) = '';

update public.event_attendees
set
  ticket_status = case
    when coalesce(check_in_status, '') = 'checked_in' or checked_in_at is not null then 'used'
    when coalesce(check_in_status, '') = 'cancelled' then 'cancelled'
    when ticket_generated_at is not null or invitation_generated_at is not null then 'generated'
    else coalesce(nullif(ticket_status, ''), 'pending')
  end,
  ticket_generated_at = coalesce(ticket_generated_at, invitation_generated_at)
where ticket_status is null
   or ticket_status = 'pending'
   or checked_in_at is not null
   or invitation_generated_at is not null;

create unique index if not exists event_attendees_invitation_token_idx
  on public.event_attendees (invitation_token)
  where invitation_token is not null;

alter table public.event_attendees
  drop constraint if exists event_attendees_ticket_status_check;

alter table public.event_attendees
  add constraint event_attendees_ticket_status_check
  check (ticket_status in ('pending', 'generated', 'used', 'cancelled', 'expired'));

alter table public.check_in_logs
  drop constraint if exists check_in_logs_result_check;

alter table public.check_in_logs
  add constraint check_in_logs_result_check
  check (result in ('checked_in', 'already_used', 'cancelled', 'not_found', 'wrong_event', 'pending', 'error'));

create or replace function public.get_request_header(p_header_name text)
returns text
language plpgsql
stable
as $$
declare
  v_headers jsonb;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception
    when others then
      return null;
  end;

  return nullif(v_headers ->> lower(p_header_name), '');
end;
$$;

create or replace function public.generate_attendee_access_code(p_event_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_code text;
  v_index integer;
  v_attempt integer;
begin
  for v_attempt in 1..50 loop
    v_code := '';

    for v_index in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;

    if not exists (
      select 1
      from public.event_attendees
      where event_id = p_event_id
        and access_code = v_code
    ) then
      return v_code;
    end if;
  end loop;

  raise exception 'No pudimos generar un codigo unico para este evento.';
end;
$$;

create or replace function public.get_guest_invitation(p_invitation_token text)
returns table (
  attendee_id uuid,
  event_id uuid,
  invitation_token text,
  first_name text,
  last_name text,
  full_name text,
  email text,
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
  limit 1;
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
declare
  v_access_code text;
  v_attendee public.event_attendees%rowtype;
  v_community_at timestamptz;
  v_email text := lower(nullif(trim(coalesce(p_email, '')), ''));
  v_first_name text := nullif(trim(coalesce(p_first_name, '')), '');
  v_full_name text;
  v_generated_at timestamptz;
  v_ip text;
  v_last_name text := nullif(trim(coalesce(p_last_name, '')), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_guest_type text := nullif(trim(coalesce(p_guest_type, '')), '');
  v_qr_token text;
  v_result text;
  v_user_agent text;
begin
  select *
  into v_attendee
  from public.event_attendees attendee
  where attendee.invitation_token = trim(coalesce(p_invitation_token, ''))
  limit 1
  for update;

  if not found then
    return query select 'invalid'::text, 'Link de invitacion no encontrado.'::text, null::uuid, null::uuid, null::text, null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  if v_attendee.invitation_expires_at is not null and v_attendee.invitation_expires_at < now() and v_attendee.ticket_status = 'pending' then
    update public.event_attendees
    set ticket_status = 'expired'
    where id = v_attendee.id;

    return query select 'expired'::text, 'Esta invitacion esta vencida.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, 'expired'::text, v_attendee.ticket_generated_at;
    return;
  end if;

  if v_attendee.check_in_status = 'cancelled' or v_attendee.ticket_status = 'cancelled' then
    return query select 'cancelled'::text, 'Esta invitacion fue cancelada.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, 'cancelled'::text, v_attendee.ticket_generated_at;
    return;
  end if;

  if v_attendee.check_in_status = 'checked_in' or v_attendee.checked_in_at is not null or v_attendee.ticket_status = 'used' then
    return query select 'used'::text, 'Esta entrada ya fue utilizada.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, 'used'::text, v_attendee.ticket_generated_at;
    return;
  end if;

  if not coalesce(p_accepted_privacy, false) or not coalesce(p_accepted_terms, false) then
    return query select 'legal_required'::text, 'Debes aceptar la Politica de Privacidad y los Terminos y Condiciones.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, coalesce(v_attendee.ticket_status, 'pending'), v_attendee.ticket_generated_at;
    return;
  end if;

  if v_first_name is null or v_last_name is null then
    return query select 'missing_data'::text, 'Ingresa nombre y apellido.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, coalesce(v_attendee.ticket_status, 'pending'), v_attendee.ticket_generated_at;
    return;
  end if;

  if v_email is null or position('@' in v_email) < 2 then
    return query select 'missing_data'::text, 'Ingresa un correo electronico valido.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, coalesce(v_attendee.ticket_status, 'pending'), v_attendee.ticket_generated_at;
    return;
  end if;

  if v_phone is null or v_guest_type is null then
    return query select 'missing_data'::text, 'Completa telefono y ocupacion.'::text, v_attendee.id, v_attendee.event_id, v_attendee.invitation_token, v_attendee.qr_token, v_attendee.access_code, coalesce(v_attendee.ticket_status, 'pending'), v_attendee.ticket_generated_at;
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
    guest_type = v_guest_type,
    invitation_generated_at = v_generated_at,
    last_name = v_last_name,
    phone = v_phone,
    privacy_version = '1.0',
    qr_token = v_qr_token,
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
    v_attendee.ticket_generated_at;
end;
$$;

create or replace function public.record_guest_generated_invitation(
  p_invitation_token text,
  p_path text,
  p_file_name text,
  p_qr_payload text,
  p_qr_x integer,
  p_qr_y integer,
  p_qr_width integer,
  p_qr_height integer,
  p_size_bytes bigint default 0,
  p_template_bucket text default null,
  p_template_path text default null
)
returns table (
  invitation_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attendee public.event_attendees%rowtype;
  v_bucket text := 'generated-invitations';
  v_id uuid;
begin
  select *
  into v_attendee
  from public.event_attendees
  where invitation_token = trim(coalesce(p_invitation_token, ''))
  limit 1;

  if not found then
    raise exception 'Link de invitacion no encontrado.';
  end if;

  if not (v_attendee.accepted_privacy and v_attendee.accepted_terms and v_attendee.ticket_status = 'generated') then
    raise exception 'La entrada todavia no esta generada o no tiene consentimiento legal.';
  end if;

  if p_path is null or p_path !~ ('^guest-links/' || v_attendee.invitation_token || '/[^/]+\\.png$') then
    raise exception 'Ruta de invitacion no permitida.';
  end if;

  insert into public.generated_invitations (
    access_code,
    attendee_id,
    bucket,
    delivery_channel,
    event_id,
    file_name,
    generated_at,
    mime_type,
    path,
    qr_height,
    qr_payload,
    qr_token,
    qr_width,
    qr_x,
    qr_y,
    size_bytes,
    template_bucket,
    template_path
  )
  values (
    v_attendee.access_code,
    v_attendee.id,
    v_bucket,
    'guest_link',
    v_attendee.event_id,
    coalesce(nullif(trim(p_file_name), ''), 'entrada-onda.png'),
    coalesce(v_attendee.ticket_generated_at, now()),
    'image/png',
    p_path,
    coalesce(p_qr_height, 320),
    coalesce(nullif(trim(p_qr_payload), ''), ''),
    v_attendee.qr_token,
    coalesce(p_qr_width, 320),
    coalesce(p_qr_x, 80),
    coalesce(p_qr_y, 80),
    coalesce(p_size_bytes, 0),
    coalesce(nullif(trim(p_template_bucket), ''), 'invitation-templates'),
    coalesce(nullif(trim(p_template_path), ''), 'guest-fallback')
  )
  on conflict (bucket, path) do update
  set
    access_code = excluded.access_code,
    file_name = excluded.file_name,
    generated_at = excluded.generated_at,
    qr_height = excluded.qr_height,
    qr_payload = excluded.qr_payload,
    qr_token = excluded.qr_token,
    qr_width = excluded.qr_width,
    qr_x = excluded.qr_x,
    qr_y = excluded.qr_y,
    size_bytes = excluded.size_bytes,
    template_bucket = excluded.template_bucket,
    template_path = excluded.template_path
  returning id into v_id;

  return query select v_id;
end;
$$;

create or replace function public.mark_guest_invitation_downloaded(
  p_invitation_token text,
  p_path text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attendee public.event_attendees%rowtype;
  v_downloaded_at timestamptz := now();
begin
  select *
  into v_attendee
  from public.event_attendees
  where invitation_token = trim(coalesce(p_invitation_token, ''))
  limit 1;

  if not found then
    return false;
  end if;

  update public.generated_invitations
  set
    download_count = coalesce(download_count, 0) + 1,
    downloaded_at = v_downloaded_at
  where attendee_id = v_attendee.id
    and path = p_path;

  update public.event_attendees
  set ticket_downloaded_at = v_downloaded_at
  where id = v_attendee.id;

  return true;
end;
$$;

create or replace function public.is_guest_invitation_object_allowed(p_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text := split_part(coalesce(p_name, ''), '/', 2);
begin
  if split_part(coalesce(p_name, ''), '/', 1) <> 'guest-links' then
    return false;
  end if;

  if v_token = '' or coalesce(p_name, '') !~ '^guest-links/[^/]+/[^/]+\.png$' then
    return false;
  end if;

  return exists (
    select 1
    from public.event_attendees attendee
    where attendee.invitation_token = v_token
      and attendee.accepted_privacy = true
      and attendee.accepted_terms = true
      and attendee.ticket_status in ('generated', 'used')
  );
end;
$$;

grant execute on function public.get_guest_invitation(text) to anon, authenticated;
grant execute on function public.generate_guest_invitation(text, text, text, text, text, text, boolean, boolean, boolean, text) to anon, authenticated;
grant execute on function public.record_guest_generated_invitation(text, text, text, text, integer, integer, integer, integer, bigint, text, text) to anon, authenticated;
grant execute on function public.mark_guest_invitation_downloaded(text, text) to anon, authenticated;
grant execute on function public.is_guest_invitation_object_allowed(text) to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'invitation templates select public'
  ) then
    create policy "invitation templates select public"
      on storage.objects
      for select
      to public
      using (bucket_id = 'invitation-templates');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'guest generated invitations select by token'
  ) then
    create policy "guest generated invitations select by token"
      on storage.objects
      for select
      to public
      using (bucket_id = 'generated-invitations' and public.is_guest_invitation_object_allowed(name));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'guest generated invitations insert by token'
  ) then
    create policy "guest generated invitations insert by token"
      on storage.objects
      for insert
      to public
      with check (bucket_id = 'generated-invitations' and public.is_guest_invitation_object_allowed(name));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'guest generated invitations update by token'
  ) then
    create policy "guest generated invitations update by token"
      on storage.objects
      for update
      to public
      using (bucket_id = 'generated-invitations' and public.is_guest_invitation_object_allowed(name))
      with check (bucket_id = 'generated-invitations' and public.is_guest_invitation_object_allowed(name));
  end if;
end $$;

create or replace function public.validate_attendee_entry_for_event(
  p_input text,
  p_event_id uuid
)
returns table (
  result text,
  message text,
  attendee_id uuid,
  event_id uuid,
  attendee_name text,
  event_name text,
  checked_in_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_input text := trim(coalesce(p_input, ''));
  v_access_code text := upper(regexp_replace(trim(coalesce(p_input, '')), '[^A-Za-z0-9]', '', 'g'));
  v_is_uuid boolean := trim(coalesce(p_input, '')) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  v_attendee public.event_attendees%rowtype;
  v_event public.events%rowtype;
  v_scanned_by uuid := auth.uid();
  v_status text;
  v_ticket_status text;
  v_attendee_name text;
  v_event_name text;
  v_checked_in_at timestamptz;
begin
  if v_input = '' or p_event_id is null then
    insert into public.check_in_logs (event_id, token_scanned, scanned_by, result, message)
    values (p_event_id, coalesce(v_input, ''), v_scanned_by, 'not_found', 'Entrada no encontrada.');

    return query select 'not_found'::text, 'Entrada no encontrada.'::text, null::uuid, p_event_id, null::text, null::text, null::timestamptz;
    return;
  end if;

  if v_is_uuid then
    select *
    into v_attendee
    from public.event_attendees
    where public.event_attendees.qr_token = v_input
    limit 1;
  else
    select *
    into v_attendee
    from public.event_attendees
    where public.event_attendees.event_id = p_event_id
      and upper(public.event_attendees.access_code) = v_access_code
    limit 1;

    if not found then
      select *
      into v_attendee
      from public.event_attendees
      where upper(public.event_attendees.access_code) = v_access_code
      limit 1;
    end if;
  end if;

  if not found then
    insert into public.check_in_logs (event_id, token_scanned, scanned_by, result, message)
    values (p_event_id, v_input, v_scanned_by, 'not_found', 'Entrada no encontrada.');

    return query select 'not_found'::text, 'Entrada no encontrada.'::text, null::uuid, p_event_id, null::text, null::text, null::timestamptz;
    return;
  end if;

  v_attendee_name := coalesce(
    nullif(v_attendee.full_name, ''),
    nullif(trim(coalesce(v_attendee.first_name, '') || ' ' || coalesce(v_attendee.last_name, '')), ''),
    'Asistente'
  );

  select *
  into v_event
  from public.events
  where id = v_attendee.event_id
  limit 1;

  if found then
    v_event_name := coalesce(
      nullif(to_jsonb(v_event)->>'title', ''),
      nullif(to_jsonb(v_event)->>'name', ''),
      'Evento'
    );
  else
    v_event_name := null;
  end if;

  if v_attendee.event_id is distinct from p_event_id then
    insert into public.check_in_logs (attendee_id, event_id, token_scanned, scanned_by, result, message)
    values (v_attendee.id, p_event_id, v_input, v_scanned_by, 'wrong_event', 'Esta entrada pertenece a otro evento.');

    return query select
      'wrong_event'::text,
      'Esta entrada pertenece a otro evento.'::text,
      v_attendee.id,
      v_attendee.event_id,
      v_attendee_name,
      v_event_name,
      v_attendee.checked_in_at;
    return;
  end if;

  v_status := coalesce(v_attendee.check_in_status, 'pending');
  v_ticket_status := case
    when v_status = 'checked_in' or v_attendee.checked_in_at is not null then 'used'
    when v_status = 'cancelled' then 'cancelled'
    else coalesce(v_attendee.ticket_status, 'pending')
  end;

  if v_ticket_status = 'cancelled' then
    insert into public.check_in_logs (attendee_id, event_id, token_scanned, scanned_by, result, message)
    values (v_attendee.id, v_attendee.event_id, v_input, v_scanned_by, 'cancelled', 'Entrada cancelada.');

    return query select 'cancelled'::text, 'Entrada cancelada.'::text, v_attendee.id, v_attendee.event_id, v_attendee_name, v_event_name, v_attendee.checked_in_at;
    return;
  end if;

  if v_ticket_status = 'used' then
    insert into public.check_in_logs (attendee_id, event_id, token_scanned, scanned_by, result, message)
    values (v_attendee.id, v_attendee.event_id, v_input, v_scanned_by, 'already_used', 'Entrada ya utilizada.');

    return query select 'already_checked_in'::text, 'Entrada ya utilizada.'::text, v_attendee.id, v_attendee.event_id, v_attendee_name, v_event_name, v_attendee.checked_in_at;
    return;
  end if;

  if v_ticket_status <> 'generated' or not coalesce(v_attendee.accepted_privacy, false) or not coalesce(v_attendee.accepted_terms, false) then
    insert into public.check_in_logs (attendee_id, event_id, token_scanned, scanned_by, result, message)
    values (v_attendee.id, v_attendee.event_id, v_input, v_scanned_by, 'pending', 'Entrada pendiente de generacion o consentimiento legal.');

    return query select 'pending'::text, 'Entrada pendiente de generacion o consentimiento legal.'::text, v_attendee.id, v_attendee.event_id, v_attendee_name, v_event_name, v_attendee.checked_in_at;
    return;
  end if;

  update public.event_attendees
  set
    check_in_status = 'checked_in',
    checked_in_at = now(),
    checked_in_by = v_scanned_by,
    ticket_status = 'used'
  where id = v_attendee.id
  returning event_attendees.checked_in_at into v_checked_in_at;

  insert into public.check_in_logs (attendee_id, event_id, token_scanned, scanned_by, result, message)
  values (v_attendee.id, v_attendee.event_id, v_input, v_scanned_by, 'checked_in', 'Entrada validada correctamente.');

  return query select
    'valid'::text,
    'Entrada validada correctamente.'::text,
    v_attendee.id,
    v_attendee.event_id,
    v_attendee_name,
    v_event_name,
    v_checked_in_at;
end;
$$;

grant execute on function public.validate_attendee_entry_for_event(text, uuid) to authenticated;

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
  v_ticket_status text;
begin
  select *
  into v_attendee
  from public.event_attendees
  where public.event_attendees.qr_token = p_qr_token
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
  v_ticket_status := case
    when v_status = 'checked_in' or v_attendee.checked_in_at is not null then 'used'
    when v_status = 'cancelled' then 'cancelled'
    else coalesce(v_attendee.ticket_status, 'pending')
  end;

  if v_ticket_status = 'cancelled' then
    insert into public.check_in_logs (attendee_id, event_id, token_scanned, scanned_by, result, message)
    values (v_attendee.id, v_attendee.event_id, p_qr_token, v_scanned_by, 'cancelled', 'Entrada cancelada.');

    return query select 'cancelled'::text, 'Entrada cancelada.'::text, v_attendee.id, v_attendee.event_id;
    return;
  end if;

  if v_ticket_status = 'used' then
    insert into public.check_in_logs (attendee_id, event_id, token_scanned, scanned_by, result, message)
    values (v_attendee.id, v_attendee.event_id, p_qr_token, v_scanned_by, 'already_used', 'Entrada ya utilizada.');

    return query select 'already_used'::text, 'Entrada ya utilizada.'::text, v_attendee.id, v_attendee.event_id;
    return;
  end if;

  if v_ticket_status <> 'generated' or not coalesce(v_attendee.accepted_privacy, false) or not coalesce(v_attendee.accepted_terms, false) then
    insert into public.check_in_logs (attendee_id, event_id, token_scanned, scanned_by, result, message)
    values (v_attendee.id, v_attendee.event_id, p_qr_token, v_scanned_by, 'pending', 'Entrada pendiente de generacion o consentimiento legal.');

    return query select 'pending'::text, 'Entrada pendiente de generacion o consentimiento legal.'::text, v_attendee.id, v_attendee.event_id;
    return;
  end if;

  update public.event_attendees
  set
    check_in_status = 'checked_in',
    checked_in_at = now(),
    checked_in_by = v_scanned_by,
    ticket_status = 'used'
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
