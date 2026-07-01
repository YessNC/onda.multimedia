alter table public.events
add column if not exists producer_name text default 'ONDA Multimedia';

update public.events
set producer_name = 'ONDA Multimedia'
where producer_name is null;

update public.events
set producer_name = 'ONDA Multimedia x Martes de Alika'
where event_date = '2026-06-04';

update public.events
set producer_name = 'ONDA Multimedia'
where event_date = '2026-07-15';