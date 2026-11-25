import { beforeEach, describe, expect, it } from 'vitest';
import { db, nuevoId, type Metrica } from '../db/db';
import { limpiarLocal, sincronizar, type CambioLocal, type FilaRemota, type Remoto } from './sync';

/** Servidor simulado: guarda filas con un "actualizado" que siempre avanza. */
class ServidorFalso implements Remoto {
  filas = new Map<string, FilaRemota>();
  reloj = Date.parse('2026-11-25T10:00:00Z');
  subidas = 0;
  async subir(cambios: CambioLocal[]) {
    this.subidas += cambios.length;
    for (const c of cambios) this.escribir(c);
  }
  escribir(c: CambioLocal) {
    this.reloj += 1000;
    this.filas.set(`${c.tabla}|${c.id}`, { ...structuredClone(c), actualizado: new Date(this.reloj).toISOString() });
  }
  async bajar(desde: string | null, limite: number) {
    return [...this.filas.values()].filter((f) => !desde || f.actualizado > desde).sort((a, b) => a.actualizado.localeCompare(b.actualizado)).slice(0, limite);
  }
  datos(tabla: string, id: string) { return this.filas.get(`${tabla}|${id}`); }
}

const metrica = (fecha: string, pesoKg: number): Metrica => ({ id: nuevoId(), fecha, pesoKg, grasaPct: null, medidasCm: {} });

let s: ServidorFalso;
beforeEach(async () => { await db.delete(); await db.open(); s = new ServidorFalso(); });

describe('sincronizar', () => {
  it('sube todo la primera vez y nada si no hay cambios', async () => {
    await db.metricas.bulkAdd([metrica('2026-11-20', 70), metrica('2026-11-21', 69.8)]);
    await db.registroDieta.put({ fecha: '2026-11-21', dietaId: 'd', tipoDiaId: 'TD1', tipoManual: false, comidas: { 1: true }, suplementos: {}, aguaMl: 500 });
    expect(await sincronizar(s)).toMatchObject({ subidos: 3 });
    expect(s.datos('registroDieta', '2026-11-21')?.datos).toMatchObject({ aguaMl: 500 });
    s.subidas = 0;
    await sincronizar(s);
    expect(s.subidas).toBe(0);
  });

  it('sube solo lo que cambió y los borrados', async () => {
    const a = metrica('2026-11-20', 70), b = metrica('2026-11-21', 69.8);
    await db.metricas.bulkAdd([a, b]);
    await sincronizar(s);
    await db.metricas.update(a.id, { pesoKg: 69.5 });
    await db.metricas.delete(b.id);
    s.subidas = 0;
    await sincronizar(s);
    expect(s.subidas).toBe(2);
    expect(s.datos('metricas', a.id)?.datos).toMatchObject({ pesoKg: 69.5 });
    expect(s.datos('metricas', b.id)?.borrado).toBe(true);
  });

  it('un celular nuevo baja todo y no lo vuelve a subir', async () => {
    const a = metrica('2026-11-20', 70);
    await db.metricas.add(a);
    await db.perfil.put({ ...(await import('../db/db')).PERFIL_DEFECTO, nombre: 'Eva' });
    await sincronizar(s);
    await limpiarLocal(); // "otro celular"
    expect(await db.metricas.count()).toBe(0);
    const r = await sincronizar(s);
    expect(r.bajados).toBe(2);
    expect((await db.perfil.get('yo'))?.nombre).toBe('Eva');
    s.subidas = 0;
    await sincronizar(s);
    expect(s.subidas).toBe(0);
  });

  it('aplica cambios y borrados hechos en otro dispositivo', async () => {
    const a = metrica('2026-11-20', 70), b = metrica('2026-11-21', 69.8);
    await db.metricas.bulkAdd([a, b]);
    await sincronizar(s);
    s.escribir({ tabla: 'metricas', id: a.id, datos: { ...a, pesoKg: 68.9 }, borrado: false });
    s.escribir({ tabla: 'metricas', id: b.id, datos: null, borrado: true });
    const nueva = metrica('2026-11-22', 69.1);
    s.escribir({ tabla: 'metricas', id: nueva.id, datos: nueva, borrado: false });
    await sincronizar(s);
    expect((await db.metricas.get(a.id))?.pesoKg).toBe(68.9);
    expect(await db.metricas.get(b.id)).toBeUndefined();
    expect(await db.metricas.get(nueva.id)).toBeTruthy();
  });

  it('si cambió en los dos lados, gana lo local y se sube', async () => {
    const a = metrica('2026-11-20', 70);
    await db.metricas.add(a);
    await sincronizar(s);
    s.escribir({ tabla: 'metricas', id: a.id, datos: { ...a, pesoKg: 60 }, borrado: false }); // otro celular
    await db.metricas.update(a.id, { pesoKg: 71 });                                         // este celular, sin subir
    await sincronizar(s);
    expect((await db.metricas.get(a.id))?.pesoKg).toBe(71);
    expect(s.datos('metricas', a.id)?.datos).toMatchObject({ pesoKg: 71 });
  });

  it('restaurar un respaldo reemplaza también lo de la nube', async () => {
    const { crearRespaldo, restaurarRespaldo } = await import('../db/respaldo');
    const a = metrica('2026-11-20', 70);
    await db.metricas.add(a);
    const respaldo = await crearRespaldo();
    const b = metrica('2026-11-21', 69);
    await db.metricas.add(b);
    await sincronizar(s);
    await restaurarRespaldo(JSON.stringify(respaldo));
    await sincronizar(s);
    expect(s.datos('metricas', b.id)?.borrado).toBe(true);
    expect(s.datos('metricas', a.id)?.borrado).toBe(false);
  });

  it('baja por lotes grandes sin perder filas', async () => {
    for (let i = 0; i < 2500; i++) s.escribir({ tabla: 'series', id: `s${i}`, datos: { id: `s${i}`, sesionId: 'x', fecha: '2026-11-20', ejercicioId: 'e', planEjercicioId: 'e', diaId: 'D1', orden: 1, bloque: 0, serie: i, tipo: 'normal', peso: 50, unidad: 'kg', reps: 10, partes: null, rir: null, tempo: null, descansoSeg: null, hecha: true, creada: i }, borrado: false });
    await sincronizar(s);
    expect(await db.series.count()).toBe(2500);
  });
});
