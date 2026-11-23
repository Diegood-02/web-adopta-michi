-- Tu Michi Adopción · esquema, seguridad (RLS) y datos iniciales.
-- Se ejecuta una sola vez en el SQL Editor de Supabase (o con la CLI). Es idempotente.
-- IMPORTANTE: este archivo NO contiene correos de administradores. Se agregan aparte (ver supabase/README.md).

-- ============ Administradores ============
-- Tabla con RLS activa y SIN políticas: nadie puede leerla ni escribirla desde la API pública.
create table if not exists public.admin_emails (
  email text primary key check (email = lower(email))
);
alter table public.admin_emails enable row level security;
revoke all on public.admin_emails from anon, authenticated;

-- ¿La sesión actual es de un administrador? Se decide por el correo del token (ya verificado por Supabase Auth).
create or replace function public.es_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_emails a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;

-- Cambiar de administrador (solo desde el SQL Editor / service role):
create or replace function public.cambiar_admin(anterior text, nuevo text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if anterior is not null then
    delete from public.admin_emails where email = lower(anterior);
  end if;
  if nuevo is not null then
    insert into public.admin_emails(email) values (lower(nuevo)) on conflict do nothing;
  end if;
end $$;
revoke all on function public.cambiar_admin(text, text) from public, anon, authenticated;

-- ============ Gatos ============
create table if not exists public.gatos (
  id bigint generated always as identity primary key,
  nombre text not null check (char_length(nombre) between 1 and 60),
  edad int not null check (edad between 1 and 240),
  sexo text not null check (sexo in ('Macho','Hembra')),
  personalidad text not null check (personalidad in ('Cariñoso','Curioso','Juguetón','Tranquilo')),
  descripcion text not null check (char_length(descripcion) between 1 and 500),
  historia text not null check (char_length(historia) between 1 and 500),
  imagen int not null default 1 check (imagen between 1 and 8),
  estado text not null default 'disponible' check (estado in ('disponible','adoptado','archivado','borrador')),
  vacunas boolean not null default false,
  esterilizado boolean not null default false,
  desparasitado boolean not null default false,
  creado timestamptz not null default now()
);
alter table public.gatos enable row level security;

drop policy if exists gatos_leer on public.gatos;
create policy gatos_leer on public.gatos for select
  using (estado <> 'borrador' or public.es_admin());
drop policy if exists gatos_admin_insertar on public.gatos;
create policy gatos_admin_insertar on public.gatos for insert with check (public.es_admin());
drop policy if exists gatos_admin_actualizar on public.gatos;
create policy gatos_admin_actualizar on public.gatos for update using (public.es_admin()) with check (public.es_admin());
drop policy if exists gatos_admin_borrar on public.gatos;
create policy gatos_admin_borrar on public.gatos for delete using (public.es_admin());

-- ============ Veterinarias ============
create table if not exists public.veterinarias (
  id bigint generated always as identity primary key,
  nombre text not null check (char_length(nombre) between 1 and 100),
  especialidad text not null check (char_length(especialidad) between 1 and 100),
  zona text not null check (char_length(zona) between 1 and 180),
  contacto text not null check (char_length(contacto) between 1 and 100),
  horario text not null default '' check (char_length(horario) <= 220),
  maps text not null default '' check (char_length(maps) <= 2048 and (maps = '' or maps ~* '^https://')),
  creado timestamptz not null default now()
);
alter table public.veterinarias enable row level security;
drop policy if exists vets_leer on public.veterinarias;
create policy vets_leer on public.veterinarias for select using (true);
drop policy if exists vets_admin_insertar on public.veterinarias;
create policy vets_admin_insertar on public.veterinarias for insert with check (public.es_admin());
drop policy if exists vets_admin_actualizar on public.veterinarias;
create policy vets_admin_actualizar on public.veterinarias for update using (public.es_admin()) with check (public.es_admin());
drop policy if exists vets_admin_borrar on public.veterinarias;
create policy vets_admin_borrar on public.veterinarias for delete using (public.es_admin());

-- ============ Solicitudes de adopción ============
create table if not exists public.solicitudes (
  id text primary key default ('MICH-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  gato_id bigint not null references public.gatos(id) on delete cascade,
  gato_nombre text not null default '',
  nombre text not null check (char_length(nombre) between 1 and 80),
  edad int not null check (edad between 18 and 110),
  telefono text not null check (telefono ~ '^[0-9 +()-]{10,15}$'),
  correo text not null check (char_length(correo) between 3 and 100 and correo ~ '^[^@\s]+@[^@\s]+$'),
  direccion text not null check (char_length(direccion) between 1 and 140),
  mascotas text not null check (mascotas in ('Sí','No')),
  experiencia text not null check (experiencia in ('Sí','No')),
  acuerdo text not null check (acuerdo = 'Sí'),
  motivo text not null check (char_length(motivo) between 1 and 650),
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobada','rechazada')),
  fecha timestamptz not null default now()
);
create index if not exists solicitudes_user_idx on public.solicitudes(user_id);
-- Una sola solicitud pendiente por persona y gatito.
create unique index if not exists solicitudes_unica_pendiente
  on public.solicitudes(user_id, gato_id) where estado = 'pendiente';
alter table public.solicitudes enable row level security;

-- Límite anti-abuso y nombre del gato tomado de la base (no del navegador).
create or replace function public.solicitudes_antes_insertar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare g record;
begin
  select nombre, estado into g from public.gatos where id = new.gato_id;
  if g.estado is distinct from 'disponible' then
    raise exception 'Este gatito no está disponible.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.solicitudes
        where user_id = new.user_id and estado = 'pendiente') >= 5 then
    raise exception 'Tienes demasiadas solicitudes pendientes.' using errcode = 'P0001';
  end if;
  new.gato_nombre := g.nombre;
  new.estado := 'pendiente';
  new.fecha := now();
  return new;
end $$;
drop trigger if exists solicitudes_bi on public.solicitudes;
create trigger solicitudes_bi before insert on public.solicitudes
  for each row execute function public.solicitudes_antes_insertar();

drop policy if exists sol_leer on public.solicitudes;
create policy sol_leer on public.solicitudes for select
  using (user_id = auth.uid() or public.es_admin());
drop policy if exists sol_crear on public.solicitudes;
create policy sol_crear on public.solicitudes for insert to authenticated
  with check (user_id = auth.uid());
-- Sin política de update/delete: el estado solo cambia con la función de abajo (solo admin).

create or replace function public.resolver_solicitud(folio text, aprobar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  if not public.es_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into s from public.solicitudes where id = folio and estado = 'pendiente' for update;
  if not found then raise exception 'Solicitud no encontrada o ya resuelta.'; end if;
  if aprobar then
    if (select estado from public.gatos where id = s.gato_id) is distinct from 'disponible' then
      raise exception 'El michi ya no está disponible.';
    end if;
    update public.solicitudes set estado = 'aprobada' where id = s.id;
    update public.gatos set estado = 'adoptado' where id = s.gato_id;
    update public.solicitudes set estado = 'rechazada'
      where gato_id = s.gato_id and id <> s.id and estado = 'pendiente';
  else
    update public.solicitudes set estado = 'rechazada' where id = s.id;
  end if;
end $$;
revoke all on function public.resolver_solicitud(text, boolean) from public, anon;
grant execute on function public.resolver_solicitud(text, boolean) to authenticated;

-- ============ Mensajes de contacto ============
create table if not exists public.mensajes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 80),
  correo text not null check (char_length(correo) between 3 and 100 and correo ~ '^[^@\s]+@[^@\s]+$'),
  motivo text not null check (char_length(motivo) between 1 and 80),
  mensaje text not null check (char_length(mensaje) between 1 and 1000),
  fecha timestamptz not null default now()
);
alter table public.mensajes enable row level security;
drop policy if exists msg_crear on public.mensajes;
create policy msg_crear on public.mensajes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists msg_leer on public.mensajes;
create policy msg_leer on public.mensajes for select using (public.es_admin());
drop policy if exists msg_borrar on public.mensajes;
create policy msg_borrar on public.mensajes for delete using (public.es_admin());

create or replace function public.mensajes_limite()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.mensajes
        where user_id = new.user_id and fecha > now() - interval '1 hour') >= 5 then
    raise exception 'Demasiados mensajes. Intenta más tarde.';
  end if;
  new.fecha := now();
  return new;
end $$;
drop trigger if exists mensajes_bi on public.mensajes;
create trigger mensajes_bi before insert on public.mensajes
  for each row execute function public.mensajes_limite();

-- ============ Preguntas del chat sin respuesta (para mejorar el asistente) ============
create table if not exists public.chat_sin_respuesta (
  id bigint generated always as identity primary key,
  pregunta text not null check (char_length(pregunta) between 1 and 240),
  fecha timestamptz not null default now()
);
alter table public.chat_sin_respuesta enable row level security;
drop policy if exists csr_crear on public.chat_sin_respuesta;
create policy csr_crear on public.chat_sin_respuesta for insert to authenticated with check (true);
drop policy if exists csr_leer on public.chat_sin_respuesta;
create policy csr_leer on public.chat_sin_respuesta for select using (public.es_admin());

-- ============ Permisos de tabla (mínimos) ============
revoke all on public.gatos, public.veterinarias, public.solicitudes, public.mensajes, public.chat_sin_respuesta from anon, authenticated;
grant select on public.gatos, public.veterinarias to anon, authenticated;
grant insert, update, delete on public.gatos, public.veterinarias to authenticated;   -- filtrado por RLS (solo admin)
grant select, insert on public.solicitudes to authenticated;
grant select, insert, delete on public.mensajes to authenticated;
grant select, insert on public.chat_sin_respuesta to authenticated;
