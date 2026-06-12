alter table public.booking_services
  add column if not exists price_per_slot numeric not null default 0,
  add column if not exists currency text not null default 'CLP',
  add column if not exists deposit_percent numeric not null default 50;

alter table public.bookings
  add column if not exists selected_slots jsonb not null default '[]'::jsonb,
  add column if not exists total_hours numeric,
  add column if not exists total_amount numeric,
  add column if not exists deposit_amount numeric,
  add column if not exists deposit_percent numeric not null default 50,
  add column if not exists currency text not null default 'CLP',
  add column if not exists payment_status text not null default 'pending';

update public.bookings booking
set
  total_hours = coalesce(
    total_hours,
    greatest(extract(epoch from (booking.end_time - booking.start_time)) / 3600, 0)
  ),
  deposit_percent = coalesce(deposit_percent, 50),
  currency = coalesce(nullif(currency, ''), 'CLP'),
  payment_status = coalesce(nullif(payment_status, ''), 'pending')
where booking.start_time is not null
  and booking.end_time is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_services_price_per_slot_check'
      and conrelid = 'public.booking_services'::regclass
  ) then
    alter table public.booking_services
      add constraint booking_services_price_per_slot_check
      check (price_per_slot >= 0)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_services_deposit_percent_check'
      and conrelid = 'public.booking_services'::regclass
  ) then
    alter table public.booking_services
      add constraint booking_services_deposit_percent_check
      check (deposit_percent between 0 and 100)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_payment_status_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_payment_status_check
      check (payment_status in ('not_required', 'pending', 'paid', 'failed', 'refunded'))
      not valid;
  end if;
end $$;

alter table public.files
  drop constraint if exists files_file_type_check;

alter table public.files
  add constraint files_file_type_check
  check (
    file_type in (
      'master',
      'stem',
      'demo',
      'mix',
      'premix',
      'beat',
      'session',
      'reference',
      'final',
      'revision',
      'photo',
      'video',
      'reel',
      'editable',
      'document',
      'other'
    )
  )
  not valid;

alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending_payment', 'pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'payment_failed'))
  not valid;

drop index if exists public.bookings_studio_date_start_active_idx;
drop index if exists public.bookings_producer_date_start_active_idx;
drop index if exists public.bookings_service_only_date_start_active_idx;

create index if not exists bookings_active_range_idx
  on public.bookings (booking_date, start_time, end_time, service_id, studio_id, producer_id)
  where status in ('pending_payment', 'pending', 'confirmed', 'completed');

update public.producers producer
set user_id = auth_user.id
from auth.users auth_user
where lower(producer.name) = 'yessie'
  and lower(auth_user.email) = 'contacto@ondamultimedia.com'
  and (
    producer.user_id is null
    or producer.user_id = auth_user.id
  )
  and not exists (
    select 1
    from public.producers other_producer
    where other_producer.user_id = auth_user.id
      and other_producer.id <> producer.id
  );

update public.producers producer
set user_id = auth_user.id
from auth.users auth_user
where lower(producer.name) = 'giovan-e'
  and lower(auth_user.email) = 'ilgiovane2026@gmail.com'
  and (
    producer.user_id is null
    or producer.user_id = auth_user.id
  )
  and not exists (
    select 1
    from public.producers other_producer
    where other_producer.user_id = auth_user.id
      and other_producer.id <> producer.id
  );

do $$
begin
  if to_regclass('public.producers_user_id_unique') is null
    and not exists (
      select 1
      from public.producers
      where user_id is not null
      group by user_id
      having count(*) > 1
    )
  then
    execute 'create unique index producers_user_id_unique on public.producers (user_id) where user_id is not null';
  end if;
end $$;

create or replace function public.list_auth_users_for_admin()
returns table (
  id uuid,
  email text,
  full_name text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    auth_user.id,
    auth_user.email,
    profile.full_name
  from auth.users auth_user
  left join public.profiles profile
    on profile.id = auth_user.id
  where public.is_admin()
  order by
    coalesce(nullif(profile.full_name, ''), auth_user.email, auth_user.id::text);
$$;

revoke all on function public.list_auth_users_for_admin() from public;
grant execute on function public.list_auth_users_for_admin() to authenticated;

drop function if exists public.get_booked_slots(date, uuid, uuid, uuid);

create or replace function public.get_booked_slots(
  p_booking_date date,
  p_service_id uuid default null,
  p_studio_id uuid default null,
  p_producer_id uuid default null
)
returns table (
  start_time time,
  end_time time,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select b.start_time, b.end_time, b.status
  from public.bookings b
  where b.booking_date = p_booking_date
    and b.start_time is not null
    and b.end_time is not null
    and b.status in ('pending_payment', 'pending', 'confirmed', 'completed')
    and (
      (
        p_producer_id is not null
        and b.producer_id = p_producer_id
      )
      or (
        p_producer_id is not null
        and p_studio_id is not null
        and b.producer_id is null
        and b.studio_id = p_studio_id
      )
      or (
        p_producer_id is null
        and p_studio_id is not null
        and b.studio_id = p_studio_id
      )
      or (
        p_studio_id is null
        and p_producer_id is null
        and p_service_id is not null
        and b.service_id = p_service_id
        and b.studio_id is null
        and b.producer_id is null
      )
    )
  order by b.start_time;
$$;

revoke all on function public.get_booked_slots(date, uuid, uuid, uuid) from public;
grant execute on function public.get_booked_slots(date, uuid, uuid, uuid) to authenticated;

create or replace function public.create_booking_with_slots(
  p_client_id uuid,
  p_service_id uuid,
  p_studio_id uuid default null,
  p_producer_id uuid default null,
  p_booking_date date default current_date,
  p_start_time time default null,
  p_end_time time default null,
  p_selected_slots jsonb default '[]'::jsonb,
  p_notes text default null
)
returns table (
  id uuid,
  total_amount numeric,
  deposit_amount numeric,
  currency text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.booking_services%rowtype;
  v_slot_count integer := 1;
  v_total_amount numeric := 0;
  v_deposit_percent numeric := 50;
  v_deposit_amount numeric := 0;
  v_total_hours numeric := 0;
  v_booking_id uuid;
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

  select *
  into v_service
  from public.booking_services
  where id = p_service_id
    and is_active is true;

  if not found then
    raise exception 'Booking service is not available.' using errcode = '22023';
  end if;

  if v_service.requires_studio is true and p_studio_id is null then
    raise exception 'Studio is required for this service.' using errcode = '22023';
  end if;

  if v_service.requires_producer is true and p_producer_id is null then
    raise exception 'Responsible is required for this service.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.bookings booking
    where booking.booking_date = p_booking_date
      and booking.start_time is not null
      and booking.end_time is not null
      and booking.status in ('pending_payment', 'pending', 'confirmed', 'completed')
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

  insert into public.bookings (
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
    payment_status
  )
  values (
    p_client_id,
    p_service_id,
    p_studio_id,
    p_producer_id,
    p_booking_date,
    p_start_time,
    p_end_time,
    p_notes,
    'pending',
    p_selected_slots,
    v_total_hours,
    v_total_amount,
    v_deposit_amount,
    v_deposit_percent,
    coalesce(nullif(v_service.currency, ''), 'CLP'),
    'pending'
  )
  returning id into v_booking_id;

  return query
  select v_booking_id, v_total_amount, v_deposit_amount, coalesce(nullif(v_service.currency, ''), 'CLP');
end;
$$;

revoke all on function public.create_booking_with_slots(uuid, uuid, uuid, uuid, date, time, time, jsonb, text) from public;
grant execute on function public.create_booking_with_slots(uuid, uuid, uuid, uuid, date, time, time, jsonb, text) to authenticated;

notify pgrst, 'reload schema';
