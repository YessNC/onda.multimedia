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
      when attendee.check_in_status = 'cancelled' or attendee.ticket_status = 'cancelled' then 'cancelled'
      when attendee.ticket_status = 'used' then
        case
          when coalesce(attendee.accepted_privacy, false) and coalesce(attendee.accepted_terms, false) then 'generated'
          else 'pending'
        end
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
    where qr_token = v_input
    limit 1;
  else
    select *
    into v_attendee
    from public.event_attendees
    where event_id = p_event_id
      and upper(access_code) = v_access_code
    limit 1;

    if not found then
      select *
      into v_attendee
      from public.event_attendees
      where upper(access_code) = v_access_code
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
  v_ticket_status := coalesce(v_attendee.ticket_status, 'pending');

  if v_status = 'cancelled' or v_ticket_status = 'cancelled' then
    insert into public.check_in_logs (attendee_id, event_id, token_scanned, scanned_by, result, message)
    values (v_attendee.id, v_attendee.event_id, v_input, v_scanned_by, 'cancelled', 'Entrada cancelada.');

    return query select 'cancelled'::text, 'Entrada cancelada.'::text, v_attendee.id, v_attendee.event_id, v_attendee_name, v_event_name, v_attendee.checked_in_at;
    return;
  end if;

  if v_status = 'checked_in' or v_attendee.checked_in_at is not null then
    insert into public.check_in_logs (attendee_id, event_id, token_scanned, scanned_by, result, message)
    values (v_attendee.id, v_attendee.event_id, v_input, v_scanned_by, 'already_used', 'Entrada ya utilizada.');

    return query select 'already_checked_in'::text, 'Entrada ya utilizada.'::text, v_attendee.id, v_attendee.event_id, v_attendee_name, v_event_name, v_attendee.checked_in_at;
    return;
  end if;

  if v_ticket_status = 'used' then
    v_ticket_status := case
      when coalesce(v_attendee.accepted_privacy, false) and coalesce(v_attendee.accepted_terms, false) then 'generated'
      else 'pending'
    end;
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
    checked_in_by = v_scanned_by
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
  v_ticket_status := coalesce(v_attendee.ticket_status, 'pending');

  if v_status = 'cancelled' or v_ticket_status = 'cancelled' then
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

  if v_ticket_status = 'used' then
    v_ticket_status := case
      when coalesce(v_attendee.accepted_privacy, false) and coalesce(v_attendee.accepted_terms, false) then 'generated'
      else 'pending'
    end;
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

grant execute on function public.get_guest_invitation(text) to anon, authenticated;
grant execute on function public.guest_invitation(text) to anon, authenticated;
grant execute on function public.validate_attendee_entry_for_event(text, uuid) to authenticated;
grant execute on function public.validate_attendee_qr_for_event(text, uuid) to authenticated;

notify pgrst, 'reload schema';
