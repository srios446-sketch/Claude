// Borradores del editor manual: plantillas, conversión desde lo guardado y autoguardado.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DietaGuardada, RutinaGuardada } from '../../db/db';
import type { Alimento, Bloque, Cardio, Comida, Dia, Dieta, Ejercicio, Plan, Rutina, Suplemento, TipoDia } from '../../lib/plan';

export const bloqueNuevo = (tipo: Bloque['tipo'] = 'normal'): Bloque => ({
  series: 3, tipo, reps_min: ['normal', 'rm'].includes(tipo) ? 8 : tipo === 'segundos' ? 30 : null,
  reps_max: ['normal', 'rm'].includes(tipo) ? 12 : tipo === 'segundos' ? 45 : null,
  secuencia: tipo === 'cluster' ? [8, 8, 8] : null, caidas: tipo === 'dropset' ? 2 : null,
  descanso_intra_seg: tipo === 'cluster' ? 10 : null, rir: null, peso_indicado: null, notas: null,
});
export const ejercicioNuevo = (orden: number): Ejercicio => ({
  orden, nombre: '', alternativas: [], grupos_musculares: [], bloques: [bloqueNuevo()],
  tempo: null, descanso_seg: null, unidad: null, grupo: null, notas: null,
});
export const cardioNuevo = (): Cardio => ({
  maquina: 'Caminadora', momento: 'despues', meta_tipo: 'tiempo', meta_valor: 20, inclinacion_pct: null,
  velocidad: null, velocidad_unidad: null, nivel: null, fc_objetivo: null, notas: null,
});
export const diaNuevo = (id: string, n: number): Dia => ({ id, nombre: `Día ${n}`, dia_semana: null, tipo_dia_dieta: null, ejercicios: [], cardio: [] });
export const rutinaNueva = (): Rutina => ({ nombre: '', fecha_inicio: null, notas_generales: null, dias: [diaNuevo('D1', 1)] });

export const alimentoNuevo = (): Alimento => ({ nombre: '', cantidad: null, unidad: 'g', opciones: [], notas: null });
export const comidaNueva = (orden: number): Comida => ({ orden, nombre: `Comida ${orden}`, hora: null, alimentos: [alimentoNuevo()], notas: null });
export const tipoDiaNuevo = (id: string, nombre = 'Todos los días'): TipoDia => ({ id, nombre, es_descanso: false, macros_objetivo: null, comidas: [comidaNueva(1)] });
export const suplementoNuevo = (): Suplemento => ({ nombre: '', dosis: null, momento: null, hora: null, solo_tipos_dia: null, notas: null });
export const dietaNueva = (): Dieta => ({ nombre: '', fecha_inicio: null, agua_litros: 3, notas_generales: null, tipos_dia: [tipoDiaNuevo('TD1')], suplementos: [] });

/** Siguiente id libre: D7, TD3… (los existentes no se renumeran: el historial apunta a ellos). */
export function siguienteId(prefijo: 'D' | 'TD', ids: string[]): string {
  const max = Math.max(0, ...ids.map((x) => Number(x.slice(prefijo.length)) || 0));
  return `${prefijo}${max + 1}`;
}

export function rutinaABorrador(r: RutinaGuardada): Rutina {
  return {
    nombre: r.nombre, fecha_inicio: r.fechaInicio, notas_generales: r.notasGenerales,
    dias: r.dias.map(({ ejercicios, ...d }) => ({
      ...d, ejercicios: ejercicios.map(({ ejercicioId: _a, alternativasIds: _b, ...e }) => e),
    })),
  };
}
export function dietaABorrador(d: DietaGuardada): Dieta {
  return { nombre: d.nombre, fecha_inicio: d.fecha_inicio, agua_litros: d.agua_litros, notas_generales: d.notas_generales, tipos_dia: d.tipos_dia, suplementos: d.suplementos };
}

/** Limpia el borrador antes de validar: quita vacíos y renumera el orden. */
export function limpiarRutina(r: Rutina): Rutina {
  const c: Rutina = structuredClone(r);
  c.nombre = c.nombre.trim();
  c.notas_generales = c.notas_generales?.trim() || null;
  for (const d of c.dias) {
    d.nombre = d.nombre.trim();
    d.ejercicios.forEach((e, i) => {
      e.orden = i + 1;
      e.nombre = e.nombre.trim();
      e.alternativas = e.alternativas.map((a) => a.trim()).filter(Boolean);
      e.notas = e.notas?.trim() || null;
      e.tempo = e.tempo?.trim() || null;
      for (const b of e.bloques) b.notas = b.notas?.trim() || null;
    });
    for (const k of d.cardio) { k.maquina = k.maquina.trim(); k.notas = k.notas?.trim() || null; }
  }
  return c;
}
export function limpiarDieta(d: Dieta): Dieta {
  const c: Dieta = structuredClone(d);
  c.nombre = c.nombre.trim();
  c.notas_generales = c.notas_generales?.trim() || null;
  for (const t of c.tipos_dia) {
    t.nombre = t.nombre.trim();
    t.comidas.forEach((m, i) => {
      m.orden = i + 1;
      m.nombre = m.nombre.trim();
      m.hora = m.hora || null;
      m.notas = m.notas?.trim() || null;
      m.alimentos = m.alimentos.filter((a) => a.nombre.trim()).map((a) => ({
        ...a, nombre: a.nombre.trim(), notas: a.notas?.trim() || null,
        cantidad: a.unidad === 'al_gusto' ? null : a.cantidad,
        opciones: a.opciones.filter((o) => o.nombre.trim()).map((o) => ({ ...o, nombre: o.nombre.trim(), cantidad: o.unidad === 'al_gusto' ? null : o.cantidad })),
      }));
    });
    const m = t.macros_objetivo;
    if (m && m.kcal == null && m.proteina_g == null && m.carbohidratos_g == null && m.grasa_g == null) t.macros_objetivo = null;
  }
  c.suplementos = c.suplementos.filter((s) => s.nombre.trim()).map((s) => ({
    ...s, nombre: s.nombre.trim(), dosis: s.dosis?.trim() || null, momento: s.momento?.trim() || null, hora: s.hora || null,
    notas: s.notas?.trim() || null, solo_tipos_dia: s.solo_tipos_dia?.length ? s.solo_tipos_dia : null,
  }));
  return c;
}

export const comoPlan = (p: { rutina?: Rutina; dieta?: Dieta }): Plan => ({ formato: 'evasof-plan', version: 2, rutina: p.rutina ?? null, dieta: p.dieta ?? null, dudas: [] });

/** Estado del borrador que se guarda solo en el navegador (para no perder lo escrito). */
export function useBorrador<T>(clave: string, inicial: () => T | undefined) {
  const [valor, setValor] = useState<T | undefined>(() => {
    try { const g = localStorage.getItem(clave); if (g) return JSON.parse(g) as T; } catch { /* */ }
    return inicial();
  });
  const recuperado = useRef<boolean>((() => { try { return !!localStorage.getItem(clave); } catch { return false; } })());
  useEffect(() => {
    if (valor === undefined) return;
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
  }, [clave, valor]);
  const cambiar = useCallback((fn: (b: T) => void) => setValor((prev) => { if (prev === undefined) return prev; const c = structuredClone(prev); fn(c); return c; }), []);
  const reiniciar = useCallback((v: T | undefined) => { setValor(v); }, []);
  const descartar = useCallback(() => { try { localStorage.removeItem(clave); } catch { /* */ } }, [clave]);
  return { valor, cambiar, reiniciar, descartar, recuperado: recuperado.current };
}

/** Mueve un elemento de un arreglo (para subir/bajar). */
export function mover<T>(arr: T[], i: number, delta: number) {
  const j = i + delta;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}
