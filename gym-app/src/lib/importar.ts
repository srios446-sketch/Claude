// Lectura del JSON que devuelve la IA: limpiar, parsear, validar y corregir.
import { z } from 'zod';
import { es } from 'zod/locales';
import { PlanSchema } from './esquema';
import type { Plan, Dia } from './plan';
import { claveNombre } from './texto';

z.config(es());

export interface Lectura {
  plan: Plan | null;
  errores: string[];      // impiden guardar
  avisos: string[];       // conviene revisarlos
  correcciones: string[]; // se aplicaron solas
}

/** Quita bloques ``` y texto alrededor; une respuestas partidas ("continúa"). */
export function limpiarTexto(texto: string): string {
  const lineas = texto.replace(/\r\n?/g, '\n').split('\n').filter((l) => !/^\s*```/.test(l));
  const unido = lineas.join('\n');
  const ini = unido.indexOf('{');
  const fin = unido.lastIndexOf('}');
  if (ini === -1 || fin === -1 || fin < ini) return unido.trim();
  return unido.slice(ini, fin + 1);
}

function errorJSON(texto: string, e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/end of (json )?input|unterminated|unexpected end/i.test(msg)) {
    return 'El JSON está incompleto: la respuesta de la IA se cortó. Escríbele "continúa" y pega aquí las dos partes juntas.';
  }
  const m = msg.match(/position (\d+)/i);
  if (m) {
    const pos = Number(m[1]);
    const antes = texto.slice(0, pos);
    const linea = antes.split('\n').length;
    const fragmento = texto.slice(Math.max(0, pos - 30), pos + 30).replace(/\s+/g, ' ');
    return `El texto no es un JSON válido cerca de la línea ${linea}: «…${fragmento}…». Revisa que hayas copiado la respuesta completa.`;
  }
  return 'El texto no es un JSON válido. Copia de nuevo la respuesta completa de la IA (el bloque de código).';
}

/** Ruta legible: ["rutina","dias",1,"ejercicios",2,"bloques",0,"tipo"] → "D2 › Press militar › bloque 1 › tipo". */
export function rutaLegible(raw: unknown, ruta: PropertyKey[]): string {
  const partes: string[] = [];
  let nodo: any = raw;
  for (let i = 0; i < ruta.length; i++) {
    const k = ruta[i];
    const sig = nodo?.[k as any];
    if (typeof k === 'number') {
      const padre = ruta[i - 1];
      if (padre === 'dias') partes.push(sig?.id ?? `día ${k + 1}`);
      else if (padre === 'ejercicios') partes.push(sig?.nombre ? `«${sig.nombre}»` : `ejercicio ${k + 1}`);
      else if (padre === 'bloques') partes.push(`bloque ${k + 1}`);
      else if (padre === 'tipos_dia') partes.push(sig?.nombre ? `tipo de día «${sig.nombre}»` : `tipo de día ${k + 1}`);
      else if (padre === 'comidas') partes.push(sig?.nombre ? `«${sig.nombre}»` : `comida ${k + 1}`);
      else if (padre === 'alimentos') partes.push(sig?.nombre ? `«${sig.nombre}»` : `alimento ${k + 1}`);
      else if (padre === 'cardio') partes.push(`cardio ${k + 1}`);
      else if (padre === 'suplementos') partes.push(sig?.nombre ? `suplemento «${sig.nombre}»` : `suplemento ${k + 1}`);
      else partes.push(`#${k + 1}`);
    } else if (!['dias', 'ejercicios', 'bloques', 'tipos_dia', 'comidas', 'alimentos', 'cardio', 'suplementos'].includes(String(k))) {
      partes.push(String(k));
    }
    nodo = sig;
  }
  return partes.join(' › ') || 'plan';
}

/** Cada tramo seguido de ejercicios con la misma letra es un grupo; se re-letra A, B, C… por día. */
export function reletrarGrupos(dia: Dia): string[] {
  const cambios: string[] = [];
  const ejs = [...dia.ejercicios].sort((a, b) => a.orden - b.orden);
  // tramos consecutivos
  const tramos: (typeof ejs)[] = [];
  let actual: typeof ejs = [];
  let letraPrev: string | null = null;
  for (const e of ejs) {
    if (e.grupo && e.grupo === letraPrev) actual.push(e);
    else {
      if (actual.length) tramos.push(actual);
      actual = e.grupo ? [e] : [];
    }
    letraPrev = e.grupo;
  }
  if (actual.length) tramos.push(actual);
  let letra = 'A';
  for (const t of tramos) {
    if (t.length === 1) {
      cambios.push(`${dia.id}: «${t[0].nombre}» estaba marcado como biserie (${t[0].grupo}) pero no tiene pareja; se dejó como ejercicio suelto.`);
      t[0].grupo = null;
      continue;
    }
    for (const e of t) {
      if (e.grupo !== letra) cambios.push(`${dia.id}: «${e.nombre}» pasó de la biserie ${e.grupo} a la ${letra}.`);
      e.grupo = letra;
    }
    letra = String.fromCharCode(letra.charCodeAt(0) + 1);
  }
  return cambios;
}

/** Ejercicios que parecen ser solo el drop set / cluster de otro ejercicio (la IA los separó). */
export function detectarSeparados(plan: Plan): { diaId: string; orden: number; nombre: string; anterior: string }[] {
  const res: { diaId: string; orden: number; nombre: string; anterior: string }[] = [];
  for (const d of plan.rutina?.dias ?? []) {
    const ejs = [...d.ejercicios].sort((a, b) => a.orden - b.orden);
    for (let i = 1; i < ejs.length; i++) {
      const e = ejs[i], prev = ejs[i - 1];
      const soloTecnica = e.bloques.length === 1 && ['dropset', 'cluster', 'rest_pause', 'myo_reps'].includes(e.bloques[0].tipo);
      const clave = claveNombre(e.nombre);
      const mencionaTecnica = /\b(cluster|drop|dropset|rest pause|myo)\b/.test(clave);
      const pareceAnterior = clave.startsWith(claveNombre(prev.nombre).split(' ').slice(0, 2).join(' '));
      if (soloTecnica && (mencionaTecnica || pareceAnterior)) res.push({ diaId: d.id, orden: e.orden, nombre: e.nombre, anterior: prev.nombre });
    }
  }
  return res;
}

/** Une el ejercicio separado como un bloque más del ejercicio anterior. */
export function unirConAnterior(plan: Plan, diaId: string, orden: number): Plan {
  const copia: Plan = structuredClone(plan);
  const d = copia.rutina!.dias.find((x) => x.id === diaId)!;
  d.ejercicios.sort((a, b) => a.orden - b.orden);
  const i = d.ejercicios.findIndex((e) => e.orden === orden);
  if (i <= 0) return plan;
  const [quitado] = d.ejercicios.splice(i, 1);
  const prev = d.ejercicios[i - 1];
  prev.bloques.push(...quitado.bloques);
  if (quitado.notas) prev.notas = [prev.notas, quitado.notas].filter(Boolean).join(' ');
  d.ejercicios.forEach((e, k) => (e.orden = k + 1));
  return copia;
}

export function leerPlan(texto: string): Lectura {
  const r: Lectura = { plan: null, errores: [], avisos: [], correcciones: [] };
  const limpio = limpiarTexto(texto);
  if (!limpio) { r.errores.push('Pega aquí la respuesta de la IA.'); return r; }

  let raw: any;
  try { raw = JSON.parse(limpio); } catch (e) { r.errores.push(errorJSON(limpio, e)); return r; }

  if (raw?.formato !== 'evasof-plan') {
    r.errores.push('Esto no parece un plan de la app (falta "formato": "evasof-plan"). Usa el prompt de la app para generarlo.');
    return r;
  }
  if (raw.version !== 2) {
    r.errores.push(`Este JSON es de la versión ${raw.version} del formato. Vuelve a generarlo con el prompt actual de la app.`);
    return r;
  }

  const res = PlanSchema.safeParse(raw);
  if (!res.success) {
    const vistos = new Set<string>();
    for (const iss of res.error.issues) {
      const linea = `${rutaLegible(raw, iss.path)}: ${iss.message}`;
      if (!vistos.has(linea)) { vistos.add(linea); r.errores.push(linea); }
      if (r.errores.length >= 12) { r.errores.push('…y más errores. Revisa que la IA haya usado el formato del prompt.'); break; }
    }
    return r;
  }

  const plan = res.data;
  // Validaciones que no caben en el esquema
  const idsTipo = new Set(plan.dieta?.tipos_dia.map((t) => t.id) ?? []);
  if (plan.dieta) {
    const vistos = new Set<string>();
    for (const t of plan.dieta.tipos_dia) {
      if (vistos.has(t.id)) r.errores.push(`El tipo de día ${t.id} está repetido.`);
      vistos.add(t.id);
    }
    for (const s of plan.dieta.suplementos) {
      for (const id of s.solo_tipos_dia ?? []) {
        if (!idsTipo.has(id)) r.avisos.push(`El suplemento «${s.nombre}» menciona el tipo de día ${id}, que no existe en la dieta.`);
      }
    }
    for (const t of plan.dieta.tipos_dia) t.comidas.sort((a, b) => a.orden - b.orden);
  }
  if (plan.rutina) {
    const vistos = new Set<string>();
    for (const d of plan.rutina.dias) {
      if (vistos.has(d.id)) r.errores.push(`El día ${d.id} está repetido.`);
      vistos.add(d.id);
      if (d.tipo_dia_dieta && plan.dieta && !idsTipo.has(d.tipo_dia_dieta)) {
        r.avisos.push(`${d.id} apunta al tipo de día ${d.tipo_dia_dieta}, que no existe en la dieta; se quitó el vínculo.`);
        d.tipo_dia_dieta = null;
      }
      const ordenes = d.ejercicios.map((e) => e.orden);
      if (new Set(ordenes).size !== ordenes.length) {
        d.ejercicios.forEach((e, k) => (e.orden = k + 1));
        r.correcciones.push(`${d.id}: el orden de los ejercicios estaba repetido; se renumeró en el orden en que vienen.`);
      }
      d.ejercicios.sort((a, b) => a.orden - b.orden);
      r.correcciones.push(...reletrarGrupos(d));
    }
    for (const s of detectarSeparados(plan)) {
      r.avisos.push(`${s.diaId}: «${s.nombre}» parece ser solo la técnica de «${s.anterior}». Puedes unirlos en la vista previa.`);
    }
  }
  r.plan = plan;
  return r;
}
