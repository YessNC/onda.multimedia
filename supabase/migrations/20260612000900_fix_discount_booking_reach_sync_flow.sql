-- Fix discount-backed booking creation and Reach recipient queue metadata.
-- Re-applies the RPC and queue functions idempotently so Supabase/PostgREST picks up
-- p_discount_code and so fully waived bookings enqueue booking_confirmed recipients.

create or replace function public.queue_booking_reach_recipients(
  p_booking_id uuid,
  p_event_type text default 'booking_confirmed'
)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_booking record;
  v_client_email text;
  v_client_name text;
  v_template_key text;
  v_template_variables jsonb;
  v_inserted integer := 0;
  v_row_count integer := 0;
  v_producer_email text;
begin
  if p_event_type not in ('booking_confirmed', 'booking_cancelled') then
    raise exception 'Unsupported email event type.' using errcode = '22023';
  end if;

  select
    booking.id,
    booking.client_id,
    booking.service_id,
    booking.studio_id,
    booking.producer_id,
    booking.booking_date,
    booking.start_time,
    booking.end_time,
    booking.total_hours,
    booking.total_amount,
    booking.deposit_amount,
    coalesce(booking.deposit_amount_due, booking.deposit_amount) as deposit_amount_due,
    booking.discount_code,
    booking.discount_amount,
    booking.currency,
    booking.payment_status,
    booking.status,
    booking.payment_validation_code,
    booking.payment_reference,
    booking.payment_transaction_id,
    service.name as service_name,
    studio.name as studio_name,
    producer.name as producer_name,
    producer.user_id as producer_user_id,
    profile.full_name as profile_name,
    coalesce(profile.community_consent, false) as community_consent,
    auth_user.email as auth_email
  into v_booking
  from public.bookings booking
  left join public.booking_services service
    on service.id = booking.service_id
  left join public.studios studio
    on studio.id = booking.studio_id
  left join public.producers producer
    on producer.id = booking.producer_id
  left join public.profiles profile
    on profile.id = booking.client_id
  left join auth.users auth_user
    on auth_user.id = booking.client_id
  where booking.id = p_booking_id;

  if not found or v_booking.client_id is null then
    return 0;
  end if;

  v_client_email := lower(nullif(v_booking.auth_email, ''));
  v_client_name := nullif(v_booking.profile_name, '');

  if v_client_email is null then
    return 0;
  end if;

  if p_event_type = 'booking_confirmed'
    and not (
      v_booking.status in ('pending', 'confirmed')
      and v_booking.payment_status in ('paid', 'waived')
    )
  then
    return 0;
  end if;

  if p_event_type = 'booking_cancelled'
    and v_booking.status <> 'cancelled'
  then
    return 0;
  end if;

  v_template_key := case
    when p_event_type = 'booking_cancelled' then 'booking_cancelled'
    else 'booking_confirmed'
  end;

  v_template_variables := jsonb_build_object(
    'booking_id', v_booking.id,
    'client_name', coalesce(v_client_name, v_client_email),
    'client_email', v_client_email,
    'service_name', v_booking.service_name,
    'studio_name', v_booking.studio_name,
    'producer_name', v_booking.producer_name,
    'booking_date', v_booking.booking_date,
    'start_time', v_booking.start_time,
    'end_time', v_booking.end_time,
    'total_hours', v_booking.total_hours,
    'total_amount', v_booking.total_amount,
    'deposit_amount', v_booking.deposit_amount_due,
    'balance_due', greatest(coalesce(v_booking.total_amount, 0) - coalesce(v_booking.deposit_amount_due, 0), 0),
    'discount_code', v_booking.discount_code,
    'discount_amount', v_booking.discount_amount,
    'currency', coalesce(v_booking.currency, 'CLP'),
    'payment_status', v_booking.payment_status,
    'booking_status', v_booking.status,
    'payment_validation_code', v_booking.payment_validation_code,
    'payment_reference', v_booking.payment_reference,
    'payment_transaction_id', v_booking.payment_transaction_id,
    'onda_contact_email', 'contacto@ondamultimedia.com',
    'community_consent', coalesce(v_booking.community_consent, false)
  );

  insert into public.booking_email_recipients (
    booking_id,
    client_id,
    recipient_email,
    recipient_name,
    template_key,
    event_type,
    payment_status,
    booking_status,
    total_amount,
    deposit_amount,
    discount_code,
    discount_amount,
    currency,
    payment_validation_code,
    payment_reference,
    payment_transaction_id,
    template_variables,
    reach_sync_status
  )
  values (
    v_booking.id,
    v_booking.client_id,
    v_client_email,
    coalesce(v_client_name, v_client_email),
    v_template_key,
    p_event_type,
    v_booking.payment_status,
    v_booking.status,
    v_booking.total_amount,
    v_booking.deposit_amount_due,
    v_booking.discount_code,
    v_booking.discount_amount,
    coalesce(v_booking.currency, 'CLP'),
    v_booking.payment_validation_code,
    v_booking.payment_reference,
    v_booking.payment_transaction_id,
    v_template_variables,
    'pending'
  )
  on conflict (booking_id, recipient_email, event_type, template_key) do update
  set payment_status = excluded.payment_status,
      booking_status = excluded.booking_status,
      total_amount = excluded.total_amount,
      deposit_amount = excluded.deposit_amount,
      discount_code = excluded.discount_code,
      discount_amount = excluded.discount_amount,
      currency = excluded.currency,
      payment_validation_code = excluded.payment_validation_code,
      payment_reference = excluded.payment_reference,
      payment_transaction_id = excluded.payment_transaction_id,
      template_variables = excluded.template_variables,
      reach_sync_status = case
        when public.booking_email_recipients.reach_sync_status in ('sent', 'synced') then public.booking_email_recipients.reach_sync_status
        else 'pending'
      end,
      updated_at = now();

  get diagnostics v_row_count = row_count;
  v_inserted := v_inserted + v_row_count;

  insert into public.booking_email_recipients (
    booking_id,
    client_id,
    recipient_email,
    recipient_name,
    template_key,
    event_type,
    payment_status,
    booking_status,
    total_amount,
    deposit_amount,
    discount_code,
    discount_amount,
    currency,
    payment_validation_code,
    payment_reference,
    payment_transaction_id,
    template_variables,
    reach_sync_status
  )
  values (
    v_booking.id,
    v_booking.client_id,
    'contacto@ondamultimedia.com',
    'Onda Multimedia',
    v_template_key,
    p_event_type,
    v_booking.payment_status,
    v_booking.status,
    v_booking.total_amount,
    v_booking.deposit_amount_due,
    v_booking.discount_code,
    v_booking.discount_amount,
    coalesce(v_booking.currency, 'CLP'),
    v_booking.payment_validation_code,
    v_booking.payment_reference,
    v_booking.payment_transaction_id,
    v_template_variables,
    'pending'
  )
  on conflict (booking_id, recipient_email, event_type, template_key) do update
  set payment_status = excluded.payment_status,
      booking_status = excluded.booking_status,
      template_variables = excluded.template_variables,
      reach_sync_status = case
        when public.booking_email_recipients.reach_sync_status in ('sent', 'synced') then public.booking_email_recipients.reach_sync_status
        else 'pending'
      end,
      updated_at = now();

  get diagnostics v_row_count = row_count;
  v_inserted := v_inserted + v_row_count;

  if v_booking.producer_user_id is not null then
    select lower(nullif(email, ''))
    into v_producer_email
    from auth.users
    where id = v_booking.producer_user_id;

    if v_producer_email is not null
      and v_producer_email not in (v_client_email, 'contacto@ondamultimedia.com')
    then
      insert into public.booking_email_recipients (
        booking_id,
        client_id,
        recipient_email,
        recipient_name,
        template_key,
        event_type,
        payment_status,
        booking_status,
        total_amount,
        deposit_amount,
        discount_code,
        discount_amount,
        currency,
        payment_validation_code,
        payment_reference,
        payment_transaction_id,
        template_variables,
        reach_sync_status
      )
      values (
        v_booking.id,
        v_booking.client_id,
        v_producer_email,
        coalesce(v_booking.producer_name, v_producer_email),
        v_template_key,
        p_event_type,
        v_booking.payment_status,
        v_booking.status,
        v_booking.total_amount,
        v_booking.deposit_amount_due,
        v_booking.discount_code,
        v_booking.discount_amount,
        coalesce(v_booking.currency, 'CLP'),
        v_booking.payment_validation_code,
        v_booking.payment_reference,
        v_booking.payment_transaction_id,
        v_template_variables,
        'pending'
      )
      on conflict (booking_id, recipient_email, event_type, template_key) do update
      set payment_status = excluded.payment_status,
          booking_status = excluded.booking_status,
          template_variables = excluded.template_variables,
          reach_sync_status = case
            when public.booking_email_recipients.reach_sync_status in ('sent', 'synced') then public.booking_email_recipients.reach_sync_status
            else 'pending'
          end,
          updated_at = now();

      get diagnostics v_row_count = row_count;
      v_inserted := v_inserted + v_row_count;
    end if;
  end if;

  return v_inserted;
end;
$$;

revoke all on function public.queue_booking_reach_recipients(uuid, text) from public;
grant execute on function public.queue_booking_reach_recipients(uuid, text) to authenticated;

create or replace function public.queue_booking_email_events_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'cancelled' then
      perform public.queue_booking_reach_recipients(new.id, 'booking_cancelled');
    elsif new.status in ('pending', 'confirmed')
      and new.payment_status in ('paid', 'waived')
    then
      perform public.queue_booking_reach_recipients(new.id, 'booking_confirmed');
    end if;
  elsif tg_op = 'UPDATE' then
    if new.status = 'cancelled'
      and old.status is distinct from new.status
    then
      perform public.queue_booking_reach_recipients(new.id, 'booking_cancelled');
    elsif new.status in ('pending', 'confirmed')
      and new.payment_status in ('paid', 'waived')
      and (
        old.payment_status is distinct from new.payment_status
        or old.status is distinct from new.status
      )
    then
      perform public.queue_booking_reach_recipients(new.id, 'booking_confirmed');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists queue_booking_email_events_after_change on public.bookings;

create trigger queue_booking_email_events_after_change
  after insert or update of status, payment_status, payment_reference, payment_validation_code, payment_transaction_id
  on public.bookings
  for each row execute function public.queue_booking_email_events_trigger();


drop function if exists public.create_booking_with_slots(uuid, uuid, uuid, uuid, date, time, time, jsonb, text);
drop function if exists public.create_booking_with_slots(uuid, uuid, uuid, uuid, date, time, time, jsonb, text, text);

create or replace function public.create_booking_with_slots(
  p_client_id uuid,
  p_service_id uuid,
  p_studio_id uuid default null,
  p_producer_id uuid default null,
  p_booking_date date default current_date,
  p_start_time time default null,
  p_end_time time default null,
  p_selected_slots jsonb default '[]'::jsonb,
  p_notes text default null,
  p_discount_code text default null
)
returns table (
  id uuid,
  total_amount numeric,
  deposit_amount numeric,
  deposit_amount_due numeric,
  discount_amount numeric,
  currency text,
  status text,
  payment_status text,
  payment_provider text,
  payment_reference text,
  payment_validation_code text,
  payment_checkout_url text,
  payment_hold_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.booking_services%rowtype;
  v_discount public.discount_codes%rowtype;
  v_discount_code text := upper(nullif(btrim(coalesce(p_discount_code, '')), ''));
  v_slot_count integer := 1;
  v_total_amount numeric := 0;
  v_deposit_percent numeric := 50;
  v_deposit_amount numeric := 0;
  v_deposit_due numeric := 0;
  v_discount_amount numeric := 0;
  v_discount_percent numeric := null;
  v_total_hours numeric := 0;
  v_booking_id uuid := gen_random_uuid();
  v_status text := 'pending';
  v_payment_status text := 'unpaid';
  v_payment_provider text := null;
  v_payment_reference text := null;
  v_payment_validation_code text := null;
  v_payment_hold_expires_at timestamptz := null;
begin
  if auth.uid() is null or auth.uid() <> p_client_id then
    raise exception 'Invalid client session.' using errcode = '42501';
  end if;

  if p_booking_date is null or p_start_time is null or p_end_time is null or p_start_time >= p_end_time then
    raise exception 'Invalid booking range.' using errcode = '22023';
  end if;

  p_selected_slots := coalesce(p_selected_slots, '[]'::jsonb);

  if jsonb_typeof(p_selected_slots) <> 'array' then
    raise exception 'Invalid selected slots.' using errcode = '22023';
  end if;

  v_slot_count := greatest(jsonb_array_length(p_selected_slots), 1);

  select service.*
  into v_service
  from public.booking_services service
  where service.id = p_service_id
    and service.is_active is true;

  if not found then
    raise exception 'Booking service is not available.' using errcode = '22023';
  end if;

  if v_service.requires_studio is true and p_studio_id is null then
    raise exception 'Studio is required for this service.' using errcode = '22023';
  end if;

  if v_service.requires_producer is true and p_producer_id is null then
    raise exception 'Responsible is required for this service.' using errcode = '22023';
  end if;

  if public.booking_combination_is_allowed(p_service_id, p_studio_id, p_producer_id) is not true then
    raise exception 'This service, studio and responsible combination is not available.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.bookings booking
    where booking.booking_date = p_booking_date
      and booking.start_time is not null
      and booking.end_time is not null
      and public.booking_blocks_availability(booking.status, booking.payment_hold_expires_at)
      and booking.start_time < p_end_time
      and p_start_time < booking.end_time
      and (
        (
          p_producer_id is not null
          and booking.producer_id = p_producer_id
        )
        or (
          p_producer_id is not null
          and p_studio_id is not null
          and booking.producer_id is null
          and booking.studio_id = p_studio_id
        )
        or (
          p_producer_id is null
          and p_studio_id is not null
          and booking.studio_id = p_studio_id
        )
        or (
          p_studio_id is null
          and p_producer_id is null
          and booking.service_id = p_service_id
          and booking.studio_id is null
          and booking.producer_id is null
        )
      )
  ) then
    raise exception 'One of the selected time slots was just booked. Please choose another range.' using errcode = '23505';
  end if;

  if exists (
    with requested_slots as (
      select
        (slot ->> 'startTime')::time as slot_start,
        (slot ->> 'endTime')::time as slot_end
      from jsonb_array_elements(p_selected_slots) slot
      union all
      select p_start_time, p_end_time
      where jsonb_array_length(p_selected_slots) = 0
    )
    select 1
    from requested_slots requested
    where requested.slot_start is null
      or requested.slot_end is null
      or requested.slot_start >= requested.slot_end
      or exists (
        select 1
        from public.availability_exceptions blocked
        where blocked.type = 'blocked'
          and p_booking_date >= coalesce(blocked.date_from, blocked.exception_date)
          and (blocked.date_to is null or p_booking_date <= blocked.date_to)
          and extract(dow from p_booking_date)::integer = any(coalesce(blocked.weekdays, array[extract(dow from blocked.exception_date)::integer]))
          and (blocked.service_id is null or blocked.service_id = p_service_id)
          and (blocked.studio_id is null or blocked.studio_id = p_studio_id)
          and (blocked.producer_id is null or blocked.producer_id = p_producer_id)
          and (
            blocked.start_time is null
            or blocked.end_time is null
            or (
              requested.slot_start < blocked.end_time
              and blocked.start_time < requested.slot_end
            )
          )
      )
      or not (
        exists (
          select 1
          from public.availability_rules rule
          where rule.is_active is true
            and extract(dow from p_booking_date)::integer = any(coalesce(rule.weekdays, array[rule.weekday]))
            and (rule.service_id is null or rule.service_id = p_service_id)
            and (rule.studio_id is null or rule.studio_id = p_studio_id)
            and (rule.producer_id is null or rule.producer_id = p_producer_id)
            and requested.slot_start >= rule.start_time
            and requested.slot_end <= rule.end_time
        )
        or exists (
          select 1
          from public.availability_exceptions opening
          where opening.type = 'available'
            and p_booking_date >= coalesce(opening.date_from, opening.exception_date)
            and (opening.date_to is null or p_booking_date <= opening.date_to)
            and extract(dow from p_booking_date)::integer = any(coalesce(opening.weekdays, array[extract(dow from opening.exception_date)::integer]))
            and (opening.service_id is null or opening.service_id = p_service_id)
            and (opening.studio_id is null or opening.studio_id = p_studio_id)
            and (opening.producer_id is null or opening.producer_id = p_producer_id)
            and opening.start_time is not null
            and opening.end_time is not null
            and requested.slot_start >= opening.start_time
            and requested.slot_end <= opening.end_time
        )
      )
  ) then
    raise exception 'One of the selected time slots was just booked. Please choose another range.' using errcode = '23505';
  end if;

  v_deposit_percent := coalesce(v_service.deposit_percent, 50);
  v_total_amount := coalesce(v_service.price_per_slot, 0) * v_slot_count;
  v_deposit_amount := round(v_total_amount * v_deposit_percent / 100, 0);
  v_total_hours := round(extract(epoch from (p_end_time - p_start_time)) / 3600, 2);

  if v_discount_code is not null then
    select *
    into v_discount
    from public.discount_codes discount_code
    where lower(discount_code.code) = lower(v_discount_code)
    for update;

    if not found
      or v_discount.is_active is not true
      or v_discount.applies_to <> 'deposit'
      or (v_discount.valid_from is not null and v_discount.valid_from > now())
      or (v_discount.valid_until is not null and v_discount.valid_until < now())
      or (v_discount.max_uses is not null and v_discount.used_count >= v_discount.max_uses)
    then
      raise exception 'Invalid, expired or exhausted discount code.' using errcode = '22023';
    end if;

    if v_discount.discount_type = 'percent' then
      v_discount_percent := least(greatest(coalesce(v_discount.discount_value, 0), 0), 100);
      v_discount_amount := round(v_deposit_amount * v_discount_percent / 100, 0);
    else
      v_discount_amount := least(coalesce(v_discount.discount_value, 0), v_deposit_amount);
    end if;
  end if;

  v_discount_amount := least(greatest(coalesce(v_discount_amount, 0), 0), v_deposit_amount);
  v_deposit_due := greatest(v_deposit_amount - v_discount_amount, 0);

  if v_deposit_due <= 0 then
    v_status := 'pending';
    v_payment_status := 'waived';
    v_payment_provider := case when v_discount_code is not null then 'discount_code' else null end;
    v_payment_hold_expires_at := null;
  end if;

  insert into public.bookings (
    id,
    client_id,
    service_id,
    studio_id,
    producer_id,
    booking_date,
    start_time,
    end_time,
    notes,
    status,
    selected_slots,
    total_hours,
    total_amount,
    deposit_amount,
    deposit_percent,
    currency,
    payment_status,
    payment_provider,
    payment_reference,
    payment_validation_code,
    payment_hold_expires_at,
    discount_code_id,
    discount_code,
    discount_amount,
    discount_percent,
    deposit_amount_before_discount,
    deposit_amount_due
  )
  values (
    v_booking_id,
    p_client_id,
    p_service_id,
    p_studio_id,
    p_producer_id,
    p_booking_date,
    p_start_time,
    p_end_time,
    p_notes,
    v_status,
    p_selected_slots,
    v_total_hours,
    v_total_amount,
    v_deposit_amount,
    v_deposit_percent,
    coalesce(nullif(v_service.currency, ''), 'CLP'),
    v_payment_status,
    v_payment_provider,
    v_payment_reference,
    v_payment_validation_code,
    v_payment_hold_expires_at,
    case when v_discount_code is not null then v_discount.id else null end,
    v_discount_code,
    v_discount_amount,
    v_discount_percent,
    v_deposit_amount,
    v_deposit_due
  );

  if v_discount_code is not null then
    update public.discount_codes discount_code
    set used_count = discount_code.used_count + 1
    where discount_code.id = v_discount.id;
  end if;

  insert into public.booking_payments (
    booking_id,
    client_id,
    provider,
    amount,
    currency,
    status,
    validation_code,
    transaction_id,
    paid_at
  )
  values (
    v_booking_id,
    p_client_id,
    case
      when v_payment_provider is not null then v_payment_provider
      when v_payment_status = 'waived' then 'discount_code'
      else 'manual_pending'
    end,
    v_deposit_due,
    coalesce(nullif(v_service.currency, ''), 'CLP'),
    v_payment_status,
    v_payment_validation_code,
    null,
    null
  );

  if v_payment_status = 'waived' then
    perform public.queue_booking_reach_recipients(v_booking_id, 'booking_confirmed');
  end if;

  return query
  select
    v_booking_id,
    v_total_amount,
    v_deposit_amount,
    v_deposit_due,
    v_discount_amount,
    coalesce(nullif(v_service.currency, ''), 'CLP'),
    v_status,
    v_payment_status,
    v_payment_provider,
    v_payment_reference,
    v_payment_validation_code,
    null::text,
    v_payment_hold_expires_at;
end;
$$;

revoke all on function public.create_booking_with_slots(uuid, uuid, uuid, uuid, date, time, time, jsonb, text, text) from public;
grant execute on function public.create_booking_with_slots(uuid, uuid, uuid, uuid, date, time, time, jsonb, text, text) to authenticated;

-- Ask PostgREST to reload function signatures after replacing create_booking_with_slots.
notify pgrst, 'reload schema';
