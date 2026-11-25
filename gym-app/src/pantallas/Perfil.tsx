import { useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Merge, Pencil, RotateCcw, Trash2, Upload } from 'lucide-react';
import { Encabezado } from '../componentes/Encabezado';
import { Mensaje } from '../componentes/ui';
import { BRAND } from '../config/brand';
import { actualizarPerfil, db, RANGOS_SERIES_DEFECTO, type Perfil as TPerfil } from '../db/db';
import { usePerfil } from '../db/hooks';
import { activarPlan, borrarTodo, descargarRespaldo, restaurarRespaldo, unirEjercicios } from '../db/respaldo';
import { fechaCorta } from '../lib/fechas';
import { claveNombre } from '../lib/texto';
import { enlaceSpotify } from '../lib/spotify';
import { nubeConfigurada } from '../nube/config';
import { Cuenta } from './perfil/Cuenta';
import { Admin } from './perfil/Admin';
import { Avisos } from './perfil/Avisos';
import { GRUPOS, NOMBRE_GRUPO, type Grupo } from '../lib/plan';

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="tarjeta space-y-3" aria-label={titulo}>
      <h2 className="titulo text-xl">{titulo}</h2>
      {children}
    </section>
  );
}

function Opciones<T extends string>({ valor, opciones, onCambio, etiqueta }: { valor: T; opciones: [T, string][]; onCambio: (v: T) => void; etiqueta: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={etiqueta}>
      {opciones.map(([v, t]) => (
        <button key={v} role="radio" aria-checked={valor === v} onClick={() => onCambio(v)}
          className={`chip min-h-10 !px-4 ${valor === v ? 'bg-azul text-sobre-azul' : 'bg-atenuado text-tenue'}`}>{t}</button>
      ))}
    </div>
  );
}

const aNum = (s: string) => { const n = Number(s.replace(',', '.')); return s.trim() && Number.isFinite(n) && n >= 0 ? n : null; };

export function Perfil() {
  const perfil = usePerfil();
  const [nombre, setNombre] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tono: 'ok' | 'error'; texto: string } | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const p = (c: Partial<TPerfil>) => actualizarPerfil(c);

  async function restaurar(f: File | undefined) {
    if (!f) return;
    if (!confirm('Esto reemplaza TODOS tus datos de este dispositivo por los del respaldo. ¿Continuar?')) return;
    try { await restaurarRespaldo(await f.text()); setMensaje({ tono: 'ok', texto: 'Respaldo restaurado.' }); }
    catch (e) { setMensaje({ tono: 'error', texto: e instanceof Error ? e.message : 'No se pudo restaurar.' }); }
    if (archivo.current) archivo.current.value = '';
  }

  return (
    <>
      <Encabezado titulo="Perfil" subtitulo={perfil.nombre || BRAND.nombre} />
      <div className="space-y-3.5 px-4">
        {mensaje && <Mensaje tono={mensaje.tono} titulo={mensaje.texto} />}
        <Cuenta />
        <Admin />
        <Seccion titulo="Tú">
          <label className="block"><span className="etiqueta">Tu nombre (sale en el check-in)</span>
            <input className="campo" value={nombre ?? perfil.nombre} onChange={(e) => setNombre(e.target.value)} onBlur={() => nombre != null && p({ nombre: nombre.trim() })} placeholder="Ej. Eva" /></label>
          <div><span className="etiqueta">Tu meta</span>
            <Opciones etiqueta="Meta" valor={perfil.objetivo} onCambio={(v) => p({ objetivo: v })} opciones={[['bajar', 'Bajar grasa'], ['subir', 'Subir masa'], ['mantener', 'Mantener']]} /></div>
        </Seccion>

        <Seccion titulo="Unidades">
          <div><span className="etiqueta">Peso (por defecto; cada ejercicio puede usar la suya)</span>
            <Opciones etiqueta="Unidad de peso" valor={perfil.unidadPeso} onCambio={(v) => p({ unidadPeso: v })} opciones={[['kg', 'Kilos'], ['lb', 'Libras']]} /></div>
          <div><span className="etiqueta">Medidas</span>
            <Opciones etiqueta="Unidad de medidas" valor={perfil.unidadMedida} onCambio={(v) => p({ unidadMedida: v })} opciones={[['cm', 'Centímetros'], ['in', 'Pulgadas']]} /></div>
        </Seccion>

        <Seccion titulo="Entreno">
          <div><span className="etiqueta">Qué registrar además de peso y reps</span>
            <div className="flex flex-wrap gap-2">
              {([['rir', 'RIR'], ['tempo', 'Tempo'], ['descanso', 'Descanso real']] as const).map(([k, t]) => (
                <button key={k} aria-pressed={perfil.campos[k]} onClick={() => p({ campos: { ...perfil.campos, [k]: !perfil.campos[k] } })}
                  className={`chip min-h-10 !px-4 ${perfil.campos[k] ? 'bg-azul text-sobre-azul' : 'bg-atenuado text-tenue'}`}>{t}</button>
              ))}
            </div></div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block"><span className="etiqueta">Descanso (s)</span>
              <input className="campo num" inputMode="numeric" defaultValue={perfil.descansoDefectoSeg} key={`d${perfil.descansoDefectoSeg}`}
                onBlur={(e) => { const n = aNum(e.target.value); if (n != null) p({ descansoDefectoSeg: Math.round(n) }); }} /></label>
            <label className="block"><span className="etiqueta">Subir (kg)</span>
              <input className="campo num" inputMode="decimal" defaultValue={perfil.incremento.kg} key={`k${perfil.incremento.kg}`}
                onBlur={(e) => { const n = aNum(e.target.value); if (n) p({ incremento: { ...perfil.incremento, kg: n } }); }} /></label>
            <label className="block"><span className="etiqueta">Subir (lb)</span>
              <input className="campo num" inputMode="decimal" defaultValue={perfil.incremento.lb} key={`l${perfil.incremento.lb}`}
                onBlur={(e) => { const n = aNum(e.target.value); if (n) p({ incremento: { ...perfil.incremento, lb: n } }); }} /></label>
          </div>
          <p className="text-xs text-tenue">El descanso se usa cuando la rutina no lo indica. "Subir" es cuánto sugiere aumentar la app cuando llegas al tope de reps.</p>
        </Seccion>

        <Seccion titulo="Dieta">
          <label className="block"><span className="etiqueta">Meta de agua (L) si la dieta no la indica</span>
            <input className="campo num" inputMode="decimal" defaultValue={perfil.metaAguaL} key={`a${perfil.metaAguaL}`}
              onBlur={(e) => { const n = aNum(e.target.value); if (n) p({ metaAguaL: n }); }} /></label>
        </Seccion>

        <Avisos perfil={perfil} />

        <Seccion titulo="Música">
          <label className="block"><span className="etiqueta">Playlist del gym (opcional)</span>
            <input className="campo" inputMode="url" placeholder="Pega el link de Spotify (Compartir → Copiar enlace)" defaultValue={perfil.spotifyUrl} key={`s${perfil.spotifyUrl}`}
              aria-invalid={!!perfil.spotifyUrl && !enlaceSpotify(perfil.spotifyUrl)}
              onBlur={(e) => p({ spotifyUrl: e.target.value.trim() })} /></label>
          {perfil.spotifyUrl && !enlaceSpotify(perfil.spotifyUrl) && <p className="text-sm text-peligro">Ese link no parece de Spotify. Cópialo desde Spotify con Compartir → Copiar enlace.</p>}
          <p className="text-xs text-tenue">En Entreno, el botón de música abre esta playlist en Spotify. Para pausar o cambiar de canción sin salir de la app, desliza hacia abajo desde la esquina superior derecha del iPhone (Centro de control).</p>
        </Seccion>

        <RangosSeries perfil={perfil} />
        <MisPlanes />
        <Catalogo />

        <Seccion titulo="Tus datos">
          <p className="text-sm text-tenue">{nubeConfigurada
            ? 'Tus datos se guardan en este celular y se respaldan solos en tu cuenta. El archivo de respaldo es una copia extra.'
            : 'Por ahora todo se guarda solo en este dispositivo. Haz un respaldo de vez en cuando (o antes de cambiar de celular).'}</p>
          <button className="btn btn-azul w-full !text-base" onClick={descargarRespaldo}><Download size={18} aria-hidden /> Exportar respaldo</button>
          <button className="btn btn-suave w-full !text-base" onClick={() => archivo.current?.click()}><Upload size={18} aria-hidden /> Restaurar respaldo</button>
          <input ref={archivo} type="file" accept="application/json,.json" className="hidden" onChange={(e) => restaurar(e.target.files?.[0])} />
          <button className="btn w-full !text-base text-peligro" onClick={async () => {
            if (confirm(nubeConfigurada ? '¿Borrar TODOS tus datos? También se borran de tu cuenta en la nube. No se puede deshacer.' : '¿Borrar TODOS tus datos de este dispositivo? No se puede deshacer.') && confirm('¿Seguro? Te recomendamos exportar un respaldo antes.')) {
              await borrarTodo(); setMensaje({ tono: 'ok', texto: 'Se borraron todos los datos.' });
            }
          }}><Trash2 size={18} aria-hidden /> Borrar todos los datos</button>
        </Seccion>
        <p className="pb-2 text-center text-xs text-tenue">{BRAND.nombre} · versión 1.0</p>
      </div>
    </>
  );
}

function RangosSeries({ perfil }: { perfil: TPerfil }) {
  const grupos = GRUPOS.filter((g) => g !== 'cuerpo_completo');
  const valor = (g: Grupo) => perfil.rangosSeries[g] ?? RANGOS_SERIES_DEFECTO[g];
  const cambiar = (g: Grupo, i: 0 | 1, s: string) => {
    const n = aNum(s); if (n == null) return;
    const r: [number, number] = [...valor(g)] as [number, number]; r[i] = Math.round(n);
    if (r[0] > r[1]) return;
    actualizarPerfil({ rangosSeries: { ...perfil.rangosSeries, [g]: r } });
  };
  return (
    <details className="tarjeta group">
      <summary className="flex min-h-8 list-none items-center gap-2"><h2 className="titulo flex-1 text-xl">Series por grupo (semana)</h2><span className="text-sm text-acento group-open:hidden">Editar</span></summary>
      <p className="mt-2 text-sm text-tenue">Rango sugerido de series por semana para cada grupo. Ajústalo con lo que te diga tu coach.</p>
      <div className="mt-3 space-y-2">
        {grupos.map((g) => (
          <div key={g} className="flex items-center gap-2">
            <span className="flex-1 text-sm">{NOMBRE_GRUPO[g]}</span>
            <input aria-label={`${NOMBRE_GRUPO[g]} mínimo`} className="campo num !min-h-10 w-16 text-center" inputMode="numeric" defaultValue={valor(g)[0]} key={`${g}a${valor(g)[0]}`} onBlur={(e) => cambiar(g, 0, e.target.value)} />
            <span className="text-tenue">–</span>
            <input aria-label={`${NOMBRE_GRUPO[g]} máximo`} className="campo num !min-h-10 w-16 text-center" inputMode="numeric" defaultValue={valor(g)[1]} key={`${g}b${valor(g)[1]}`} onBlur={(e) => cambiar(g, 1, e.target.value)} />
          </div>
        ))}
      </div>
      <button className="btn btn-suave mt-3 w-full !text-base" onClick={() => actualizarPerfil({ rangosSeries: {} })}><RotateCcw size={16} aria-hidden /> Volver a los rangos generales</button>
    </details>
  );
}

function MisPlanes() {
  const rutinas = useLiveQuery(() => db.rutinas.orderBy('importada').reverse().toArray(), []) ?? [];
  const dietas = useLiveQuery(() => db.dietas.orderBy('importada').reverse().toArray(), []) ?? [];
  const fila = (tipo: 'rutina' | 'dieta', p: { id: string; nombre: string; activa: 0 | 1; importada: string; fechaFin: string | null }) => (
    <li key={p.id} className="flex items-center gap-2 border-t border-borde py-2.5 first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{p.nombre}</p>
        <p className="text-xs text-tenue">Importada el {fechaCorta(p.importada.slice(0, 10))}{p.fechaFin ? ` · usada hasta el ${fechaCorta(p.fechaFin)}` : ''}</p>
      </div>
      {p.activa ? <span className="chip bg-ok/15 text-ok">Activa</span>
        : <button className="chip min-h-9 bg-atenuado text-acento" onClick={() => confirm(`¿Volver a usar «${p.nombre}»? La ${tipo} actual pasa al historial.`) && activarPlan(tipo, p.id)}>Usar de nuevo</button>}
    </li>
  );
  if (!rutinas.length && !dietas.length) return null;
  return (
    <Seccion titulo="Mis planes">
      {rutinas.length > 0 && <div><p className="etiqueta">Rutinas</p><ul>{rutinas.map((r) => fila('rutina', r))}</ul></div>}
      {dietas.length > 0 && <div><p className="etiqueta">Dietas</p><ul>{dietas.map((d) => fila('dieta', d))}</ul></div>}
    </Seccion>
  );
}

function Catalogo() {
  const ejercicios = useLiveQuery(() => db.ejercicios.toArray(), []) ?? [];
  const usos = useLiveQuery(async () => {
    const m = new Map<string, Set<string>>();
    await db.series.each((s) => { if (!m.has(s.ejercicioId)) m.set(s.ejercicioId, new Set()); m.get(s.ejercicioId)!.add(s.sesionId); });
    return m;
  }, []) ?? new Map<string, Set<string>>();
  const [editando, setEditando] = useState<string | null>(null);
  const [uniendo, setUniendo] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const lista = [...ejercicios].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  if (!lista.length) return null;
  return (
    <details className="tarjeta group">
      <summary className="flex min-h-8 list-none items-center gap-2"><h2 className="titulo flex-1 text-xl">Mis ejercicios ({lista.length})</h2><span className="text-sm text-acento group-open:hidden">Ver</span></summary>
      <p className="mt-2 text-sm text-tenue">Si un mismo ejercicio quedó dos veces con nombres distintos, únelos para que su historial quede junto.</p>
      <ul className="mt-2">
        {lista.map((e) => (
          <li key={e.id} className="border-t border-borde py-2 first:border-t-0">
            {editando === e.id ? (
              <form className="flex gap-2" onSubmit={async (ev) => { ev.preventDefault(); if (texto.trim()) await db.ejercicios.update(e.id, { nombre: texto.trim(), clave: claveNombre(texto) }); setEditando(null); }}>
                <input className="campo !min-h-10 flex-1" value={texto} onChange={(ev) => setTexto(ev.target.value)} autoFocus aria-label="Nuevo nombre" />
                <button className="btn btn-azul !min-h-10 !px-3 !text-sm">Guardar</button>
              </form>
            ) : (
              <div className="flex items-center gap-1">
                <p className="min-w-0 flex-1 text-[15px] leading-tight">{e.nombre}<small className="block text-xs text-tenue">{usos.get(e.id)?.size ?? 0} sesiones</small></p>
                <button className="grid h-10 w-10 place-items-center rounded-lg text-tenue" aria-label={`Renombrar ${e.nombre}`} onClick={() => { setEditando(e.id); setTexto(e.nombre); }}><Pencil size={16} aria-hidden /></button>
                <button className="grid h-10 w-10 place-items-center rounded-lg text-tenue" aria-label={`Unir ${e.nombre} con otro`} aria-expanded={uniendo === e.id} onClick={() => setUniendo(uniendo === e.id ? null : e.id)}><Merge size={16} aria-hidden /></button>
              </div>
            )}
            {uniendo === e.id && (
              <label className="mt-1.5 block">
                <span className="etiqueta !text-xs">Unir «{e.nombre}» dentro de:</span>
                <select className="campo !min-h-10" defaultValue="" onChange={async (ev) => {
                  const destino = lista.find((x) => x.id === ev.target.value);
                  if (destino && confirm(`¿Unir «${e.nombre}» con «${destino.nombre}»? Su historial pasa a «${destino.nombre}».`)) { await unirEjercicios(e.id, destino.id); setUniendo(null); }
                }}>
                  <option value="" disabled>Elige el ejercicio…</option>
                  {lista.filter((x) => x.id !== e.id).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                </select>
              </label>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
