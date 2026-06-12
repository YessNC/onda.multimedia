create extension if not exists "pgcrypto";

create table if not exists public.booking_service_studios (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.booking_services(id) on delete cascade,
  studio_id uuid references public.studios(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_service_studios
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists service_id uuid,
  add column if not exists studio_id uuid,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.booking_service_studios
  alter column id set default gen_random_uuid(),
  alter column is_active set default true,
  alter column created_at set default now(),
  alter column updated_at set default now();

create table if not exists public.producer_studios (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid references public.producers(id) on delete cascade,
  studio_id uuid references public.studios(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.producer_studios
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists producer_id uuid,
  add column if not exists studio_id uuid,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.producer_studios
  alter column id set default gen_random_uuid(),
  alter column is_active set default true,
  alter column created_at set default now(),
  alter column updated_at set default now();

create table if not exists public.producer_services (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid references public.producers(id) on delete cascade,
  service_id uuid references public.booking_services(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.producer_services
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists producer_id uuid,
  add column if not exists service_id uuid,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.producer_services
  alter column id set default gen_random_uuid(),
  alter column is_active set default true,
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'booking_service_studios_service_id_fkey'
      and conrelid = 'public.booking_service_studios'::regclass
  ) then
    alter table public.booking_service_studios
      add constraint booking_service_studios_service_id_fkey
      foreign key (service_id) references public.booking_services(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'booking_service_studios_studio_id_fkey'
      and conrelid = 'public.booking_service_studios'::regclass
  ) then
    alter table public.booking_service_studios
      add constraint booking_service_studios_studio_id_fkey
      foreign key (studio_id) references public.studios(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'producer_studios_producer_id_fkey'
      and conrelid = 'public.producer_studios'::regclass
  ) then
    alter table public.producer_studios
      add constraint producer_studios_producer_id_fkey
      foreign key (producer_id) references public.producers(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'producer_studios_studio_id_fkey'
      and conrelid = 'public.producer_studios'::regclass
  ) then
    alter table public.producer_studios
      add constraint producer_studios_studio_id_fkey
      foreign key (studio_id) references public.studios(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'producer_services_producer_id_fkey'
      and conrelid = 'public.producer_services'::regclass
  ) then
    alter table public.producer_services
      add constraint producer_services_producer_id_fkey
      foreign key (producer_id) references public.producers(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'producer_services_service_id_fkey'
      and conrelid = 'public.producer_services'::regclass
  ) then
    alter table public.producer_services
      add constraint producer_services_service_id_fkey
      foreign key (service_id) references public.booking_services(id) on delete cascade
      not valid;
  end if;
end $$;

do $$
begin
  if to_regclass('public.booking_service_studios_service_studio_unique') is null
    and not exists (
      select 1
      from public.booking_service_studios
      where service_id is not null
        and studio_id is not null
      group by service_id, studio_id
      having count(*) > 1
    )
  then
    execute 'create unique index booking_service_studios_service_studio_unique on public.booking_service_studios (service_id, studio_id)';
  end if;

  if to_regclass('public.producer_studios_producer_studio_unique') is null
    and not exists (
      select 1
      from public.producer_studios
      where producer_id is not null
        and studio_id is not null
      group by producer_id, studio_id
      having count(*) > 1
    )
  then
    execute 'create unique index producer_studios_producer_studio_unique on public.producer_studios (producer_id, studio_id)';
  end if;

  if to_regclass('public.producer_services_producer_service_unique') is null
    and not exists (
      select 1
      from public.producer_services
      where producer_id is not null
        and service_id is not null
      group by producer_id, service_id
      having count(*) > 1
    )
  then
    execute 'create unique index producer_services_producer_service_unique on public.producer_services (producer_id, service_id)';
  end if;
end $$;

create index if not exists booking_service_studios_lookup_idx
  on public.booking_service_studios (service_id, studio_id, is_active);

create index if not exists producer_studios_lookup_idx
  on public.producer_studios (producer_id, studio_id, is_active);

create index if not exists producer_services_lookup_idx
  on public.producer_services (producer_id, service_id, is_active);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_booking_service_studios_updated_at') then
    create trigger set_booking_service_studios_updated_at
      before update on public.booking_service_studios
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_producer_studios_updated_at') then
    create trigger set_producer_studios_updated_at
      before update on public.producer_studios
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_producer_services_updated_at') then
    create trigger set_producer_services_updated_at
      before update on public.producer_services
      for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.booking_service_studios enable row level security;
alter table public.producer_studios enable row level security;
alter table public.producer_services enable row level security;

grant select, insert, update, delete on public.booking_service_studios to authenticated;
grant select, insert, update, delete on public.producer_studios to authenticated;
grant select, insert, update, delete on public.producer_services to authenticated;

drop policy if exists "booking service studios select active" on public.booking_service_studios;
drop policy if exists "booking service studios admin manage" on public.booking_service_studios;
drop policy if exists "producer studios select active" on public.producer_studios;
drop policy if exists "producer studios admin manage" on public.producer_studios;
drop policy if exists "producer services select active" on public.producer_services;
drop policy if exists "producer services admin manage" on public.producer_services;

create policy "booking service studios select active"
  on public.booking_service_studios
  for select
  to authenticated
  using (is_active is true or public.is_admin());

create policy "booking service studios admin manage"
  on public.booking_service_studios
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "producer studios select active"
  on public.producer_studios
  for select
  to authenticated
  using (is_active is true or public.is_admin());

create policy "producer studios admin manage"
  on public.producer_studios
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "producer services select active"
  on public.producer_services
  for select
  to authenticated
  using (is_active is true or public.is_admin());

create policy "producer services admin manage"
  on public.producer_services
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.booking_service_studios is
  'Operational availability: studios where each booking service can be reserved.';

comment on table public.producer_studios is
  'Operational assignment only: studios where each team member can work. This is not an admin permission table.';

comment on table public.producer_services is
  'Operational assignment only: services each team member can handle. This is not an admin permission table.';

insert into public.studios (name, slug, description, opens_at, closes_at, slot_minutes, is_active)
select
  'NEEXWORKS',
  'neexworks',
  'Estudio habilitado para reuniones y sesiones operativas de Onda Multimedia.',
  '10:00'::time,
  '22:00'::time,
  60,
  true
where not exists (
  select 1
  from public.studios studio
  where lower(studio.name) = 'neexworks'
     or studio.slug = 'neexworks'
);

update public.studios
set is_active = false
where lower(name) in ('sala de reuniones', 'sala reuniones');

update public.producers producer
set name = 'Yessie Neira'
where lower(producer.name) = 'yessie'
  and not exists (
    select 1
    from public.producers other_producer
    where other_producer.id <> producer.id
      and lower(other_producer.name) = 'yessie neira'
  );

update public.producers producer
set name = 'Raul Allende'
where (
    lower(producer.name) like 'ra_l'
    or lower(producer.name) like 'ra_l allende'
  )
  and not exists (
    select 1
    from public.producers other_producer
    where other_producer.id <> producer.id
      and lower(other_producer.name) = 'raul allende'
  );

insert into public.producers (name, specialty, role, role_description, is_active)
select
  seed.name,
  seed.specialty,
  seed.role,
  seed.role_description,
  true
from (
  values
    (
      'Yessie Neira',
      'Gestion, estrategia y tecnologia',
      'CEO / CTO',
      'Responsable de reuniones, estrategia, gestion del proyecto, desarrollo tecnologico y operacion digital de Onda Multimedia.'
    ),
    (
      'Raul Allende',
      'Direccion creativa y operaciones',
      'CCO / COO',
      'Responsable de reuniones, direccion creativa, coordinacion operativa y funcionamiento general de proyectos.'
    )
) as seed(name, specialty, role, role_description)
where not exists (
  select 1
  from public.producers producer
  where lower(producer.name) = lower(seed.name)
);

insert into public.booking_services (
  name,
  description,
  duration_minutes,
  requires_studio,
  requires_producer,
  is_active
)
select
  'Reunion con Onda Multimedia',
  'Bloque para alinear ideas, cotizaciones o direccion creativa.',
  45,
  true,
  true,
  true
where not exists (
  select 1
  from public.booking_services service
  where lower(service.name) like 'reuni_n con onda multimedia'
);

update public.booking_services
set
  requires_studio = true,
  requires_producer = true
where lower(name) like 'reuni_n con onda multimedia';

update public.booking_services
set requires_producer = true
where lower(name) like '%grabaci_n%'
   or lower(name) like '%producci_n musical%'
   or lower(name) like '%mezcla%master%'
   or lower(name) like '%fotogr_fico%'
   or lower(name) like '%contenido%';

with meeting_services as (
  select id
  from public.booking_services
  where lower(name) like 'reuni_n con onda multimedia'
),
neexworks as (
  select id
  from public.studios
  where lower(name) = 'neexworks'
     or slug = 'neexworks'
  limit 1
)
insert into public.booking_service_studios (service_id, studio_id, is_active)
select meeting_services.id, neexworks.id, true
from meeting_services
cross join neexworks
on conflict (service_id, studio_id) do update
set is_active = true,
    updated_at = now();

with meeting_services as (
  select id
  from public.booking_services
  where lower(name) like 'reuni_n con onda multimedia'
),
neexworks as (
  select id
  from public.studios
  where lower(name) = 'neexworks'
     or slug = 'neexworks'
  limit 1
)
update public.booking_service_studios assignment
set is_active = false
from meeting_services
where assignment.service_id = meeting_services.id
  and assignment.studio_id <> (select id from neexworks);

insert into public.booking_service_studios (service_id, studio_id, is_active)
select service.id, studio.id, true
from public.booking_services service
join public.studios studio
  on studio.is_active is true
where service.is_active is true
  and service.requires_studio is true
  and lower(service.name) not like 'reuni_n con onda multimedia'
  and lower(studio.name) not in ('sala de reuniones', 'sala reuniones')
on conflict (service_id, studio_id) do nothing;

with neexworks as (
  select id
  from public.studios
  where lower(name) = 'neexworks'
     or slug = 'neexworks'
  limit 1
),
target_producers as (
  select producer.id, lower(producer.name) as normalized_name
  from public.producers producer
  where lower(producer.name) in ('giovan-e', 'yessie neira', 'raul allende')
)
insert into public.producer_studios (producer_id, studio_id, is_active)
select target_producers.id, neexworks.id, true
from target_producers
cross join neexworks
on conflict (producer_id, studio_id) do update
set is_active = true,
    updated_at = now();

with neexworks as (
  select id
  from public.studios
  where lower(name) = 'neexworks'
     or slug = 'neexworks'
  limit 1
),
target_producers as (
  select producer.id
  from public.producers producer
  where lower(producer.name) in ('giovan-e', 'yessie neira', 'raul allende')
)
update public.producer_studios assignment
set is_active = false
from target_producers
where assignment.producer_id = target_producers.id
  and assignment.studio_id <> (select id from neexworks);

with neexworks as (
  select id
  from public.studios
  where lower(name) = 'neexworks'
     or slug = 'neexworks'
  limit 1
),
zeta as (
  select id
  from public.producers
  where lower(name) = 'zeta'
)
update public.producer_studios assignment
set is_active = false
from zeta
where assignment.producer_id = zeta.id
  and assignment.studio_id = (select id from neexworks);

with zeta as (
  select id
  from public.producers
  where lower(name) = 'zeta'
),
eligible_studios as (
  select id
  from public.studios
  where is_active is true
    and lower(name) not in ('neexworks', 'sala de reuniones', 'sala reuniones')
)
insert into public.producer_studios (producer_id, studio_id, is_active)
select zeta.id, eligible_studios.id, true
from zeta
cross join eligible_studios
on conflict (producer_id, studio_id) do nothing;

with visual_team as (
  select id
  from public.producers
  where lower(name) = 'onda visual'
),
eligible_studios as (
  select id
  from public.studios
  where is_active is true
    and lower(name) not in ('sala de reuniones', 'sala reuniones')
)
insert into public.producer_studios (producer_id, studio_id, is_active)
select visual_team.id, eligible_studios.id, true
from visual_team
cross join eligible_studios
on conflict (producer_id, studio_id) do nothing;

with fallback_producers as (
  select id
  from public.producers
  where lower(name) not in ('giovan-e', 'zeta', 'yessie neira', 'raul allende', 'onda visual')
),
eligible_studios as (
  select id
  from public.studios
  where is_active is true
    and lower(name) not in ('sala de reuniones', 'sala reuniones')
)
insert into public.producer_studios (producer_id, studio_id, is_active)
select fallback_producers.id, eligible_studios.id, true
from fallback_producers
cross join eligible_studios
on conflict (producer_id, studio_id) do nothing;

with meeting_services as (
  select id
  from public.booking_services
  where lower(name) like 'reuni_n con onda multimedia'
),
meeting_producers as (
  select id
  from public.producers
  where lower(name) in ('yessie neira', 'raul allende')
)
insert into public.producer_services (producer_id, service_id, is_active)
select meeting_producers.id, meeting_services.id, true
from meeting_producers
cross join meeting_services
on conflict (producer_id, service_id) do update
set is_active = true,
    updated_at = now();

with meeting_producers as (
  select id
  from public.producers
  where lower(name) in ('yessie neira', 'raul allende')
),
meeting_services as (
  select id
  from public.booking_services
  where lower(name) like 'reuni_n con onda multimedia'
)
update public.producer_services assignment
set is_active = false
from meeting_producers
where assignment.producer_id = meeting_producers.id
  and assignment.service_id not in (select id from meeting_services);

with giovan as (
  select id
  from public.producers
  where lower(name) = 'giovan-e'
),
eligible_services as (
  select id
  from public.booking_services
  where lower(name) like '%grabaci_n%'
     or lower(name) like '%producci_n musical%'
     or lower(name) like '%mezcla%master%'
)
insert into public.producer_services (producer_id, service_id, is_active)
select giovan.id, eligible_services.id, true
from giovan
cross join eligible_services
on conflict (producer_id, service_id) do update
set is_active = true,
    updated_at = now();

with giovan as (
  select id
  from public.producers
  where lower(name) = 'giovan-e'
),
eligible_services as (
  select id
  from public.booking_services
  where lower(name) like '%grabaci_n%'
     or lower(name) like '%producci_n musical%'
     or lower(name) like '%mezcla%master%'
)
update public.producer_services assignment
set is_active = false
from giovan
where assignment.producer_id = giovan.id
  and assignment.service_id not in (select id from eligible_services);

with zeta as (
  select id
  from public.producers
  where lower(name) = 'zeta'
),
eligible_services as (
  select id
  from public.booking_services
  where lower(name) like '%producci_n musical%'
     or lower(name) like '%mezcla%master%'
)
insert into public.producer_services (producer_id, service_id, is_active)
select zeta.id, eligible_services.id, true
from zeta
cross join eligible_services
on conflict (producer_id, service_id) do update
set is_active = true,
    updated_at = now();

with zeta as (
  select id
  from public.producers
  where lower(name) = 'zeta'
),
eligible_services as (
  select id
  from public.booking_services
  where lower(name) like '%producci_n musical%'
     or lower(name) like '%mezcla%master%'
)
update public.producer_services assignment
set is_active = false
from zeta
where assignment.producer_id = zeta.id
  and assignment.service_id not in (select id from eligible_services);

with visual_team as (
  select id
  from public.producers
  where lower(name) = 'onda visual'
),
eligible_services as (
  select id
  from public.booking_services
  where lower(name) like '%fotogr_fico%'
     or lower(name) like '%contenido%'
)
insert into public.producer_services (producer_id, service_id, is_active)
select visual_team.id, eligible_services.id, true
from visual_team
cross join eligible_services
on conflict (producer_id, service_id) do update
set is_active = true,
    updated_at = now();

with visual_team as (
  select id
  from public.producers
  where lower(name) = 'onda visual'
),
eligible_services as (
  select id
  from public.booking_services
  where lower(name) like '%fotogr_fico%'
     or lower(name) like '%contenido%'
)
update public.producer_services assignment
set is_active = false
from visual_team
where assignment.producer_id = visual_team.id
  and assignment.service_id not in (select id from eligible_services);

with fallback_producers as (
  select id
  from public.producers
  where lower(name) not in ('giovan-e', 'zeta', 'yessie neira', 'raul allende', 'onda visual')
),
eligible_services as (
  select id
  from public.booking_services
  where is_active is true
)
insert into public.producer_services (producer_id, service_id, is_active)
select fallback_producers.id, eligible_services.id, true
from fallback_producers
cross join eligible_services
on conflict (producer_id, service_id) do nothing;

create or replace function public.booking_combination_is_allowed(
  p_service_id uuid,
  p_studio_id uuid default null,
  p_producer_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.booking_services service
    where service.id = p_service_id
      and service.is_active is true
      and (
        (
          service.requires_studio is true
          and p_studio_id is not null
          and exists (
            select 1
            from public.studios studio
            join public.booking_service_studios service_studio
              on service_studio.studio_id = studio.id
             and service_studio.service_id = service.id
             and service_studio.is_active is true
            where studio.id = p_studio_id
              and studio.is_active is true
          )
        )
        or (
          service.requires_studio is false
          and p_studio_id is null
        )
      )
      and (
        (
          service.requires_producer is true
          and p_producer_id is not null
          and exists (
            select 1
            from public.producers producer
            join public.producer_services producer_service
              on producer_service.producer_id = producer.id
             and producer_service.service_id = service.id
             and producer_service.is_active is true
            where producer.id = p_producer_id
              and producer.is_active is true
          )
        )
        or (
          service.requires_producer is false
          and p_producer_id is null
        )
      )
      and (
        service.requires_studio is false
        or service.requires_producer is false
        or exists (
          select 1
          from public.producer_studios producer_studio
          where producer_studio.producer_id = p_producer_id
            and producer_studio.studio_id = p_studio_id
            and producer_studio.is_active is true
        )
      )
  );
$$;

revoke all on function public.booking_combination_is_allowed(uuid, uuid, uuid) from public;
grant execute on function public.booking_combination_is_allowed(uuid, uuid, uuid) to authenticated;

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

  if public.booking_combination_is_allowed(p_service_id, p_studio_id, p_producer_id) is not true then
    raise exception 'This service, studio and responsible combination is not available.' using errcode = '22023';
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
    left join public.booking_service_studios service_studio
      on service.requires_studio is true
     and service_studio.service_id = service.id
     and service_studio.is_active is true
    left join public.studios studio
      on service.requires_studio is true
     and studio.id = service_studio.studio_id
     and studio.is_active is true
    left join public.producers producer
      on service.requires_producer is true
     and producer.is_active is true
    left join public.producer_services producer_service
      on service.requires_producer is true
     and producer_service.producer_id = producer.id
     and producer_service.service_id = service.id
     and producer_service.is_active is true
    left join public.producer_studios producer_studio
      on service.requires_studio is true
     and service.requires_producer is true
     and producer_studio.producer_id = producer.id
     and producer_studio.studio_id = studio.id
     and producer_studio.is_active is true
    where service.is_active is true
      and (service.requires_studio is false or studio.id is not null)
      and (service.requires_producer is false or producer_service.id is not null)
      and (
        service.requires_studio is false
        or service.requires_producer is false
        or producer_studio.id is not null
      )
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
