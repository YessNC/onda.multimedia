alter table public.availability_rules
  add column if not exists group_id uuid,
  add column if not exists weekdays integer[];

update public.availability_rules
set weekdays = array[weekday]
where weekdays is null
  and weekday is not null;

alter table public.availability_exceptions
  add column if not exists group_id uuid,
  add column if not exists date_from date,
  add column if not exists date_to date,
  add column if not exists weekdays integer[];

update public.availability_exceptions
set date_from = exception_date
where date_from is null
  and exception_date is not null;

update public.availability_exceptions
set date_to = exception_date
where date_to is null
  and exception_date is not null
  and weekdays is null;

update public.availability_exceptions
set weekdays = array[extract(dow from exception_date)::integer]
where weekdays is null
  and exception_date is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'availability_rules_weekdays_check'
      and conrelid = 'public.availability_rules'::regclass
  ) then
    alter table public.availability_rules
      add constraint availability_rules_weekdays_check
      check (
        weekdays is null
        or (
          cardinality(weekdays) between 1 and 7
          and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]
        )
      )
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'availability_exceptions_weekdays_check'
      and conrelid = 'public.availability_exceptions'::regclass
  ) then
    alter table public.availability_exceptions
      add constraint availability_exceptions_weekdays_check
      check (
        weekdays is null
        or (
          cardinality(weekdays) between 1 and 7
          and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]
        )
      )
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'availability_exceptions_date_range_check'
      and conrelid = 'public.availability_exceptions'::regclass
  ) then
    alter table public.availability_exceptions
      add constraint availability_exceptions_date_range_check
      check (date_from is null or date_to is null or date_to >= date_from)
      not valid;
  end if;
end $$;

create index if not exists availability_rules_weekdays_gin_idx
  on public.availability_rules using gin (weekdays);

create index if not exists availability_rules_group_id_idx
  on public.availability_rules (group_id)
  where group_id is not null;

create index if not exists availability_exceptions_range_idx
  on public.availability_exceptions (date_from, date_to, type);

create index if not exists availability_exceptions_weekdays_gin_idx
  on public.availability_exceptions using gin (weekdays);

create index if not exists availability_exceptions_group_id_idx
  on public.availability_exceptions (group_id)
  where group_id is not null;

drop policy if exists "availability exceptions select reservable" on public.availability_exceptions;

create policy "availability exceptions select reservable"
  on public.availability_exceptions
  for select
  to authenticated
  using (
    public.is_admin()
    or exception_date >= current_date
    or date_to is null
    or date_to >= current_date
  );

drop function if exists public.get_public_availability_preview(date, integer, integer);

create or replace function public.get_public_availability_preview(
  p_from_date date default current_date,
  p_days integer default 21,
  p_limit integer default 80
)
returns table (
  booking_date date,
  start_time time,
  end_time time,
  service_id uuid,
  service_name text,
  studio_id uuid,
  studio_name text,
  producer_id uuid,
  producer_name text,
  source text
)
language sql
stable
security definer
set search_path = public
as $$
  with input as (
    select
      greatest(coalesce(p_from_date, current_date), current_date) as from_date,
      least(greatest(coalesce(p_days, 21), 1), 90) as days,
      least(greatest(coalesce(p_limit, 80), 1), 200) as result_limit
  ),
  preview_dates as (
    select (input.from_date + offset_value)::date as booking_date
    from input
    cross join generate_series(0, input.days - 1) as offset_values(offset_value)
  ),
  service_options as (
    select
      service.id as service_id,
      service.name as service_name,
      greatest(coalesce(service.duration_minutes, 60), 5) as duration_minutes,
      studio.id as studio_id,
      studio.name as studio_name,
      producer.id as producer_id,
      producer.name as producer_name
    from public.booking_services service
    left join public.studios studio
      on service.requires_studio is true
      and studio.is_active is true
    left join public.producers producer
      on service.requires_producer is true
      and producer.is_active is true
    where service.is_active is true
      and (service.requires_studio is false or studio.id is not null)
      and (service.requires_producer is false or producer.id is not null)
  ),
  base_slots as (
    select
      preview_dates.booking_date,
      generated.slot_start,
      generated.slot_start + (service_options.duration_minutes * interval '1 minute') as slot_end,
      service_options.service_id,
      service_options.service_name,
      service_options.studio_id,
      service_options.studio_name,
      service_options.producer_id,
      service_options.producer_name,
      'rule'::text as slot_source
    from service_options
    join preview_dates on true
    join public.availability_rules rule
      on rule.is_active is true
      and (
        extract(dow from preview_dates.booking_date)::integer = any(coalesce(rule.weekdays, array[rule.weekday]))
      )
      and (rule.service_id is null or rule.service_id = service_options.service_id)
      and (rule.studio_id is null or rule.studio_id = service_options.studio_id)
      and (rule.producer_id is null or rule.producer_id = service_options.producer_id)
    cross join lateral generate_series(
      preview_dates.booking_date + rule.start_time,
      preview_dates.booking_date
        + rule.end_time
        + case when rule.end_time = time '23:59' then interval '1 minute' else interval '0 minute' end
        - (service_options.duration_minutes * interval '1 minute'),
      greatest(coalesce(rule.slot_minutes, service_options.duration_minutes), 5) * interval '1 minute'
    ) as generated(slot_start)
  ),
  exception_slots as (
    select
      preview_dates.booking_date,
      generated.slot_start,
      generated.slot_start + (service_options.duration_minutes * interval '1 minute') as slot_end,
      service_options.service_id,
      service_options.service_name,
      service_options.studio_id,
      service_options.studio_name,
      service_options.producer_id,
      service_options.producer_name,
      'exception'::text as slot_source
    from service_options
    join preview_dates on true
    join public.availability_exceptions exception
      on exception.type = 'available'
      and preview_dates.booking_date >= coalesce(exception.date_from, exception.exception_date)
      and (
        exception.date_to is null
        or preview_dates.booking_date <= exception.date_to
      )
      and extract(dow from preview_dates.booking_date)::integer = any(coalesce(exception.weekdays, array[extract(dow from exception.exception_date)::integer]))
      and exception.start_time is not null
      and exception.end_time is not null
      and (exception.service_id is null or exception.service_id = service_options.service_id)
      and (exception.studio_id is null or exception.studio_id = service_options.studio_id)
      and (exception.producer_id is null or exception.producer_id = service_options.producer_id)
    cross join lateral generate_series(
      preview_dates.booking_date + exception.start_time,
      preview_dates.booking_date
        + exception.end_time
        + case when exception.end_time = time '23:59' then interval '1 minute' else interval '0 minute' end
        - (service_options.duration_minutes * interval '1 minute'),
      service_options.duration_minutes * interval '1 minute'
    ) as generated(slot_start)
  ),
  candidate_slots as (
    select distinct on (
      slots.booking_date,
      slots.slot_start,
      slots.slot_end,
      slots.service_id,
      coalesce(slots.studio_id, '00000000-0000-0000-0000-000000000000'::uuid),
      coalesce(slots.producer_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
      slots.*
    from (
      select * from base_slots
      union all
      select * from exception_slots
    ) slots
    order by
      slots.booking_date,
      slots.slot_start,
      slots.slot_end,
      slots.service_id,
      coalesce(slots.studio_id, '00000000-0000-0000-0000-000000000000'::uuid),
      coalesce(slots.producer_id, '00000000-0000-0000-0000-000000000000'::uuid),
      case when slots.slot_source = 'exception' then 0 else 1 end
  ),
  booking_blocks as (
    select
      booking.booking_date,
      case
        when booking.start_time is not null then booking.start_time
        when booking.booking_time is not null
          and btrim(booking.booking_time::text) ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9](\.[0-9]{1,6})?)?$'
          then btrim(booking.booking_time::text)::time
        else null
      end as block_start_time,
      coalesce(
        booking.end_time,
        (
          case
            when booking.start_time is not null then booking.start_time
            when booking.booking_time is not null
              and btrim(booking.booking_time::text) ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9](\.[0-9]{1,6})?)?$'
              then btrim(booking.booking_time::text)::time
            else null
          end + interval '60 minutes'
        )::time
      ) as block_end_time,
      booking.service_id,
      booking.studio_id,
      booking.producer_id
    from public.bookings booking
    where booking.status in ('pending_payment', 'pending', 'confirmed', 'completed')
  ),
  available_slots as (
    select candidate_slots.*
    from candidate_slots
    where not (
      candidate_slots.booking_date = current_date
      and candidate_slots.slot_start::time <= current_time
    )
      and not exists (
        select 1
        from public.availability_exceptions blocked
        where blocked.type = 'blocked'
          and candidate_slots.booking_date >= coalesce(blocked.date_from, blocked.exception_date)
          and (
            blocked.date_to is null
            or candidate_slots.booking_date <= blocked.date_to
          )
          and extract(dow from candidate_slots.booking_date)::integer = any(coalesce(blocked.weekdays, array[extract(dow from blocked.exception_date)::integer]))
          and (blocked.service_id is null or blocked.service_id = candidate_slots.service_id)
          and (blocked.studio_id is null or blocked.studio_id = candidate_slots.studio_id)
          and (blocked.producer_id is null or blocked.producer_id = candidate_slots.producer_id)
          and (
            blocked.start_time is null
            or blocked.end_time is null
            or (
              candidate_slots.slot_start::time < blocked.end_time
              and blocked.start_time < candidate_slots.slot_end::time
            )
          )
      )
      and not exists (
        select 1
        from booking_blocks booking
        where booking.booking_date = candidate_slots.booking_date
          and booking.block_start_time is not null
          and booking.block_end_time is not null
          and (
            (
              candidate_slots.studio_id is not null
              and booking.studio_id = candidate_slots.studio_id
            )
            or (
              candidate_slots.producer_id is not null
              and booking.producer_id = candidate_slots.producer_id
            )
            or (
              candidate_slots.studio_id is null
              and candidate_slots.producer_id is null
              and booking.service_id = candidate_slots.service_id
              and booking.studio_id is null
              and booking.producer_id is null
            )
          )
          and (
            candidate_slots.slot_start::time < booking.block_end_time
            and booking.block_start_time < candidate_slots.slot_end::time
          )
      )
  )
  select
    available_slots.booking_date,
    available_slots.slot_start::time as start_time,
    available_slots.slot_end::time as end_time,
    available_slots.service_id,
    available_slots.service_name,
    available_slots.studio_id,
    available_slots.studio_name,
    available_slots.producer_id,
    available_slots.producer_name,
    available_slots.slot_source as source
  from available_slots, input
  order by
    available_slots.booking_date,
    available_slots.slot_start,
    available_slots.service_name,
    available_slots.studio_name nulls last,
    available_slots.producer_name nulls last
  limit (select input.result_limit from input);
$$;

revoke all on function public.get_public_availability_preview(date, integer, integer) from public;
grant execute on function public.get_public_availability_preview(date, integer, integer) to anon, authenticated;

notify pgrst, 'reload schema';
