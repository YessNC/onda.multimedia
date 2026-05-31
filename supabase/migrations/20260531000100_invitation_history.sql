create extension if not exists "pgcrypto";

alter table public.events
  add column if not exists invitation_template_bucket text not null default 'invitation-templates',
  add column if not exists invitation_template_path text,
  add column if not exists invitation_qr_x integer,
  add column if not exists invitation_qr_y integer,
  add column if not exists invitation_qr_width integer,
  add column if not exists invitation_qr_height integer;

alter table public.event_attendees
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists full_name text not null default '',
  add column if not exists email text,
  add column if not exists instagram_handle text,
  add column if not exists phone text,
  add column if not exists guest_type text,
  add column if not exists notes text,
  add column if not exists qr_token text,
  add column if not exists invitation_generated_at timestamptz;

create unique index if not exists event_attendees_qr_token_idx
  on public.event_attendees (qr_token)
  where qr_token is not null;

create table if not exists public.generated_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  attendee_id uuid not null references public.event_attendees(id) on delete cascade,
  template_bucket text not null default 'invitation-templates',
  template_path text not null,
  bucket text not null default 'generated-invitations',
  path text not null,
  qr_token text not null,
  qr_payload text not null,
  qr_x integer not null,
  qr_y integer not null,
  qr_width integer not null,
  qr_height integer not null,
  file_name text not null,
  mime_type text not null default 'image/png',
  size_bytes bigint not null default 0,
  generated_by uuid references auth.users(id) on delete set null,
  generated_at timestamptz not null default now(),
  downloaded_at timestamptz,
  downloaded_by uuid references auth.users(id) on delete set null,
  download_count integer not null default 0,
  delivery_channel text,
  notes text
);

alter table public.generated_invitations
  add column if not exists event_id uuid,
  add column if not exists attendee_id uuid,
  add column if not exists template_bucket text not null default 'invitation-templates',
  add column if not exists template_path text,
  add column if not exists bucket text not null default 'generated-invitations',
  add column if not exists path text,
  add column if not exists qr_token text,
  add column if not exists qr_payload text,
  add column if not exists qr_x integer,
  add column if not exists qr_y integer,
  add column if not exists qr_width integer,
  add column if not exists qr_height integer,
  add column if not exists file_name text,
  add column if not exists mime_type text not null default 'image/png',
  add column if not exists size_bytes bigint not null default 0,
  add column if not exists generated_by uuid references auth.users(id) on delete set null,
  add column if not exists generated_at timestamptz not null default now(),
  add column if not exists downloaded_at timestamptz,
  add column if not exists downloaded_by uuid references auth.users(id) on delete set null,
  add column if not exists download_count integer not null default 0,
  add column if not exists delivery_channel text,
  add column if not exists notes text;

create index if not exists generated_invitations_event_attendee_idx
  on public.generated_invitations (event_id, attendee_id, generated_at desc);

create unique index if not exists generated_invitations_path_idx
  on public.generated_invitations (bucket, path);

alter table public.generated_invitations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'generated_invitations'
      and policyname = 'generated invitations select authenticated'
  ) then
    create policy "generated invitations select authenticated"
      on public.generated_invitations
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'generated_invitations'
      and policyname = 'generated invitations insert authenticated'
  ) then
    create policy "generated invitations insert authenticated"
      on public.generated_invitations
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'generated_invitations'
      and policyname = 'generated invitations update authenticated'
  ) then
    create policy "generated invitations update authenticated"
      on public.generated_invitations
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

insert into storage.buckets (id, name, "public", file_size_limit, allowed_mime_types)
values
  ('invitation-templates', 'invitation-templates', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('generated-invitations', 'generated-invitations', false, 10485760, array['image/png'])
on conflict (id) do update
set
  "public" = excluded."public",
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'invitation templates select authenticated'
  ) then
    create policy "invitation templates select authenticated"
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'invitation-templates');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'invitation templates insert authenticated'
  ) then
    create policy "invitation templates insert authenticated"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'invitation-templates');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'invitation templates update authenticated'
  ) then
    create policy "invitation templates update authenticated"
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'invitation-templates')
      with check (bucket_id = 'invitation-templates');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'generated invitations select authenticated'
  ) then
    create policy "generated invitations select authenticated"
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'generated-invitations');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'generated invitations insert authenticated'
  ) then
    create policy "generated invitations insert authenticated"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'generated-invitations');
  end if;
end $$;
