create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists id uuid,
  add column if not exists full_name text default '',
  add column if not exists phone text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.profiles
  alter column full_name set default '',
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.profiles
set full_name = ''
where full_name is null;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid,
  add column if not exists email text,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.admin_users
  alter column id set default gen_random_uuid(),
  alter column is_active set default true,
  alter column created_at set default now(),
  alter column updated_at set default now();

create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  description text,
  opens_at time not null default '10:00',
  closes_at time not null default '18:00',
  slot_minutes integer not null default 60,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studios
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists opens_at time default '10:00',
  add column if not exists closes_at time default '18:00',
  add column if not exists slot_minutes integer default 60,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.studios
  alter column id set default gen_random_uuid(),
  alter column opens_at set default '10:00',
  alter column closes_at set default '18:00',
  alter column slot_minutes set default 60,
  alter column is_active set default true,
  alter column created_at set default now(),
  alter column updated_at set default now();

create table if not exists public.producers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text,
  role text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.producers
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists name text,
  add column if not exists specialty text,
  add column if not exists role text,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.producers
  alter column id set default gen_random_uuid(),
  alter column is_active set default true,
  alter column created_at set default now(),
  alter column updated_at set default now();

create table if not exists public.booking_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes integer not null default 60,
  requires_studio boolean not null default true,
  requires_producer boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_services
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists duration_minutes integer default 60,
  add column if not exists requires_studio boolean default true,
  add column if not exists requires_producer boolean default false,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.booking_services
  alter column id set default gen_random_uuid(),
  alter column duration_minutes set default 60,
  alter column requires_studio set default true,
  alter column requires_producer set default false,
  alter column is_active set default true,
  alter column created_at set default now(),
  alter column updated_at set default now();

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  service_id uuid,
  studio_id uuid,
  producer_id uuid,
  booking_date date,
  start_time time,
  end_time time,
  service_type text default 'recording',
  notes text,
  status text default 'pending',
  studio text,
  producer text,
  booking_time time,
  name text,
  phone text,
  email text,
  community boolean default false,
  qr_token text,
  checked_in boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists client_id uuid,
  add column if not exists service_id uuid,
  add column if not exists studio_id uuid,
  add column if not exists producer_id uuid,
  add column if not exists booking_date date,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists service_type text default 'recording',
  add column if not exists notes text,
  add column if not exists status text default 'pending',
  add column if not exists studio text,
  add column if not exists producer text,
  add column if not exists booking_time time,
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists community boolean default false,
  add column if not exists qr_token text,
  add column if not exists checked_in boolean default false,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.bookings
  alter column id set default gen_random_uuid(),
  alter column service_type set default 'recording',
  alter column status set default 'pending',
  alter column community set default false,
  alter column checked_in set default false,
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.bookings
  alter column studio_id drop not null;

do $$
declare
  v_column_name text;
begin
  foreach v_column_name in array array['studio', 'producer', 'booking_time', 'name', 'email', 'phone']
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'bookings'
        and column_name = v_column_name
        and is_nullable = 'NO'
    ) then
      execute format('alter table public.bookings alter column %I drop not null', v_column_name);
    end if;
  end loop;
end $$;

update public.bookings
set status = 'pending'
where status is null or status = '';

do $$
declare
  v_booking_time_data_type text;
  v_booking_time_udt_name text;
begin
  select data_type, udt_name
  into v_booking_time_data_type, v_booking_time_udt_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'bookings'
    and column_name = 'booking_time';

  if v_booking_time_udt_name = 'time' then
    execute $sql$
      update public.bookings
      set start_time = booking_time::time
      where start_time is null
        and booking_time is not null
    $sql$;

    execute $sql$
      update public.bookings
      set booking_time = start_time::time
      where booking_time is null
        and start_time is not null
    $sql$;
  elsif v_booking_time_data_type in ('text', 'character varying', 'character') then
    execute $sql$
      update public.bookings
      set start_time = btrim(booking_time)::time
      where start_time is null
        and booking_time is not null
        and btrim(booking_time) ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9](\.[0-9]{1,6})?)?$'
    $sql$;

    execute $sql$
      update public.bookings
      set booking_time = start_time::text
      where booking_time is null
        and start_time is not null
    $sql$;
  end if;
end $$;

update public.bookings booking
set end_time = (booking.start_time + (coalesce(service.duration_minutes, 60) * interval '1 minute'))::time
from public.booking_services service
where booking.service_id = service.id
  and booking.end_time is null
  and booking.start_time is not null;

update public.bookings
set end_time = (start_time + interval '60 minutes')::time
where end_time is null
  and start_time is not null;

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  owner_id uuid,
  uploaded_by uuid,
  booking_id uuid,
  project_name text,
  bucket text not null default 'client-files',
  storage_path text,
  file_name text,
  file_type text default 'demo',
  mime_type text,
  size_bytes bigint default 0,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.files
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists client_id uuid,
  add column if not exists owner_id uuid,
  add column if not exists uploaded_by uuid,
  add column if not exists booking_id uuid,
  add column if not exists project_name text,
  add column if not exists bucket text default 'client-files',
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists file_type text default 'demo',
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint default 0,
  add column if not exists uploaded_at timestamptz default now(),
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.files
  alter column id set default gen_random_uuid(),
  alter column bucket set default 'client-files',
  alter column file_type set default 'demo',
  alter column size_bytes set default 0,
  alter column uploaded_at set default now(),
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.files
set client_id = owner_id
where client_id is null
  and owner_id is not null;

update public.files
set owner_id = client_id
where owner_id is null
  and client_id is not null;

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid,
  studio_id uuid,
  producer_id uuid,
  weekday integer,
  start_time time,
  end_time time,
  slot_minutes integer default 60,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.availability_rules
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists service_id uuid,
  add column if not exists studio_id uuid,
  add column if not exists producer_id uuid,
  add column if not exists weekday integer,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists slot_minutes integer default 60,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.availability_rules
  alter column id set default gen_random_uuid(),
  alter column slot_minutes set default 60,
  alter column is_active set default true,
  alter column created_at set default now(),
  alter column updated_at set default now();

create table if not exists public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid,
  studio_id uuid,
  producer_id uuid,
  exception_date date,
  start_time time,
  end_time time,
  type text,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.availability_exceptions
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists service_id uuid,
  add column if not exists studio_id uuid,
  add column if not exists producer_id uuid,
  add column if not exists exception_date date,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists type text,
  add column if not exists reason text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.availability_exceptions
  alter column id set default gen_random_uuid(),
  alter column created_at set default now(),
  alter column updated_at set default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := nullif(auth.jwt() ->> 'email', '');
  v_is_admin boolean := false;
begin
  if v_uid is null then
    return false;
  end if;

  if to_regclass('public.admin_users') is null then
    return false;
  end if;

  if exists (
    select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'admin_users'
        and column_name = 'user_id'
        and udt_name = 'uuid'
  ) then
    execute
      'select exists (
        select 1
        from public.admin_users
        where user_id = $1
          and coalesce(is_active, true) is true
      )'
      using v_uid
      into v_is_admin;

    if v_is_admin then
      return true;
    end if;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_users'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    execute
      'select exists (
        select 1
        from public.admin_users
        where id = $1
          and coalesce(is_active, true) is true
      )'
      using v_uid
      into v_is_admin;

    if v_is_admin then
      return true;
    end if;
  end if;

  if v_email is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'admin_users'
        and column_name = 'email'
    )
  then
    execute
      'select exists (
        select 1
        from public.admin_users
        where lower(email) = lower($1)
          and coalesce(is_active, true) is true
      )'
      using v_email
      into v_is_admin;
  end if;

  return coalesce(v_is_admin, false);
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do update
  set
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    phone = coalesce(public.profiles.phone, excluded.phone),
    updated_at = now();

  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created_profile') then
    create trigger on_auth_user_created_profile
      after insert on auth.users
      for each row execute function public.handle_new_user_profile();
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'bookings_client_id_fkey'
      and conrelid = 'public.bookings'::regclass
      and confrelid = 'public.profiles'::regclass
  ) then
    alter table public.bookings drop constraint bookings_client_id_fkey;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'admin_users_user_id_fkey'
      and conrelid = 'public.admin_users'::regclass
  ) then
    alter table public.admin_users
      add constraint admin_users_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_client_id_auth_users_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_client_id_auth_users_fkey
      foreign key (client_id) references auth.users(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_service_id_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_service_id_fkey
      foreign key (service_id) references public.booking_services(id) on delete restrict
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_studio_id_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_studio_id_fkey
      foreign key (studio_id) references public.studios(id) on delete restrict
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_producer_id_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_producer_id_fkey
      foreign key (producer_id) references public.producers(id) on delete set null
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'files_client_id_auth_users_fkey'
      and conrelid = 'public.files'::regclass
  ) then
    alter table public.files
      add constraint files_client_id_auth_users_fkey
      foreign key (client_id) references auth.users(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'files_owner_id_fkey'
      and conrelid = 'public.files'::regclass
  ) then
    alter table public.files
      add constraint files_owner_id_fkey
      foreign key (owner_id) references public.profiles(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'files_uploaded_by_fkey'
      and conrelid = 'public.files'::regclass
  ) then
    alter table public.files
      add constraint files_uploaded_by_fkey
      foreign key (uploaded_by) references auth.users(id) on delete set null
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'files_booking_id_fkey'
      and conrelid = 'public.files'::regclass
  ) then
    alter table public.files
      add constraint files_booking_id_fkey
      foreign key (booking_id) references public.bookings(id) on delete set null
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'availability_rules_service_id_fkey'
      and conrelid = 'public.availability_rules'::regclass
  ) then
    alter table public.availability_rules
      add constraint availability_rules_service_id_fkey
      foreign key (service_id) references public.booking_services(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'availability_rules_studio_id_fkey'
      and conrelid = 'public.availability_rules'::regclass
  ) then
    alter table public.availability_rules
      add constraint availability_rules_studio_id_fkey
      foreign key (studio_id) references public.studios(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'availability_rules_producer_id_fkey'
      and conrelid = 'public.availability_rules'::regclass
  ) then
    alter table public.availability_rules
      add constraint availability_rules_producer_id_fkey
      foreign key (producer_id) references public.producers(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'availability_exceptions_service_id_fkey'
      and conrelid = 'public.availability_exceptions'::regclass
  ) then
    alter table public.availability_exceptions
      add constraint availability_exceptions_service_id_fkey
      foreign key (service_id) references public.booking_services(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'availability_exceptions_studio_id_fkey'
      and conrelid = 'public.availability_exceptions'::regclass
  ) then
    alter table public.availability_exceptions
      add constraint availability_exceptions_studio_id_fkey
      foreign key (studio_id) references public.studios(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'availability_exceptions_producer_id_fkey'
      and conrelid = 'public.availability_exceptions'::regclass
  ) then
    alter table public.availability_exceptions
      add constraint availability_exceptions_producer_id_fkey
      foreign key (producer_id) references public.producers(id) on delete cascade
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'booking_services_duration_check'
      and conrelid = 'public.booking_services'::regclass
  ) then
    alter table public.booking_services
      add constraint booking_services_duration_check
      check (duration_minutes between 15 and 480)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'availability_rules_weekday_check'
      and conrelid = 'public.availability_rules'::regclass
  ) then
    alter table public.availability_rules
      add constraint availability_rules_weekday_check
      check (weekday between 0 and 6)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'availability_rules_time_check'
      and conrelid = 'public.availability_rules'::regclass
  ) then
    alter table public.availability_rules
      add constraint availability_rules_time_check
      check (start_time is null or end_time is null or start_time < end_time)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'availability_rules_slot_minutes_check'
      and conrelid = 'public.availability_rules'::regclass
  ) then
    alter table public.availability_rules
      add constraint availability_rules_slot_minutes_check
      check (slot_minutes between 15 and 240)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'availability_exceptions_type_check'
      and conrelid = 'public.availability_exceptions'::regclass
  ) then
    alter table public.availability_exceptions
      add constraint availability_exceptions_type_check
      check (type in ('blocked', 'available'))
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'availability_exceptions_time_check'
      and conrelid = 'public.availability_exceptions'::regclass
  ) then
    alter table public.availability_exceptions
      add constraint availability_exceptions_time_check
      check (
        (start_time is null and end_time is null)
        or (start_time is not null and end_time is not null and start_time < end_time)
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_service_type_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_service_type_check
      check (service_type in ('recording', 'mixing', 'mastering', 'production'))
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_status_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_status_check
      check (status in ('pending', 'confirmed', 'cancelled', 'completed'))
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bookings_time_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_time_check
      check (start_time is null or end_time is null or start_time < end_time)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'files_file_type_check'
      and conrelid = 'public.files'::regclass
  ) then
    alter table public.files
      add constraint files_file_type_check
      check (file_type in ('master', 'stem', 'demo', 'mix', 'photo', 'video'))
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_profiles_updated_at' and tgrelid = 'public.profiles'::regclass) then
    create trigger set_profiles_updated_at
      before update on public.profiles
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_admin_users_updated_at' and tgrelid = 'public.admin_users'::regclass) then
    create trigger set_admin_users_updated_at
      before update on public.admin_users
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_studios_updated_at' and tgrelid = 'public.studios'::regclass) then
    create trigger set_studios_updated_at
      before update on public.studios
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_producers_updated_at' and tgrelid = 'public.producers'::regclass) then
    create trigger set_producers_updated_at
      before update on public.producers
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_booking_services_updated_at' and tgrelid = 'public.booking_services'::regclass) then
    create trigger set_booking_services_updated_at
      before update on public.booking_services
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_bookings_updated_at' and tgrelid = 'public.bookings'::regclass) then
    create trigger set_bookings_updated_at
      before update on public.bookings
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_files_updated_at' and tgrelid = 'public.files'::regclass) then
    create trigger set_files_updated_at
      before update on public.files
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_availability_rules_updated_at' and tgrelid = 'public.availability_rules'::regclass) then
    create trigger set_availability_rules_updated_at
      before update on public.availability_rules
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_availability_exceptions_updated_at' and tgrelid = 'public.availability_exceptions'::regclass) then
    create trigger set_availability_exceptions_updated_at
      before update on public.availability_exceptions
      for each row execute function public.set_updated_at();
  end if;
end $$;

update public.studios
set slug = regexp_replace(lower(coalesce(name, 'studio')), '[^a-z0-9]+', '-', 'g')
where slug is null
  and name is not null;

create index if not exists booking_services_active_idx
  on public.booking_services (is_active, name);

create index if not exists availability_rules_lookup_idx
  on public.availability_rules (service_id, studio_id, producer_id, weekday, is_active);

create index if not exists availability_exceptions_lookup_idx
  on public.availability_exceptions (exception_date, service_id, studio_id, producer_id, type);

create index if not exists bookings_client_date_idx
  on public.bookings (client_id, booking_date, start_time);

create index if not exists bookings_service_date_start_idx
  on public.bookings (service_id, booking_date, start_time);

create index if not exists files_client_uploaded_idx
  on public.files (client_id, uploaded_at desc);

create index if not exists files_owner_uploaded_idx
  on public.files (owner_id, uploaded_at desc);

do $$
begin
  if to_regclass('public.admin_users_user_id_unique_idx') is null
    and not exists (
      select 1
      from public.admin_users
      where user_id is not null
      group by user_id
      having count(*) > 1
    )
  then
    execute 'create unique index admin_users_user_id_unique_idx on public.admin_users (user_id) where user_id is not null';
  end if;

  if to_regclass('public.booking_services_lower_name_unique_idx') is null
    and not exists (
      select 1
      from public.booking_services
      where name is not null
      group by lower(name)
      having count(*) > 1
    )
  then
    execute 'create unique index booking_services_lower_name_unique_idx on public.booking_services (lower(name)) where name is not null';
  end if;

  if to_regclass('public.studios_slug_unique_idx') is null
    and not exists (
      select 1
      from public.studios
      where slug is not null
      group by slug
      having count(*) > 1
    )
  then
    execute 'create unique index studios_slug_unique_idx on public.studios (slug) where slug is not null';
  end if;

  if to_regclass('public.files_bucket_storage_path_unique_idx') is null
    and not exists (
      select 1
      from public.files
      where bucket is not null
        and storage_path is not null
      group by bucket, storage_path
      having count(*) > 1
    )
  then
    execute 'create unique index files_bucket_storage_path_unique_idx on public.files (bucket, storage_path) where bucket is not null and storage_path is not null';
  end if;

  if to_regclass('public.bookings_studio_date_start_active_idx') is null
    and not exists (
      select 1
      from public.bookings
      where studio_id is not null
        and booking_date is not null
        and start_time is not null
        and status in ('pending', 'confirmed', 'completed')
      group by studio_id, booking_date, start_time
      having count(*) > 1
    )
  then
    execute 'create unique index bookings_studio_date_start_active_idx on public.bookings (studio_id, booking_date, start_time) where studio_id is not null and status in (''pending'', ''confirmed'', ''completed'')';
  end if;

  if to_regclass('public.bookings_producer_date_start_active_idx') is null
    and not exists (
      select 1
      from public.bookings
      where producer_id is not null
        and booking_date is not null
        and start_time is not null
        and status in ('pending', 'confirmed', 'completed')
      group by producer_id, booking_date, start_time
      having count(*) > 1
    )
  then
    execute 'create unique index bookings_producer_date_start_active_idx on public.bookings (producer_id, booking_date, start_time) where producer_id is not null and status in (''pending'', ''confirmed'', ''completed'')';
  end if;

  if to_regclass('public.bookings_service_only_date_start_active_idx') is null
    and not exists (
      select 1
      from public.bookings
      where service_id is not null
        and studio_id is null
        and producer_id is null
        and booking_date is not null
        and start_time is not null
        and status in ('pending', 'confirmed', 'completed')
      group by service_id, booking_date, start_time
      having count(*) > 1
    )
  then
    execute 'create unique index bookings_service_only_date_start_active_idx on public.bookings (service_id, booking_date, start_time) where service_id is not null and studio_id is null and producer_id is null and status in (''pending'', ''confirmed'', ''completed'')';
  end if;
end $$;

insert into public.studios (name, slug, description, opens_at, closes_at, slot_minutes, is_active)
select seed.name, seed.slug, seed.description, seed.opens_at::time, seed.closes_at::time, seed.slot_minutes, true
from (
  values
    ('Studio A', 'studio-a', 'Sala principal para grabacion y produccion.', '10:00', '22:00', 60),
    ('Studio B', 'studio-b', 'Sala compacta para voces, demos y sesiones rapidas.', '10:00', '20:00', 60),
    ('Mix Room', 'mix-room', 'Sala dedicada a mezcla, master y revision de proyectos.', '12:00', '22:00', 60)
) as seed(name, slug, description, opens_at, closes_at, slot_minutes)
where not exists (
  select 1
  from public.studios studio
  where studio.slug = seed.slug
     or lower(studio.name) = lower(seed.name)
);

insert into public.producers (name, specialty, role, is_active)
select seed.name, seed.specialty, seed.role, true
from (
  values
    ('Giovan-E', 'Grabacion y produccion urbana', 'Productor'),
    ('Zeta', 'Mezcla y direccion vocal', 'Productor'),
    ('Onda Visual', 'Foto y video', 'Equipo visual')
) as seed(name, specialty, role)
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
select seed.name, seed.description, seed.duration_minutes, seed.requires_studio, seed.requires_producer, true
from (
  values
    ('Estudio de grabacion', 'Reserva de sala para voces, instrumentos o sesiones guiadas.', 60, true, false),
    ('Reunion con Onda Multimedia', 'Bloque para alinear ideas, cotizaciones o direccion creativa.', 45, false, false),
    ('Estudio fotografico', 'Sesion de foto o contenido visual en sala.', 60, true, false),
    ('Produccion musical', 'Sesion de produccion con acompanamiento creativo.', 90, true, true),
    ('Mezcla / master', 'Revision, mezcla, master o feedback tecnico.', 60, false, true),
    ('Sesion de contenido', 'Bloque para grabar piezas de redes, video o campanas.', 60, true, false)
) as seed(name, description, duration_minutes, requires_studio, requires_producer)
where not exists (
  select 1
  from public.booking_services service
  where lower(service.name) = lower(seed.name)
);

insert into public.availability_rules (
  service_id,
  weekday,
  start_time,
  end_time,
  slot_minutes,
  is_active
)
select service.id, weekday.day, '10:00'::time, '18:00'::time, service.duration_minutes, true
from public.booking_services service
cross join generate_series(1, 5) as weekday(day)
where service.is_active is true
  and service.id is not null
  and not exists (
    select 1
    from public.availability_rules rule
    where rule.service_id = service.id
  );

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.studios enable row level security;
alter table public.producers enable row level security;
alter table public.booking_services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings enable row level security;
alter table public.files enable row level security;

grant select, insert, update, delete on public.admin_users to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.booking_services to authenticated;
grant select, insert, update, delete on public.availability_rules to authenticated;
grant select, insert, update, delete on public.availability_exceptions to authenticated;
grant select, insert, update, delete on public.studios to authenticated;
grant select, insert, update, delete on public.producers to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;
grant select, insert, update, delete on public.files to authenticated;

drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles admin manage" on public.profiles;
drop policy if exists "admin users select own or admin" on public.admin_users;
drop policy if exists "admin users admin manage" on public.admin_users;
drop policy if exists "studios select active" on public.studios;
drop policy if exists "studios admin manage" on public.studios;
drop policy if exists "producers select active" on public.producers;
drop policy if exists "producers admin manage" on public.producers;
drop policy if exists "booking services select active" on public.booking_services;
drop policy if exists "booking services admin manage" on public.booking_services;
drop policy if exists "availability rules select active" on public.availability_rules;
drop policy if exists "availability rules admin manage" on public.availability_rules;
drop policy if exists "availability exceptions select authenticated" on public.availability_exceptions;
drop policy if exists "availability exceptions select reservable" on public.availability_exceptions;
drop policy if exists "availability exceptions admin manage" on public.availability_exceptions;
drop policy if exists "bookings select own" on public.bookings;
drop policy if exists "bookings insert own" on public.bookings;
drop policy if exists "bookings update own" on public.bookings;
drop policy if exists "bookings admin manage" on public.bookings;
drop policy if exists "files select own" on public.files;
drop policy if exists "files select client id own" on public.files;
drop policy if exists "files admin manage" on public.files;

create policy "profiles select own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles insert own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles update own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles admin manage"
  on public.profiles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin users select own or admin"
  on public.admin_users
  for select
  to authenticated
  using (public.is_admin());

create policy "admin users admin manage"
  on public.admin_users
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "studios select active"
  on public.studios
  for select
  to authenticated
  using (is_active is true or public.is_admin());

create policy "studios admin manage"
  on public.studios
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "producers select active"
  on public.producers
  for select
  to authenticated
  using (is_active is true or public.is_admin());

create policy "producers admin manage"
  on public.producers
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "booking services select active"
  on public.booking_services
  for select
  to authenticated
  using (is_active is true or public.is_admin());

create policy "booking services admin manage"
  on public.booking_services
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "availability rules select active"
  on public.availability_rules
  for select
  to authenticated
  using (is_active is true or public.is_admin());

create policy "availability rules admin manage"
  on public.availability_rules
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "availability exceptions select reservable"
  on public.availability_exceptions
  for select
  to authenticated
  using (public.is_admin() or exception_date >= current_date);

create policy "availability exceptions admin manage"
  on public.availability_exceptions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "bookings select own"
  on public.bookings
  for select
  to authenticated
  using (client_id = auth.uid() or public.is_admin());

create policy "bookings insert own"
  on public.bookings
  for insert
  to authenticated
  with check (
    client_id = auth.uid()
    and coalesce(status, 'pending') = 'pending'
  );

create policy "bookings admin manage"
  on public.bookings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "files select own"
  on public.files
  for select
  to authenticated
  using (client_id = auth.uid() or owner_id = auth.uid() or public.is_admin());

create policy "files admin manage"
  on public.files
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop function if exists public.get_booked_slots(date, uuid);
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
    and b.status in ('pending', 'confirmed', 'completed')
    and (
      (p_studio_id is not null and b.studio_id = p_studio_id)
      or (p_producer_id is not null and b.producer_id = p_producer_id)
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

insert into storage.buckets (id, name, "public", file_size_limit, allowed_mime_types)
values ('client-files', 'client-files', false, 524288000, null)
on conflict (id) do update
set
  "public" = excluded."public",
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "client files select own" on storage.objects;
drop policy if exists "client files admin insert" on storage.objects;
drop policy if exists "client files admin update" on storage.objects;
drop policy if exists "client files admin delete" on storage.objects;

create policy "client files select own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'client-files'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.files file_record
        where file_record.bucket = storage.objects.bucket_id
          and file_record.storage_path = storage.objects.name
          and (
            file_record.client_id = auth.uid()
            or file_record.owner_id = auth.uid()
          )
      )
    )
  );

create policy "client files admin insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'client-files' and public.is_admin());

create policy "client files admin update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'client-files' and public.is_admin())
  with check (bucket_id = 'client-files' and public.is_admin());

create policy "client files admin delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'client-files' and public.is_admin());

notify pgrst, 'reload schema';
