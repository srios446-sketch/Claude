-- EvaSof Training: esquema inicial en Supabase.
-- Todo el contenido de la app (rutinas, series, dieta, métricas…) vive en `registros` como JSON por
-- tabla/id: la app trabaja local (IndexedDB) y sincroniza contra esta tabla.

-- ── Perfiles ───────────────────────────────────────────────────────────────
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  usuario text not null unique,
  nombre text not null default '',
  es_admin boolean not null default false,
  invitado_con text,
  creado timestamptz not null default now()
);
alter table public.perfiles enable row level security;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select es_admin from public.perfiles where id = auth.uid()), false)
$$;

create or replace function public.tiene_perfil() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid())
$$;

drop policy if exists "ver perfil propio" on public.perfiles;
create policy "ver perfil propio" on public.perfiles for select to authenticated using (id = auth.uid() or public.es_admin());
drop policy if exists "editar nombre propio" on public.perfiles;
create policy "editar nombre propio" on public.perfiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Que nadie se haga admin ni cambie su usuario desde la app
revoke update on public.perfiles from authenticated;
grant update (nombre) on public.perfiles to authenticated;

-- ── Códigos de invitación ──────────────────────────────────────────────────
create table if not exists public.codigos_invitacion (
  codigo text primary key,
  nota text not null default '',
  es_admin boolean not null default false,
  creado_por uuid references auth.users(id) on delete set null,
  creado timestamptz not null default now(),
  usado_por uuid references auth.users(id) on delete set null,
  usado timestamptz
);
alter table public.codigos_invitacion enable row level security;
drop policy if exists "admin ve codigos" on public.codigos_invitacion;
create policy "admin ve codigos" on public.codigos_invitacion for select to authenticated using (public.es_admin());

-- ── Datos sincronizados ────────────────────────────────────────────────────
create table if not exists public.registros (
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tabla text not null,
  id text not null,
  datos jsonb,
  borrado boolean not null default false,
  actualizado timestamptz not null default clock_timestamp(),
  primary key (usuario_id, tabla, id)
);
create index if not exists registros_cursor on public.registros (usuario_id, actualizado);
alter table public.registros enable row level security;
drop policy if exists "registros propios" on public.registros;
create policy "registros propios" on public.registros for all to authenticated
  using (usuario_id = auth.uid() and public.tiene_perfil())
  with check (usuario_id = auth.uid() and public.tiene_perfil());

create or replace function public.tocar_actualizado() returns trigger language plpgsql as $$
begin new.actualizado := clock_timestamp(); return new; end $$;
drop trigger if exists registros_tocar on public.registros;
create trigger registros_tocar before insert or update on public.registros
  for each row execute function public.tocar_actualizado();

-- ── Notificaciones push ────────────────────────────────────────────────────
create table if not exists public.suscripciones_push (
  endpoint text primary key,
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  creada timestamptz not null default now()
);
alter table public.suscripciones_push enable row level security;
drop policy if exists "suscripciones propias" on public.suscripciones_push;
create policy "suscripciones propias" on public.suscripciones_push for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid() and public.tiene_perfil());

create table if not exists public.notificaciones (
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,                  -- id del cliente: 'descanso', 'comida-2026-11-25-3', 'agua-2026-11-25-14'
  tipo text not null check (tipo in ('descanso', 'comida', 'agua')),
  enviar_en timestamptz not null,
  titulo text not null,
  cuerpo text not null default '',
  url text not null default '/',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviando', 'enviada', 'cancelada', 'error')),
  intentos int not null default 0,
  actualizado timestamptz not null default now(),
  primary key (usuario_id, id)
);
create index if not exists notificaciones_pendientes on public.notificaciones (enviar_en) where estado = 'pendiente';
alter table public.notificaciones enable row level security;
drop policy if exists "notificaciones propias" on public.notificaciones;
create policy "notificaciones propias" on public.notificaciones for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid() and public.tiene_perfil());

-- Toma (y marca) las notificaciones que ya tocan, para que dos envíos no manden la misma.
create or replace function public.tomar_notificaciones(limite int default 200)
returns setof public.notificaciones language sql security definer set search_path = public as $$
  update public.notificaciones n set estado = 'enviando', intentos = intentos + 1, actualizado = now()
  where (n.usuario_id, n.id) in (
    select usuario_id, id from public.notificaciones
    where (estado = 'pendiente' and enviar_en <= now() + interval '2 seconds')
       or (estado = 'enviando' and actualizado < now() - interval '2 minutes' and intentos < 3)
    order by enviar_en limit limite for update skip locked)
  returning n.*;
$$;
revoke all on function public.tomar_notificaciones(int) from public, anon, authenticated;

-- Limpieza: borra notificaciones viejas
create or replace function public.limpiar_notificaciones() returns void language sql security definer set search_path = public as $$
  delete from public.notificaciones where enviar_en < now() - interval '3 days';
$$;
revoke all on function public.limpiar_notificaciones() from public, anon, authenticated;
