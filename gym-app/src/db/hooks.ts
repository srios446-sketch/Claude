import { useLiveQuery } from 'dexie-react-hooks';
import { db, PERFIL_DEFECTO, type EjercicioCatalogo, type Perfil } from './db';

export function usePerfil(): Perfil {
  const p = useLiveQuery(() => db.perfil.get('yo'), []);
  return { ...PERFIL_DEFECTO, ...p };
}

/** null = no hay; undefined = cargando. */
export function useRutinaActiva() {
  return useLiveQuery(async () => (await db.rutinas.where('activa').equals(1).first()) ?? null, []);
}
export function useDietaActiva() {
  return useLiveQuery(async () => (await db.dietas.where('activa').equals(1).first()) ?? null, []);
}

export function useCatalogo(): Map<string, EjercicioCatalogo> {
  const lista = useLiveQuery(() => db.ejercicios.toArray(), []) ?? [];
  return new Map(lista.map((e) => [e.id, e]));
}
