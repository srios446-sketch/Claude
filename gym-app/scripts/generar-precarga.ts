// Convierte planes (JSON del prompt) a las filas que guarda la app, para precargarlos en una cuenta.
// Uso: npx tsx scripts/generar-precarga.ts salida.json plan1.json [plan2.json …]
import 'fake-indexeddb/auto';
import { readFileSync, writeFileSync } from 'node:fs';
import { db } from '../src/db/db';
import { buscarCoincidencias, decisionesPorDefecto, guardarPlan } from '../src/db/catalogo';
import { leerPlan } from '../src/lib/importar';

const [salida, ...planes] = process.argv.slice(2);
for (const archivo of planes) {
  const r = leerPlan(readFileSync(archivo, 'utf8'));
  if (!r.plan) { console.error(archivo, r.errores); process.exit(1); }
  if (r.correcciones.length) console.log(archivo, 'correcciones:', r.correcciones.length);
  const cs = await buscarCoincidencias(r.plan);
  await guardarPlan(r.plan, cs, decisionesPorDefecto(cs));
}
const filas: { tabla: string; id: string; datos: unknown }[] = [];
for (const tabla of ['ejercicios', 'rutinas', 'dietas'] as const) {
  for (const f of await db.table(tabla).toArray()) filas.push({ tabla, id: String(f.id), datos: f });
}
writeFileSync(salida, JSON.stringify(filas));
console.log(`${filas.length} filas →`, Object.fromEntries(['ejercicios', 'rutinas', 'dietas'].map((t) => [t, filas.filter((f) => f.tabla === t).length])));
