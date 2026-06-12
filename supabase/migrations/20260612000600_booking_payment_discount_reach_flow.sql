create extension if not exists "pgcrypto";

create or replace function public.booking_blocks_availability(
  p_status text,
  p_payment_hold_expires_at timestamptz default null
)
returns boolean
language sql
stable
as $$
  select
    p_status in ('pending', 'confirmed', 'completed')
    or (
      p_status = 'pending_payment'
      and p_payment_hold_expires_at is not null
      and p_payment_hold_expires_at > now()
    );
$$;

revoke all on function public.booking_blocks_availability(text, timestamptz) from public;
grant execute on function public.booking_blocks_availability(text, timestamptz) to anon, authenticated;

create or replace function public.is_owner()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
begin
  if v_uid is null or v_email <> 'contacto@ondamultimedia.com' then
    return false;
  end if;

  return exists (
    select 1
    from public.admin_users admin_user
    where coalesce(admin_user.is_active, true) is true
      and (
        admin_user.user_id = v_uid
        or lower(coalesce(admin_user.email, '')) = v_email
      )
  );
end;
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

drop function if exists public.delete_team_member_if_safe(uuid);

create or replace function public.delete_team_member_if_safe(p_producer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_producer public.producers%rowtype;
begin
  if public.is_owner() is not true then
    raise exception 'Only the owner can delete team members.' using errcode = '42501';
  end if;

  select *
  into v_producer
  from public.producers producer
  where producer.id = p_producer_id
  for update;

  if not found then
    raise exception 'Team member was not found.' using errcode = '22023';
  end if;

  if v_producer.user_id is not null then
    raise exception 'TEAM_MEMBER_HAS_LINKED_USER' using errcode = '42501';
  end if;

  if exists (select 1 from public.bookings booking where booking.producer_id = p_producer_id)
    or exists (select 1 from public.availability_rules rule where rule.producer_id = p_producer_id)
    or exists (select 1 from public.availability_exceptions exception where exception.producer_id = p_producer_id)
    or exists (
      select 1
      from public.producer_studios assignment
      where assignment.producer_id = p_producer_id
        and assignment.is_active is true
    )
    or exists (
      select 1
      from public.producer_services assignment
      where assignment.producer_id = p_producer_id
        and assignment.is_active is true
    )
  then
    raise exception 'TEAM_MEMBER_HAS_RELATED_DATA' using errcode = '23503';
  end if;

  delete from public.producers producer
  where producer.id = p_producer_id
    and producer.user_id is null;

  if not found then
    raise exception 'Team member could not be deleted.' using errcode = '22023';
  end if;

  return p_producer_id;
end;
$$;

revoke all on function public.delete_team_member_if_safe(uuid) from public;
grant execute on function public.delete_team_member_if_safe(uuid) to authenticated;

update public.admin_users admin_user
set role = 'owner',
    email = coalesce(admin_user.email, auth_user.email)
from auth.users auth_user
where lower(auth_user.email) = 'contacto@ondamultimedia.com'
  and (
    admin_user.user_id = auth_user.id
    or lower(coalesce(admin_user.email, '')) = 'contacto@ondamultimedia.com'
  );

insert into public.admin_users (user_id, email, role, is_active)
select auth_user.id, auth_user.email, 'owner', true
from auth.users auth_user
where lower(auth_user.email) = 'contacto@ondamultimedia.com'
  and not exists (
    select 1
    from public.admin_users admin_user
    where admin_user.user_id = auth_user.id
       or lower(coalesce(admin_user.email, '')) = 'contacto@ondamultimedia.com'
  );

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text,
  discount_type text not null default 'percent',
  discount_value numeric not null default 0,
  applies_to text not null default 'deposit',
  max_uses integer,
  used_count integer not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.discount_codes
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists code text,
  add column if not exists description text,
  add column if not exists discount_type text default 'percent',
  add column if not exists discount_value numeric default 0,
  add column if not exists applies_to text default 'deposit',
  add column if not exists max_uses integer,
  add column if not exists used_count integer default 0,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists is_active boolean default true,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.discount_codes
  alter column id set default gen_random_uuid(),
  alter column discount_type set default 'percent',
  alter column discount_value set default 0,
  alter column applies_to set default 'deposit',
  alter column used_count set default 0,
  alter column is_active set default true,
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'discount_codes_discount_type_check'
      and conrelid = 'public.discount_codes'::regclass
  ) then
    alter table public.discount_codes
      add constraint discount_codes_discount_type_check
      check (discount_type in ('percent', 'fixed'))
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'discount_codes_applies_to_check'
      and conrelid = 'public.discount_codes'::regclass
  ) then
    alter table public.discount_codes
      add constraint discount_codes_applies_to_check
      check (applies_to in ('deposit'))
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'discount_codes_value_check'
      and conrelid = 'public.discount_codes'::regclass
  ) then
    alter table public.discount_codes
      add constraint discount_codes_value_check
      check (
        discount_value >= 0
        and (
          discount_type <> 'percent'
          or discount_value <= 100
        )
      )
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'discount_codes_uses_check'
      and conrelid = 'public.discount_codes'::regclass
  ) then
    alter table public.discount_codes
      add constraint discount_codes_uses_check
      check (
        used_count >= 0
        and (
          max_uses is null
          or max_uses >= 0
        )
        and (
          max_uses is null
          or used_count <= max_uses
        )
      )
      not valid;
  end if;
end $$;

create unique index if not exists discount_codes_lower_code_unique
  on public.discount_codes (lower(code));

create index if not exists discount_codes_active_idx
  on public.discount_codes (is_active, valid_from, valid_until);

with owner_user as (
  select id
  from auth.users
  where lower(email) = 'contacto@ondamultimedia.com'
  limit 1
)
insert into public.discount_codes (
  code,
  description,
  discount_type,
  discount_value,
  applies_to,
  is_active,
  created_by
)
select
  'ONDA100',
  'Cubre el 100% del abono de reserva.',
  'percent',
  100,
  'deposit',
  true,
  owner_user.id
from owner_user
where not exists (
  select 1
  from public.discount_codes discount_code
  where lower(discount_code.code) = 'onda100'
);

insert into public.discount_codes (
  code,
  description,
  discount_type,
  discount_value,
  applies_to,
  is_active
)
select
  'ONDA100',
  'Cubre el 100% del abono de reserva.',
  'percent',
  100,
  'deposit',
  true
where not exists (
  select 1
  from public.discount_codes discount_code
  where lower(discount_code.code) = 'onda100'
);

alter table public.bookings
  add column if not exists payment_provider text,
  add column if not exists payment_reference text,
  add column if not exists payment_validation_code text,
  add column if not exists payment_transaction_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_hold_expires_at timestamptz,
  add column if not exists discount_code_id uuid,
  add column if not exists discount_code text,
  add column if not exists discount_amount numeric not null default 0,
  add column if not exists discount_percent numeric,
  add column if not exists deposit_amount_before_discount numeric,
  add column if not exists deposit_amount_due numeric;

alter table public.bookings
  alter column discount_amount set default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_discount_code_id_fkey'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_discount_code_id_fkey
      foreign key (discount_code_id) references public.discount_codes(id) on delete set null
      not valid;
  end if;
end $$;

update public.bookings
set
  status = 'rejected',
  payment_status = 'failed'
where status = 'payment_failed';

update public.bookings
set payment_status = 'waived'
where payment_status = 'not_required';

update public.bookings
set
  deposit_amount_before_discount = coalesce(deposit_amount_before_discount, deposit_amount),
  deposit_amount_due = coalesce(deposit_amount_due, deposit_amount, 0),
  discount_amount = coalesce(discount_amount, 0),
  payment_status = coalesce(nullif(payment_status, ''), 'unpaid'),
  currency = coalesce(nullif(currency, ''), 'CLP')
where true;

alter table public.bookings
  drop constraint if exists bookings_payment_status_check;

alter table public.bookings
  add constraint bookings_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'waived'))
  not valid;

alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending_payment', 'pending', 'confirmed', 'completed', 'cancelled', 'rejected'))
  not valid;

create index if not exists bookings_payment_status_idx
  on public.bookings (payment_status, payment_provider, paid_at);

create index if not exists bookings_hold_expiry_idx
  on public.bookings (payment_hold_expires_at)
  where status = 'pending_payment';

create table if not exists public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  client_id uuid references auth.users(id) on delete set null,
  provider text not null default 'mercado_pago',
  amount numeric not null default 0,
  currency text not null default 'CLP',
  status text not null default 'pending',
  validation_code text,
  transaction_id text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.booking_payments
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists booking_id uuid,
  add column if not exists client_id uuid,
  add column if not exists provider text default 'mercado_pago',
  add column if not exists amount numeric default 0,
  add column if not exists currency text default 'CLP',
  add column if not exists status text default 'pending',
  add column if not exists validation_code text,
  add column if not exists transaction_id text,
  add column if not exists raw_payload jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists paid_at timestamptz;

alter table public.booking_payments
  alter column id set default gen_random_uuid(),
  alter column provider set default 'mercado_pago',
  alter column amount set default 0,
  alter column currency set default 'CLP',
  alter column status set default 'pending',
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_payments_booking_id_fkey'
      and conrelid = 'public.booking_payments'::regclass
  ) then
    alter table public.booking_payments
      add constraint booking_payments_booking_id_fkey
      foreign key (booking_id) references public.bookings(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_payments_client_id_fkey'
      and conrelid = 'public.booking_payments'::regclass
  ) then
    alter table public.booking_payments
      add constraint booking_payments_client_id_fkey
      foreign key (client_id) references auth.users(id) on delete set null
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_payments_status_check'
      and conrelid = 'public.booking_payments'::regclass
  ) then
    alter table public.booking_payments
      add constraint booking_payments_status_check
      check (status in ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'waived'))
      not valid;
  end if;
end $$;

create index if not exists booking_payments_booking_idx
  on public.booking_payments (booking_id, created_at desc);

create index if not exists booking_payments_client_idx
  on public.booking_payments (client_id, created_at desc);

create table if not exists public.booking_email_recipients (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  client_id uuid references auth.users(id) on delete set null,
  recipient_email text not null,
  recipient_name text,
  template_key text not null,
  event_type text not null,
  payment_status text,
  booking_status text,
  total_amount numeric,
  deposit_amount numeric,
  discount_code text,
  discount_amount numeric,
  currency text,
  payment_validation_code text,
  payment_reference text,
  payment_transaction_id text,
  template_variables jsonb not null default '{}'::jsonb,
  reach_sync_status text not null default 'pending',
  reach_contact_id text,
  last_synced_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_email_recipients
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists booking_id uuid,
  add column if not exists client_id uuid,
  add column if not exists recipient_email text,
  add column if not exists recipient_name text,
  add column if not exists template_key text,
  add column if not exists event_type text,
  add column if not exists payment_status text,
  add column if not exists booking_status text,
  add column if not exists total_amount numeric,
  add column if not exists deposit_amount numeric,
  add column if not exists discount_code text,
  add column if not exists discount_amount numeric,
  add column if not exists currency text,
  add column if not exists payment_validation_code text,
  add column if not exists payment_reference text,
  add column if not exists payment_transaction_id text,
  add column if not exists template_variables jsonb default '{}'::jsonb,
  add column if not exists reach_sync_status text default 'pending',
  add column if not exists reach_contact_id text,
  add column if not exists last_synced_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.booking_email_recipients
  alter column id set default gen_random_uuid(),
  alter column template_variables set default '{}'::jsonb,
  alter column reach_sync_status set default 'pending',
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_email_recipients_booking_id_fkey'
      and conrelid = 'public.booking_email_recipients'::regclass
  ) then
    alter table public.booking_email_recipients
      add constraint booking_email_recipients_booking_id_fkey
      foreign key (booking_id) references public.bookings(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_email_recipients_client_id_fkey'
      and conrelid = 'public.booking_email_recipients'::regclass
  ) then
    alter table public.booking_email_recipients
      add constraint booking_email_recipients_client_id_fkey
      foreign key (client_id) references auth.users(id) on delete set null
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_email_recipients_event_type_check'
      and conrelid = 'public.booking_email_recipients'::regclass
  ) then
    alter table public.booking_email_recipients
      add constraint booking_email_recipients_event_type_check
      check (event_type in ('booking_confirmed', 'booking_cancelled'))
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_email_recipients_reach_status_check'
      and conrelid = 'public.booking_email_recipients'::regclass
  ) then
    alter table public.booking_email_recipients
      add constraint booking_email_recipients_reach_status_check
      check (reach_sync_status in ('pending', 'synced', 'sent', 'failed', 'skipped'))
      not valid;
  end if;
end $$;

create unique index if not exists booking_email_recipients_unique
  on public.booking_email_recipients (booking_id, recipient_email, event_type, template_key);

create index if not exists booking_email_recipients_reach_status_idx
  on public.booking_email_recipients (reach_sync_status, created_at);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  client_id uuid references auth.users(id) on delete set null,
  recipient_email text,
  recipient_name text,
  template_key text,
  provider text not null default 'hostinger_reach',
  provider_message_id text,
  status text not null default 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_logs
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists booking_id uuid,
  add column if not exists client_id uuid,
  add column if not exists recipient_email text,
  add column if not exists recipient_name text,
  add column if not exists template_key text,
  add column if not exists provider text default 'hostinger_reach',
  add column if not exists provider_message_id text,
  add column if not exists status text default 'pending',
  add column if not exists error_message text,
  add column if not exists sent_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.email_logs
  alter column id set default gen_random_uuid(),
  alter column provider set default 'hostinger_reach',
  alter column status set default 'pending',
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'email_logs_status_check'
      and conrelid = 'public.email_logs'::regclass
  ) then
    alter table public.email_logs
      add constraint email_logs_status_check
      check (status in ('pending', 'synced', 'sent', 'failed', 'skipped'))
      not valid;
  end if;
end $$;

create index if not exists email_logs_booking_idx
  on public.email_logs (booking_id, created_at desc);

create index if not exists email_logs_status_idx
  on public.email_logs (provider, status, created_at);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_discount_codes_updated_at') then
    create trigger set_discount_codes_updated_at
      before update on public.discount_codes
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_booking_payments_updated_at') then
    create trigger set_booking_payments_updated_at
      before update on public.booking_payments
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_booking_email_recipients_updated_at') then
    create trigger set_booking_email_recipients_updated_at
      before update on public.booking_email_recipients
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_email_logs_updated_at') then
    create trigger set_email_logs_updated_at
      before update on public.email_logs
      for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.discount_codes enable row level security;
alter table public.booking_payments enable row level security;
alter table public.booking_email_recipients enable row level security;
alter table public.email_logs enable row level security;

grant select, insert, update, delete on public.discount_codes to authenticated;
grant select, insert, update, delete on public.booking_payments to authenticated;
grant select, insert, update, delete on public.booking_email_recipients to authenticated;
grant select, insert, update, delete on public.email_logs to authenticated;

drop policy if exists "discount codes owner manage" on public.discount_codes;
drop policy if exists "booking payments select own or admin" on public.booking_payments;
drop policy if exists "booking payments admin manage" on public.booking_payments;
drop policy if exists "booking email recipients admin manage" on public.booking_email_recipients;
drop policy if exists "email logs admin manage" on public.email_logs;

create policy "discount codes owner manage"
  on public.discount_codes
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "booking payments select own or admin"
  on public.booking_payments
  for select
  to authenticated
  using (client_id = auth.uid() or public.is_admin());

create policy "booking payments admin manage"
  on public.booking_payments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "booking email recipients admin manage"
  on public.booking_email_recipients
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "email logs admin manage"
  on public.email_logs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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
    'onda_contact_email', 'contacto@ondamultimedia.com'
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

drop function if exists public.cancel_own_booking(uuid);

create or replace function public.cancel_own_booking(p_booking_id uuid)
returns table (
  id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
begin
  if auth.uid() is null then
    raise exception 'Invalid client session.' using errcode = '42501';
  end if;

  update public.bookings booking
  set status = 'cancelled',
      updated_at = now()
  where booking.id = p_booking_id
    and booking.client_id = auth.uid()
    and booking.status in ('pending', 'confirmed')
  returning booking.id, booking.status
  into v_booking;

  if not found then
    raise exception 'Booking cannot be cancelled.' using errcode = '22023';
  end if;

  return query select v_booking.id, v_booking.status;
end;
$$;

revoke all on function public.cancel_own_booking(uuid) from public;
grant execute on function public.cancel_own_booking(uuid) to authenticated;

drop function if exists public.expire_stale_pending_payment_bookings();

create or replace function public.expire_stale_pending_payment_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.bookings booking
  set status = 'cancelled',
      payment_status = case
        when booking.payment_status = 'pending' then 'failed'
        else booking.payment_status
      end,
      updated_at = now()
  where booking.status = 'pending_payment'
    and booking.payment_hold_expires_at is not null
    and booking.payment_hold_expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_stale_pending_payment_bookings() from public;
grant execute on function public.expire_stale_pending_payment_bookings() to authenticated;

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
    and public.booking_blocks_availability(b.status, b.payment_hold_expires_at)
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

drop function if exists public.preview_booking_discount(uuid, integer, text);

create or replace function public.preview_booking_discount(
  p_service_id uuid,
  p_slot_count integer default 1,
  p_discount_code text default null
)
returns table (
  total_amount numeric,
  deposit_amount numeric,
  deposit_amount_due numeric,
  discount_amount numeric,
  discount_percent numeric,
  currency text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_service public.booking_services%rowtype;
  v_discount public.discount_codes%rowtype;
  v_discount_code text := upper(nullif(btrim(coalesce(p_discount_code, '')), ''));
  v_slot_count integer := greatest(coalesce(p_slot_count, 1), 1);
  v_total_amount numeric := 0;
  v_deposit_amount numeric := 0;
  v_discount_amount numeric := 0;
  v_discount_percent numeric := null;
begin
  if auth.uid() is null then
    raise exception 'Invalid client session.' using errcode = '42501';
  end if;

  if v_discount_code is null then
    raise exception 'Discount code is required.' using errcode = '22023';
  end if;

  select *
  into v_service
  from public.booking_services
  where id = p_service_id
    and is_active is true;

  if not found then
    raise exception 'Booking service is not available.' using errcode = '22023';
  end if;

  select *
  into v_discount
  from public.discount_codes discount_code
  where lower(discount_code.code) = lower(v_discount_code);

  if not found
    or v_discount.is_active is not true
    or v_discount.applies_to <> 'deposit'
    or (v_discount.valid_from is not null and v_discount.valid_from > now())
    or (v_discount.valid_until is not null and v_discount.valid_until < now())
    or (v_discount.max_uses is not null and v_discount.used_count >= v_discount.max_uses)
  then
    raise exception 'Invalid, expired or exhausted discount code.' using errcode = '22023';
  end if;

  v_total_amount := coalesce(v_service.price_per_slot, 0) * v_slot_count;
  v_deposit_amount := round(v_total_amount * coalesce(v_service.deposit_percent, 50) / 100, 0);

  if v_discount.discount_type = 'percent' then
    v_discount_percent := least(greatest(coalesce(v_discount.discount_value, 0), 0), 100);
    v_discount_amount := round(v_deposit_amount * v_discount_percent / 100, 0);
  else
    v_discount_amount := least(coalesce(v_discount.discount_value, 0), v_deposit_amount);
  end if;

  v_discount_amount := least(greatest(coalesce(v_discount_amount, 0), 0), v_deposit_amount);

  return query
  select
    v_total_amount,
    v_deposit_amount,
    greatest(v_deposit_amount - v_discount_amount, 0),
    v_discount_amount,
    v_discount_percent,
    coalesce(nullif(v_service.currency, ''), 'CLP');
end;
$$;

revoke all on function public.preview_booking_discount(uuid, integer, text) from public;
grant execute on function public.preview_booking_discount(uuid, integer, text) to authenticated;

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
    update public.discount_codes
    set used_count = used_count + 1
    where id = v_discount.id;
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
      least(greatest(coalesce(p_limit, 80), 1), 5000) as result_limit
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
    where public.booking_blocks_availability(booking.status, booking.payment_hold_expires_at)
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
),
yessie as (
  select id
  from public.producers
  where lower(name) = 'yessie neira'
  limit 1
)
insert into public.availability_rules (
  group_id,
  service_id,
  studio_id,
  producer_id,
  weekday,
  weekdays,
  start_time,
  end_time,
  slot_minutes,
  is_active
)
select
  '00000000-0000-0000-0000-0000000a1110'::uuid,
  meeting_services.id,
  neexworks.id,
  yessie.id,
  0,
  array[0, 1, 2, 3, 4, 5, 6],
  '00:00'::time,
  '23:59'::time,
  45,
  true
from meeting_services
cross join neexworks
cross join yessie
where not exists (
  select 1
  from public.availability_rules rule
  where rule.service_id = meeting_services.id
    and rule.studio_id = neexworks.id
    and rule.producer_id = yessie.id
    and rule.weekdays = array[0, 1, 2, 3, 4, 5, 6]
    and rule.start_time = '00:00'::time
    and rule.end_time = '23:59'::time
    and rule.slot_minutes = 45
);

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
),
yessie as (
  select id
  from public.producers
  where lower(name) = 'yessie neira'
  limit 1
)
insert into public.availability_exceptions (
  group_id,
  service_id,
  studio_id,
  producer_id,
  exception_date,
  date_from,
  date_to,
  weekdays,
  start_time,
  end_time,
  type,
  reason
)
select
  '00000000-0000-0000-0000-0000000a1111'::uuid,
  meeting_services.id,
  neexworks.id,
  yessie.id,
  current_date,
  current_date,
  null::date,
  array[1, 2, 3, 4, 5],
  '08:00'::time,
  '17:30'::time,
  'blocked',
  'Trabajo'
from meeting_services
cross join neexworks
cross join yessie
where not exists (
  select 1
  from public.availability_exceptions exception
  where exception.type = 'blocked'
    and exception.service_id = meeting_services.id
    and exception.studio_id = neexworks.id
    and exception.producer_id = yessie.id
    and exception.date_to is null
    and exception.weekdays = array[1, 2, 3, 4, 5]
    and exception.start_time = '08:00'::time
    and exception.end_time = '17:30'::time
);

create or replace view public.reach_booking_contacts_export as
select
  recipient_email,
  recipient_name,
  template_key,
  event_type,
  booking_id,
  client_id,
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
  reach_sync_status,
  reach_contact_id,
  last_synced_at,
  sent_at,
  created_at
from public.booking_email_recipients
where public.is_admin();

grant select on public.reach_booking_contacts_export to authenticated;

comment on table public.discount_codes is
  'Owner-managed discount codes. Validated only by secure RPC/backend code.';

comment on table public.booking_email_recipients is
  'Queue/export table for Hostinger Reach booking confirmation and cancellation contacts.';

comment on table public.email_logs is
  'Transactional email sync/send log. Provider credentials must live in backend or Edge Function secrets.';

notify pgrst, 'reload schema';
