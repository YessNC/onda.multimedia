create extension if not exists "pgcrypto";

alter table public.events
  add column if not exists cover_image_path text;

create table if not exists public.event_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  bucket text not null default 'event-images',
  path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  is_cover boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

alter table public.event_images
  add column if not exists event_id uuid references public.events(id) on delete cascade,
  add column if not exists bucket text not null default 'event-images',
  add column if not exists path text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint not null default 0,
  add column if not exists is_cover boolean not null default false,
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null,
  add column if not exists uploaded_at timestamptz not null default now();

create index if not exists event_images_event_uploaded_idx
  on public.event_images (event_id, uploaded_at desc);

create unique index if not exists event_images_bucket_path_idx
  on public.event_images (bucket, path);

alter table public.event_images enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_images'
      and policyname = 'event images select authenticated'
  ) then
    create policy "event images select authenticated"
      on public.event_images
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_images'
      and policyname = 'event images insert authenticated'
  ) then
    create policy "event images insert authenticated"
      on public.event_images
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_images'
      and policyname = 'event images update authenticated'
  ) then
    create policy "event images update authenticated"
      on public.event_images
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

insert into storage.buckets (id, name, "public", file_size_limit, allowed_mime_types)
values
  ('event-images', 'event-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
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
      and policyname = 'event images select public'
  ) then
    create policy "event images select public"
      on storage.objects
      for select
      to public
      using (bucket_id = 'event-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'event images insert authenticated'
  ) then
    create policy "event images insert authenticated"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'event-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'event images update authenticated'
  ) then
    create policy "event images update authenticated"
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'event-images')
      with check (bucket_id = 'event-images');
  end if;
end $$;
