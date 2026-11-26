import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ChevronDown, HeartPulse, Plus, Save } from 'lucide-react';
import { Encabezado } from '../../componentes/Encabezado';
import { ConfirmarCoincidencias } from '../../componentes/ConfirmarCoincidencias';
import { Lista, Mensaje, Vacio } from '../../componentes/ui';
import { db, type DietaGuardada, type EjercicioCatalogo, type RutinaGuardada } from '../../db/db';
import { useCatalogo, useDietaActiva, useRutinaActiva } from '../../db/hooks';
import { actualizarRutina, buscarCoincidencias, decisionesPorDefecto, guardarPlan, type Coincidencia, type Decisiones } from '../../db/catalogo';
import { leerPlan } from '../../lib/importar';
import { claveNombre } from '../../lib/texto';
import { DIAS_SEMANA, GRUPOS, NOMBRE_GRUPO, NOMBRE_TIPO, TIPOS_BLOQUE, type Bloque, type Cardio, type Dia, type Ejercicio, type Rutina } from '../../lib/plan';
import { bloqueNuevo, cardioNuevo, comoPlan, diaNuevo, ejercicioNuevo, limpiarRutina, mover, rutinaABorrador, rutinaNueva, siguienteId, useBorrador } from './borrador';
import { Acciones, BotonAgregar, CampoNumero, CampoTexto, Chips, Selector } from './campos';

const DIAS_ES: Record<string, string> = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function EditorRutina({ modo }: { modo: 'nueva' | 'editar' }) {
  const rutina = useRutinaActiva();
  const dieta = useDietaActiva();
  const catalogo = useCatalogo();
  const abierta = useLiveQuery(async () => (await db.sesiones.filter((s) => s.fin === null).first()) ?? null, []);
  const titulo = modo === 'nueva' ? 'Nueva rutina' : 'Editar rutina';
  if (rutina === undefined || dieta === undefined || abierta === undefined) return <Encabezado titulo={titulo} />;
  if (abierta) {
    return (<><Encabezado titulo={titulo} /><div className="px-4"><Vacio titulo="Tienes un entreno en curso"><p>Termínalo o cancélalo en Entreno antes de cambiar la rutina.</p><Link to="/" className="btn btn-marca mt-4 w-full">Ir a Entreno</Link></Vacio></div></>);
  }
  if (modo === 'editar' && !rutina) {
    return (<><Encabezado titulo={titulo} /><div className="px-4"><Vacio titulo="Aún no tienes rutina"><Link to="/plan/rutina/nueva" className="btn btn-marca mt-4 w-full">Crear rutina</Link></Vacio></div></>);
  }
  return <Cuerpo modo={modo} rutina={modo === 'editar' ? rutina! : null} dieta={dieta} catalogo={catalogo} titulo={titulo} />;
}

function Cuerpo({ modo, rutina, dieta, catalogo, titulo }: {
  modo: 'nueva' | 'editar'; rutina: RutinaGuardada | null; dieta: DietaGuardada | null; catalogo: Map<string, EjercicioCatalogo>; titulo: string;
}) {
  const navegar = useNavigate();
  const clave = `evasof.borrador.rutina.${modo}${rutina ? `.${rutina.id}` : ''}`;
  const b = useBorrador<Rutina>(clave, () => (rutina ? rutinaABorrador(rutina) : rutinaNueva()));
  const [diaSel, setDiaSel] = useState(0);
  const [errores, setErrores] = useState<string[]>([]);
  const [confirmar, setConfirmar] = useState<{ plan: Rutina; cs: Coincidencia[]; dec: Decisiones } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const r = b.valor!;
  const i = Math.min(diaSel, r.dias.length - 1);
  const dia = r.dias[i];
  const porClave = new Map([...catalogo.values()].map((e) => [e.clave, e]));
  const cambiarDia = (fn: (d: Dia) => void) => b.cambiar((x) => fn(x.dias[i]));

  async function validar() {
    const limpia = limpiarRutina(r);
    const lectura = leerPlan(JSON.stringify(comoPlan({ rutina: limpia })));
    if (!lectura.plan?.rutina) { setErrores(lectura.errores); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setErrores([]);
    const cs = await buscarCoincidencias(lectura.plan);
    const dec = decisionesPorDefecto(cs);
    if (cs.some((c) => c.estado === 'parecida')) { setConfirmar({ plan: lectura.plan.rutina, cs, dec }); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    await guardar(lectura.plan.rutina, cs, dec);
  }
  async function guardar(plan: Rutina, cs: Coincidencia[], dec: Decisiones) {
    setGuardando(true);
    try {
      if (rutina) await actualizarRutina(rutina.id, plan, cs, dec);
      else await guardarPlan(comoPlan({ rutina: plan }), cs, dec, undefined, true);
      b.descartar();
      navegar('/');
    } finally { setGuardando(false); }
  }
  function salir() {
    if (confirm('¿Salir sin guardar? Tu borrador queda guardado en este celular para seguir después.')) navegar(-1);
  }

  if (confirmar) {
    return (
      <>
        <Encabezado titulo={titulo} subtitulo="Un último paso" />
        <div className="space-y-3.5 px-4">
          <ConfirmarCoincidencias parecidas={confirmar.cs.filter((c) => c.estado === 'parecida')} decisiones={confirmar.dec} onCambio={(dec) => setConfirmar({ ...confirmar, dec })} />
          <button className="btn btn-marca w-full" disabled={guardando} onClick={() => guardar(confirmar.plan, confirmar.cs, confirmar.dec)}><Save size={20} aria-hidden /> Guardar rutina</button>
          <button className="btn btn-suave w-full !text-base" onClick={() => setConfirmar(null)}>Volver a editar</button>
        </div>
      </>
    );
  }

  return (
    <>
      <Encabezado titulo={titulo} subtitulo={modo === 'nueva' ? 'La actual pasa al historial al guardar' : rutina?.nombre}
        accion={<button onClick={salir} className="grid h-11 w-11 place-items-center rounded-xl bg-tarjeta text-tenue" aria-label="Salir"><ArrowLeft size={20} aria-hidden /></button>} />
      <datalist id="catalogo-ejercicios">{[...catalogo.values()].map((e) => <option key={e.id} value={e.nombre} />)}</datalist>
      <div className="space-y-3.5 px-4">
        {b.recuperado && (
          <Mensaje tono="info" titulo="Seguimos con tu borrador">
            <button className="font-semibold text-acento" onClick={() => { b.descartar(); b.reiniciar(rutina ? rutinaABorrador(rutina) : rutinaNueva()); setDiaSel(0); }}>Empezar de nuevo</button>
          </Mensaje>
        )}
        {errores.length > 0 && <Mensaje tono="error" titulo="Revisa esto antes de guardar"><Lista items={errores} /></Mensaje>}

        <section className="tarjeta space-y-3">
          <CampoTexto etiqueta="Nombre de la rutina" ph="Ej. Rutina diciembre" valor={r.nombre} onCambio={(t) => b.cambiar((x) => { x.nombre = t; })} />
          <CampoTexto etiqueta="Notas generales (opcional)" area valor={r.notas_generales} onCambio={(t) => b.cambiar((x) => { x.notas_generales = t; })} />
        </section>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Días">
          {r.dias.map((d, k) => (
            <button key={d.id} role="tab" aria-selected={k === i} onClick={() => setDiaSel(k)}
              className={`chip min-h-10 shrink-0 !px-3.5 ${k === i ? 'bg-marca text-sobre-marca' : 'bg-tarjeta text-tenue'}`}>{d.nombre.trim() || `Día ${k + 1}`}</button>
          ))}
          <button className="chip min-h-10 shrink-0 bg-tarjeta text-acento" aria-label="Agregar día"
            onClick={() => { b.cambiar((x) => { x.dias.push(diaNuevo(siguienteId('D', x.dias.map((d) => d.id)), x.dias.length + 1)); }); setDiaSel(r.dias.length); }}>
            <Plus size={16} aria-hidden /> Día
          </button>
        </div>

        <section className="tarjeta space-y-3" aria-label={`Día ${i + 1}`}>
          <div className="flex items-end gap-2">
            <CampoTexto clase="flex-1" etiqueta="Nombre del día" ph="Ej. Día 1 - Pierna" valor={dia.nombre} onCambio={(t) => cambiarDia((d) => { d.nombre = t; })} />
            <Acciones nombre="día"
              onSubir={() => { b.cambiar((x) => mover(x.dias, i, -1)); setDiaSel(Math.max(0, i - 1)); }}
              onBajar={() => { b.cambiar((x) => mover(x.dias, i, 1)); setDiaSel(Math.min(r.dias.length - 1, i + 1)); }}
              onDuplicar={() => { b.cambiar((x) => { const c = structuredClone(x.dias[i]); c.id = siguienteId('D', x.dias.map((d) => d.id)); c.nombre = `${c.nombre} (copia)`; x.dias.splice(i + 1, 0, c); }); setDiaSel(i + 1); }}
              onBorrar={r.dias.length > 1 ? () => { if (confirm(`¿Borrar «${dia.nombre}»?`)) { b.cambiar((x) => { x.dias.splice(i, 1); }); setDiaSel(Math.max(0, i - 1)); } } : undefined} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Selector etiqueta="Día de la semana" valor={(dia.dia_semana ?? '') as string}
              opciones={[['', 'Rotativo'], ...DIAS_SEMANA.map((d) => [d, DIAS_ES[d]] as [string, string])]}
              onCambio={(v) => cambiarDia((d) => { d.dia_semana = (v || null) as Dia['dia_semana']; })} />
            <Selector etiqueta="Menú de dieta" valor={dia.tipo_dia_dieta ?? ''}
              opciones={[['', dieta ? 'Automático' : 'Sin dieta'], ...(dieta?.tipos_dia.map((t) => [t.id, t.nombre] as [string, string]) ?? [])]}
              onCambio={(v) => cambiarDia((d) => { d.tipo_dia_dieta = v || null; })} />
          </div>
        </section>

        {dia.ejercicios.map((e, k) => (
          <EditorEjercicio key={`${dia.id}-${k}`} e={e} n={k + 1} total={dia.ejercicios.length} porClave={porClave}
            cambiar={(fn) => cambiarDia((d) => fn(d.ejercicios[k]))}
            subir={() => cambiarDia((d) => mover(d.ejercicios, k, -1))}
            bajar={() => cambiarDia((d) => mover(d.ejercicios, k, 1))}
            duplicar={() => cambiarDia((d) => { d.ejercicios.splice(k + 1, 0, structuredClone(e)); })}
            borrar={() => { if (!e.nombre || confirm(`¿Borrar «${e.nombre}»?`)) cambiarDia((d) => { d.ejercicios.splice(k, 1); }); }} />
        ))}
        <BotonAgregar onClick={() => cambiarDia((d) => { d.ejercicios.push(ejercicioNuevo(d.ejercicios.length + 1)); })}><Plus size={18} aria-hidden /> Agregar ejercicio</BotonAgregar>

        {dia.cardio.map((c, k) => (
          <EditorCardio key={`${dia.id}-c${k}`} c={c} cambiar={(fn) => cambiarDia((d) => fn(d.cardio[k]))} borrar={() => cambiarDia((d) => { d.cardio.splice(k, 1); })} />
        ))}
        <BotonAgregar onClick={() => cambiarDia((d) => { d.cardio.push(cardioNuevo()); })}><HeartPulse size={17} aria-hidden /> Agregar cardio</BotonAgregar>

        <div className="sticky bottom-[calc(var(--nav-ocupa)+8px)] z-10 rounded-2xl bg-fondo/95 py-2 backdrop-blur">
          <button className="btn btn-marca w-full" disabled={guardando} onClick={validar}><Save size={20} aria-hidden /> {modo === 'nueva' ? 'Guardar rutina nueva' : 'Guardar cambios'}</button>
        </div>
      </div>
    </>
  );
}

function EditorEjercicio({ e, n, total, porClave, cambiar, subir, bajar, duplicar, borrar }: {
  e: Ejercicio; n: number; total: number; porClave: Map<string, EjercicioCatalogo>;
  cambiar: (fn: (e: Ejercicio) => void) => void; subir: () => void; bajar: () => void; duplicar: () => void; borrar: () => void;
}) {
  const [altTexto, setAltTexto] = useState(e.alternativas.join(', '));
  // Si el ejercicio cambia de lugar (subir/bajar), el texto local se resincroniza.
  useEffect(() => {
    const actual = e.alternativas.join(', ');
    if (altTexto.split(',').map((a) => a.trim()).filter(Boolean).join(', ') !== actual) setAltTexto(actual);
  }, [e.alternativas]); // eslint-disable-line react-hooks/exhaustive-deps
  // Si el nombre ya está en tu catálogo, se copian sus grupos musculares y unidad.
  function alSalirNombre() {
    const c = porClave.get(claveNombre(e.nombre));
    if (c && !e.grupos_musculares.length) cambiar((x) => { x.grupos_musculares = c.grupos; if (!x.unidad && c.unidad) x.unidad = c.unidad; });
  }
  return (
    <article className="tarjeta space-y-3" aria-label={`Ejercicio ${n}`}>
      <div className="flex items-center gap-2">
        <span className="font-titulo text-xl font-bold text-tenue">{n}</span>
        <span className="min-w-0 flex-1 truncate font-semibold">{e.nombre || 'Ejercicio nuevo'}</span>
        <Acciones nombre={`ejercicio ${n}`} onSubir={n > 1 ? subir : undefined} onBajar={n < total ? bajar : undefined} onDuplicar={duplicar} onBorrar={borrar} />
      </div>
      <label className="block">
        <span className="etiqueta !mb-1 !text-xs">Nombre</span>
        <input aria-label="Nombre" className="campo !min-h-11" list="catalogo-ejercicios" placeholder="Ej. Sentadilla hack" value={e.nombre}
          onChange={(ev) => cambiar((x) => { x.nombre = ev.target.value; })} onBlur={alSalirNombre} />
      </label>
      <Chips etiqueta="Grupos musculares (el primero es el principal)" valores={e.grupos_musculares}
        opciones={GRUPOS.map((g) => [g, NOMBRE_GRUPO[g]] as [typeof g, string])} onCambio={(v) => cambiar((x) => { x.grupos_musculares = v; })} />

      <div className="space-y-2">
        <span className="etiqueta !mb-0 !text-xs">Series</span>
        {e.bloques.map((bl, k) => (
          <EditorBloque key={k} bl={bl} cambiar={(fn) => cambiar((x) => fn(x.bloques[k]))}
            borrar={e.bloques.length > 1 ? () => cambiar((x) => { x.bloques.splice(k, 1); }) : undefined} />
        ))}
        <button type="button" className="text-sm font-semibold text-acento" onClick={() => cambiar((x) => { x.bloques.push(bloqueNuevo()); })}>+ Agregar bloque (ej. drop set al final)</button>
      </div>

      <details className="group">
        <summary className="flex min-h-9 list-none items-center gap-1 text-sm font-semibold text-tenue">
          Más opciones <ChevronDown size={15} className="transition group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-2 space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            <CampoNumero etiqueta="Descanso (s)" decimales={false} valor={e.descanso_seg} onCambio={(v) => cambiar((x) => { x.descanso_seg = v; })} ph="90" />
            <Selector etiqueta="Unidad" valor={e.unidad ?? ''} opciones={[['', 'Perfil'], ['kg', 'kg'], ['lb', 'lb']]} onCambio={(v) => cambiar((x) => { x.unidad = (v || null) as Ejercicio['unidad']; })} />
            <Selector etiqueta="Biserie" valor={e.grupo ?? ''} opciones={[['', 'No'], ...LETRAS.map((l) => [l, l] as [string, string])]} onCambio={(v) => cambiar((x) => { x.grupo = v || null; })} />
          </div>
          <CampoTexto etiqueta="Tempo" ph="3-1-1-0" valor={e.tempo} onCambio={(t) => cambiar((x) => { x.tempo = t; })} />
          <label className="block">
            <span className="etiqueta !mb-1 !text-xs">Alternativas (separadas por coma)</span>
            <input aria-label="Alternativas" className="campo !min-h-11" placeholder="Ej. Sentadilla libre, Prensa" value={altTexto}
              onChange={(ev) => { setAltTexto(ev.target.value); cambiar((x) => { x.alternativas = ev.target.value.split(',').map((a) => a.trim()).filter(Boolean); }); }} />
          </label>
          <CampoTexto etiqueta="Indicaciones del coach" area valor={e.notas} onCambio={(t) => cambiar((x) => { x.notas = t; })} />
          <p className="text-xs text-tenue">Para una biserie, pon la misma letra en los dos ejercicios (y que vayan seguidos).</p>
        </div>
      </details>
    </article>
  );
}

function EditorBloque({ bl, cambiar, borrar }: { bl: Bloque; cambiar: (fn: (b: Bloque) => void) => void; borrar?: () => void }) {
  const [secTexto, setSecTexto] = useState(bl.secuencia?.join('-') ?? '');
  useEffect(() => {
    const actual = bl.secuencia?.join('-') ?? '';
    const local = secTexto.split(/[^0-9]+/).filter(Boolean);
    if ((local.length >= 2 ? local.join('-') : '') !== actual) setSecTexto(actual);
  }, [bl.secuencia]); // eslint-disable-line react-hooks/exhaustive-deps
  const conReps = ['normal', 'rm', 'segundos', 'fallo', 'amrap', 'rest_pause', 'myo_reps', 'calentamiento'].includes(bl.tipo);
  const conSecuencia = ['dropset', 'cluster'].includes(bl.tipo);
  return (
    <div className="rounded-xl bg-atenuado/60 p-2.5">
      <div className="flex items-end gap-2">
        <CampoNumero clase="w-16 shrink-0" etiqueta="Series" decimales={false} valor={bl.series} onCambio={(v) => cambiar((x) => { x.series = Math.max(1, v ?? 1); })} />
        <Selector clase="flex-1" etiqueta="Tipo" valor={bl.tipo} opciones={TIPOS_BLOQUE.map((t) => [t, NOMBRE_TIPO[t]] as [typeof t, string])}
          onCambio={(v) => { const n = bloqueNuevo(v); cambiar((x) => { Object.assign(x, { ...n, series: x.series, notas: x.notas }); }); setSecTexto(n.secuencia?.join('-') ?? ''); }} />
        {borrar && <Acciones nombre="bloque" onBorrar={borrar} />}
      </div>
      <div className="mt-2 flex gap-2">
        {conReps && (
          <>
            <CampoNumero clase="flex-1" etiqueta={bl.tipo === 'segundos' ? 'Seg. mín' : 'Reps mín'} decimales={false} valor={bl.reps_min} ph={['fallo', 'amrap'].includes(bl.tipo) ? '—' : ''}
              onCambio={(v) => cambiar((x) => { x.reps_min = v; if (v != null && (x.reps_max == null || x.reps_max < v)) x.reps_max = v; })} />
            <CampoNumero clase="flex-1" etiqueta={bl.tipo === 'segundos' ? 'Seg. máx' : 'Reps máx'} decimales={false} valor={bl.reps_max} ph={['fallo', 'amrap'].includes(bl.tipo) ? '—' : ''}
              onCambio={(v) => cambiar((x) => { x.reps_max = v; })} />
          </>
        )}
        {conSecuencia && (
          <label className="block min-w-0 flex-1">
            <span className="etiqueta !mb-1 !text-xs">{bl.tipo === 'cluster' ? 'Mini-series (reps)' : 'Reps por caída (opcional)'}</span>
            <input aria-label={bl.tipo === 'cluster' ? 'Mini-series (reps)' : 'Reps por caída'} className="campo num !min-h-11 !px-2 text-center" inputMode="numeric" placeholder={bl.tipo === 'cluster' ? '8-8-8' : '10-12-15'} value={secTexto}
              onChange={(ev) => {
                setSecTexto(ev.target.value);
                const nums = ev.target.value.split(/[^0-9]+/).filter(Boolean).map(Number);
                cambiar((x) => { x.secuencia = nums.length >= 2 ? nums : null; if (x.tipo === 'dropset' && nums.length >= 2) x.caidas = nums.length - 1; });
              }} />
          </label>
        )}
        {bl.tipo === 'dropset' && <CampoNumero clase="w-20 shrink-0" etiqueta="Caídas" decimales={false} valor={bl.caidas ?? null} onCambio={(v) => cambiar((x) => { x.caidas = v; })} />}
        {bl.tipo === 'cluster' && <CampoNumero clase="w-24 shrink-0" etiqueta="Pausa (s)" decimales={false} valor={bl.descanso_intra_seg} onCambio={(v) => cambiar((x) => { x.descanso_intra_seg = v; })} />}
      </div>
      <div className="mt-2 flex gap-2">
        <CampoNumero clase="w-20 shrink-0" etiqueta="RIR" decimales={false} valor={bl.rir} onCambio={(v) => cambiar((x) => { x.rir = v; })} />
        <CampoTexto clase="flex-1" etiqueta="Nota del bloque" ph="Ej. al fallo en cada caída" valor={bl.notas} onCambio={(t) => cambiar((x) => { x.notas = t; })} />
      </div>
    </div>
  );
}

function EditorCardio({ c, cambiar, borrar }: { c: Cardio; cambiar: (fn: (c: Cardio) => void) => void; borrar: () => void }) {
  return (
    <article className="tarjeta space-y-2.5" aria-label="Cardio">
      <div className="flex items-end gap-2">
        <CampoTexto clase="flex-1" etiqueta="Cardio: máquina" ph="Caminadora, escaladora…" valor={c.maquina} onCambio={(t) => cambiar((x) => { x.maquina = t; })} />
        <Acciones nombre="cardio" onBorrar={borrar} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Selector etiqueta="Meta por" valor={c.meta_tipo} opciones={[['tiempo', 'Tiempo'], ['calorias', 'Calorías'], ['distancia', 'Distancia']]} onCambio={(v) => cambiar((x) => { x.meta_tipo = v; })} />
        <CampoNumero etiqueta={c.meta_tipo === 'tiempo' ? 'Minutos' : c.meta_tipo === 'calorias' ? 'kcal' : 'km'} valor={c.meta_valor} onCambio={(v) => cambiar((x) => { x.meta_valor = v ?? 0; })} />
        <Selector etiqueta="Cuándo" valor={c.momento ?? ''} opciones={[['despues', 'Después'], ['antes', 'Antes'], ['separado', 'Separado'], ['', '—']]} onCambio={(v) => cambiar((x) => { x.momento = (v || null) as Cardio['momento']; })} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <CampoNumero etiqueta="Inclinación %" valor={c.inclinacion_pct} onCambio={(v) => cambiar((x) => { x.inclinacion_pct = v; })} />
        <CampoNumero etiqueta="Velocidad" valor={c.velocidad} onCambio={(v) => cambiar((x) => { x.velocidad = v; x.velocidad_unidad = v != null ? x.velocidad_unidad ?? 'km/h' : null; })} />
        <CampoNumero etiqueta="Nivel" valor={c.nivel} onCambio={(v) => cambiar((x) => { x.nivel = v; })} />
      </div>
      <CampoTexto etiqueta="Notas" valor={c.notas} onCambio={(t) => cambiar((x) => { x.notas = t; })} />
    </article>
  );
}
