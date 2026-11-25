-- Precargas: datos (rutina, dieta, catálogo) que se copian a la cuenta nueva que se cree con un
-- código de invitación. Se aplican una sola vez, al crearse el perfil, y luego se borran.
create table if not exists public.precargas (
  codigo text not null references public.codigos_invitacion(codigo) on delete cascade,
  tabla text not null,
  id text not null,
  datos jsonb not null,
  primary key (codigo, tabla, id)
);
alter table public.precargas enable row level security; -- sin políticas: nadie la lee desde la app

create or replace function public.aplicar_precarga() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.invitado_con is null then return new; end if;
  insert into public.registros (usuario_id, tabla, id, datos, borrado)
    select new.id, p.tabla, p.id, p.datos, false from public.precargas p where p.codigo = new.invitado_con
  on conflict (usuario_id, tabla, id) do update set datos = excluded.datos, borrado = false;
  delete from public.precargas where codigo = new.invitado_con;
  return new;
end $$;

drop trigger if exists perfiles_precarga on public.perfiles;
create trigger perfiles_precarga after insert on public.perfiles
  for each row execute function public.aplicar_precarga();
