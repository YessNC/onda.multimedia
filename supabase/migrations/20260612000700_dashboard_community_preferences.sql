alter table public.profiles
  add column if not exists email text,
  add column if not exists terms_accepted boolean default false,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_source text,
  add column if not exists community_consent boolean default false,
  add column if not exists community_consent_at timestamptz,
  add column if not exists community_consent_source text,
  add column if not exists community_consent_revoked_at timestamptz;

update public.profiles profile
set email = lower(auth_user.email)
from auth.users auth_user
where profile.id = auth_user.id
  and nullif(profile.email, '') is null
  and nullif(auth_user.email, '') is not null;

update public.profiles
set terms_accepted = false
where terms_accepted is null;

update public.profiles
set community_consent = false
where community_consent is null;

alter table public.profiles
  alter column terms_accepted set default false,
  alter column terms_accepted set not null,
  alter column community_consent set default false,
  alter column community_consent set not null;

create index if not exists profiles_community_consent_email_idx
  on public.profiles (lower(email))
  where community_consent is true
    and email is not null;

alter table public.profiles enable row level security;

grant select, insert, update on public.profiles to authenticated;

drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;

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

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do update
  set
    email = coalesce(lower(excluded.email), public.profiles.email),
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    phone = coalesce(public.profiles.phone, excluded.phone),
    updated_at = now();

  return new;
end;
$$;

create or replace function public.get_dashboard_community_preferences()
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  terms_accepted boolean,
  terms_accepted_at timestamptz,
  terms_source text,
  community_consent boolean,
  community_consent_at timestamptz,
  community_consent_source text,
  community_consent_revoked_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado.' using errcode = '42501';
  end if;

  select *
  into v_user
  from auth.users
  where auth.users.id = auth.uid();

  if not found then
    raise exception 'Usuario no encontrado.' using errcode = 'P0002';
  end if;

  insert into public.profiles (id, email, full_name, phone)
  values (
    v_user.id,
    lower(v_user.email),
    coalesce(v_user.raw_user_meta_data ->> 'full_name', ''),
    v_user.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do update
  set
    email = coalesce(lower(excluded.email), public.profiles.email),
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    phone = coalesce(public.profiles.phone, excluded.phone),
    updated_at = now();

  return query
  select
    profile.id,
    coalesce(profile.email, lower(v_user.email)),
    profile.full_name,
    profile.phone,
    coalesce(profile.terms_accepted, false),
    profile.terms_accepted_at,
    profile.terms_source,
    coalesce(profile.community_consent, false),
    profile.community_consent_at,
    profile.community_consent_source,
    profile.community_consent_revoked_at,
    profile.created_at,
    profile.updated_at
  from public.profiles profile
  where profile.id = auth.uid();
end;
$$;

create or replace function public.update_dashboard_community_preferences(
  p_accept_terms boolean default false,
  p_community_consent boolean default null
)
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  terms_accepted boolean,
  terms_accepted_at timestamptz,
  terms_source text,
  community_consent boolean,
  community_consent_at timestamptz,
  community_consent_source text,
  community_consent_revoked_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_now timestamptz := now();
  v_user auth.users%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado.' using errcode = '42501';
  end if;

  select *
  into v_user
  from auth.users
  where auth.users.id = auth.uid();

  if not found then
    raise exception 'Usuario no encontrado.' using errcode = 'P0002';
  end if;

  perform *
  from public.get_dashboard_community_preferences();

  select *
  into v_profile
  from public.profiles
  where public.profiles.id = auth.uid()
  for update;

  if p_community_consent is true
    and coalesce(v_profile.terms_accepted, false) is false
    and coalesce(p_accept_terms, false) is false
  then
    raise exception 'TERMS_REQUIRED' using errcode = '23514';
  end if;

  update public.profiles profile
  set
    email = coalesce(lower(v_user.email), profile.email),
    terms_accepted = case
      when coalesce(p_accept_terms, false) is true then true
      else coalesce(profile.terms_accepted, false)
    end,
    terms_accepted_at = case
      when coalesce(p_accept_terms, false) is true and profile.terms_accepted_at is null then v_now
      else profile.terms_accepted_at
    end,
    terms_source = case
      when coalesce(p_accept_terms, false) is true and profile.terms_source is null then 'dashboard'
      else profile.terms_source
    end,
    community_consent = case
      when p_community_consent is null then coalesce(profile.community_consent, false)
      else p_community_consent
    end,
    community_consent_at = case
      when p_community_consent is true and coalesce(profile.community_consent, false) is false then v_now
      when p_community_consent is true then coalesce(profile.community_consent_at, v_now)
      else profile.community_consent_at
    end,
    community_consent_source = case
      when p_community_consent is true then 'dashboard'
      else profile.community_consent_source
    end,
    community_consent_revoked_at = case
      when p_community_consent is false and coalesce(profile.community_consent, false) is true then v_now
      when p_community_consent is true then null
      else profile.community_consent_revoked_at
    end,
    updated_at = v_now
  where profile.id = auth.uid();

  return query
  select *
  from public.get_dashboard_community_preferences();
end;
$$;

revoke all on function public.get_dashboard_community_preferences() from public;
revoke all on function public.update_dashboard_community_preferences(boolean, boolean) from public;

grant execute on function public.get_dashboard_community_preferences() to authenticated;
grant execute on function public.update_dashboard_community_preferences(boolean, boolean) to authenticated;

notify pgrst, 'reload schema';
