alter table public.admin_users
  add column if not exists role text;

alter table public.producers
  add column if not exists role_description text,
  add column if not exists user_id uuid;

alter table public.files
  add column if not exists team_member_id uuid,
  add column if not exists title text,
  add column if not exists description text;

do $$
begin
  if to_regclass('public.producers') is not null
    and not exists (
      select 1
      from pg_constraint
      where conname = 'producers_user_id_fkey'
        and conrelid = 'public.producers'::regclass
    )
  then
    alter table public.producers
      add constraint producers_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete set null
      not valid;
  end if;

  if to_regclass('public.files') is not null
    and not exists (
      select 1
      from pg_constraint
      where conname = 'files_team_member_id_fkey'
        and conrelid = 'public.files'::regclass
    )
  then
    alter table public.files
      add constraint files_team_member_id_fkey
      foreign key (team_member_id) references public.producers(id) on delete set null
      not valid;
  end if;

  if to_regclass('public.admin_users') is not null
    and not exists (
      select 1
      from pg_constraint
      where conname = 'admin_users_role_check'
        and conrelid = 'public.admin_users'::regclass
    )
  then
    alter table public.admin_users
      add constraint admin_users_role_check
      check (role is null or role in ('owner', 'admin', 'producer', 'visual_team', 'operations', 'viewer'))
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
      'other'
    )
  )
  not valid;

create index if not exists producers_user_id_idx
  on public.producers (user_id)
  where user_id is not null;

create index if not exists admin_users_role_idx
  on public.admin_users (role)
  where role is not null;

create index if not exists files_team_member_uploaded_idx
  on public.files (team_member_id, uploaded_at desc)
  where team_member_id is not null;

create index if not exists files_booking_uploaded_idx
  on public.files (booking_id, uploaded_at desc)
  where booking_id is not null;

comment on column public.producers.role is
  'Descriptive internal team role only. Admin permissions must come from public.admin_users.';

comment on column public.producers.role_description is
  'Human-readable explanation of the internal team role.';

comment on column public.producers.user_id is
  'Nullable future link to auth.users. This link does not grant admin access.';

comment on column public.admin_users.role is
  'Future permission role. Until granular checks exist, public.is_admin() only requires an active admin_users row.';

comment on column public.files.team_member_id is
  'Optional uploader/team relationship for future client deliverables; references public.producers as the technical team table.';

with seed(name, specialty, role, role_description) as (
  values
    (
      'Giovan-E',
      'Produccion musical',
      'Productor musical',
      'Responsable de produccion musical, grabacion, direccion de sesion y acompanamiento creativo en estudio. En una etapa posterior podra subir masters, mezclas y entregables musicales al panel del cliente correspondiente si cuenta con permisos operativos.'
    ),
    (
      'Zeta',
      'Produccion musical',
      'Productor musical',
      'Responsable de produccion musical, grabacion y desarrollo sonoro de sesiones en estudio. En una etapa posterior podra subir masters, mezclas y entregables musicales al panel del cliente correspondiente si cuenta con permisos operativos.'
    ),
    (
      'Yessie',
      'Gestion, estrategia y tecnologia',
      'CEO / CTO',
      'Chief Executive Officer / Chief Technology Officer. Responsable de direccion general, estrategia, gestion del proyecto, desarrollo tecnologico y operacion digital de Onda Multimedia.'
    ),
    (
      'Raul',
      'Direccion creativa y operaciones',
      'CCO / COO',
      'Chief Creative Officer / Chief Operating Officer. Responsable de direccion creativa, coordinacion operativa, desarrollo de experiencias y funcionamiento general de proyectos.'
    ),
    (
      'Onda Visual',
      'Foto y video',
      'Equipo audiovisual',
      'Area audiovisual temporal de Onda Multimedia para servicios de fotografia, video, registro de eventos y contenido visual. Se mantendra como equipo generico mientras se confirman las personas responsables del area. En una etapa posterior, los miembros autorizados del area podran subir fotos, videos y entregables audiovisuales al panel del cliente correspondiente.'
    )
)
update public.producers producer
set
  specialty = seed.specialty,
  role = seed.role,
  role_description = seed.role_description
from seed
where lower(producer.name) = lower(seed.name);

with seed(name, specialty, role, role_description) as (
  values
    (
      'Giovan-E',
      'Produccion musical',
      'Productor musical',
      'Responsable de produccion musical, grabacion, direccion de sesion y acompanamiento creativo en estudio. En una etapa posterior podra subir masters, mezclas y entregables musicales al panel del cliente correspondiente si cuenta con permisos operativos.'
    ),
    (
      'Zeta',
      'Produccion musical',
      'Productor musical',
      'Responsable de produccion musical, grabacion y desarrollo sonoro de sesiones en estudio. En una etapa posterior podra subir masters, mezclas y entregables musicales al panel del cliente correspondiente si cuenta con permisos operativos.'
    ),
    (
      'Yessie',
      'Gestion, estrategia y tecnologia',
      'CEO / CTO',
      'Chief Executive Officer / Chief Technology Officer. Responsable de direccion general, estrategia, gestion del proyecto, desarrollo tecnologico y operacion digital de Onda Multimedia.'
    ),
    (
      'Raul',
      'Direccion creativa y operaciones',
      'CCO / COO',
      'Chief Creative Officer / Chief Operating Officer. Responsable de direccion creativa, coordinacion operativa, desarrollo de experiencias y funcionamiento general de proyectos.'
    ),
    (
      'Onda Visual',
      'Foto y video',
      'Equipo audiovisual',
      'Area audiovisual temporal de Onda Multimedia para servicios de fotografia, video, registro de eventos y contenido visual. Se mantendra como equipo generico mientras se confirman las personas responsables del area. En una etapa posterior, los miembros autorizados del area podran subir fotos, videos y entregables audiovisuales al panel del cliente correspondiente.'
    )
)
insert into public.producers (name, specialty, role, role_description, is_active)
select seed.name, seed.specialty, seed.role, seed.role_description, true
from seed
where not exists (
  select 1
  from public.producers producer
  where lower(producer.name) = lower(seed.name)
);

notify pgrst, 'reload schema';
