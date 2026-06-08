alter table public.events
  add column if not exists event_gallery jsonb not null default '{}'::jsonb,
  add column if not exists gallery_photos jsonb not null default '[]'::jsonb,
  add column if not exists youtube_video_urls jsonb not null default '[]'::jsonb,
  add column if not exists instagram_reel_urls jsonb not null default '[]'::jsonb,
  add column if not exists aftermovie_url text,
  add column if not exists external_links jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_event_gallery_object_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_event_gallery_object_check
      check (jsonb_typeof(event_gallery) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'events_gallery_photos_array_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_gallery_photos_array_check
      check (jsonb_typeof(gallery_photos) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'events_youtube_video_urls_array_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_youtube_video_urls_array_check
      check (jsonb_typeof(youtube_video_urls) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'events_instagram_reel_urls_array_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_instagram_reel_urls_array_check
      check (jsonb_typeof(instagram_reel_urls) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'events_external_links_array_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_external_links_array_check
      check (jsonb_typeof(external_links) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'events_aftermovie_url_http_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_aftermovie_url_http_check
      check (aftermovie_url is null or aftermovie_url ~* '^https?://');
  end if;
end $$;
