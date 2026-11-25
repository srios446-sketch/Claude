import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowUp, History, Repeat, Info, ChevronDown } from 'lucide-react';
import { db, type EjercicioCatalogo, type EjercicioPlan, type Perfil, type SerieRegistrada, type Sesion } from '../../db/db';
import { cambiarEjercicioEnSesion, guardarSerie } from '../../db/sesiones';
import { sugerirPeso } from '../../lib/entreno';
import { describirBloque, NOMBRE_TIPO, type Bloque } from '../../lib/plan';
import { fmt, type UnidadPeso } from '../../lib/unidades';
import { FilaSerie, type ValoresSerie } from './FilaSerie';

interface Props {
  ej: EjercicioPlan;
  sesion: Sesion;
  perfil: Perfil;
  catalogo: Map<string, EjercicioCatalogo>;
  seriesSesion: SerieRegistrada[];
  onSerieHecha: (ej: EjercicioPlan) => void;
}

export function TarjetaEjercicio({ ej, sesion, perfil, catalogo, seriesSesion, onSerieHecha }: Props) {
  const mias = seriesSesion.filter((s) => s.orden === ej.orden);
  const [actualId, setActualId] = useState(mias[0]?.ejercicioId ?? ej.ejercicioId);
  const [eligiendo, setEligiendo] = useState(false);
  const actual = catalogo.get(actualId);
  const nombre = actual?.nombre ?? ej.nombre;
  const unidad: UnidadPeso = actual?.unidad ?? ej.unidad ?? perfil.unidadPeso;

  const historial = useLiveQuery(
    () => db.series.where('ejercicioId').equals(actualId).filter((s) => s.sesionId !== sesion.id && s.hecha).toArray(),
    [actualId, sesion.id],
  ) ?? [];

  const ultima = useMemo(() => {
    if (!historial.length) return null;
    const sid = historial.reduce((a, b) => (b.creada > a.creada ? b : a)).sesionId;
    return historial.filter((s) => s.sesionId === sid).sort((a, b) => a.bloque - b.bloque || a.serie - b.serie);
  }, [historial]);

  const idxPrincipal = ej.bloques.findIndex((b) => b.tipo === 'normal' || b.tipo === 'rm');
  const sugerencia = idxPrincipal >= 0 ? sugerirPeso(ej.bloques[idxPrincipal], idxPrincipal, historial, unidad, perfil.incremento) : null;

  const hechas = mias.filter((s) => s.hecha).length;
  const total = ej.bloques.reduce((s, b) => s + b.series, 0);
  const completo = hechas >= total;

  async function cambiarUnidad(u: UnidadPeso) {
    if (actual) await db.ejercicios.update(actual.id, { unidad: u });
  }
  async function elegir(id: string) {
    setActualId(id); setEligiendo(false);
    await cambiarEjercicioEnSesion(sesion.id, ej.orden, id);
  }

  async function guardar(bi: number, si: number, b: Bloque, v: ValoresSerie, hecha: boolean) {
    await guardarSerie({
      sesionId: sesion.id, fecha: sesion.fecha, ejercicioId: actualId, planEjercicioId: ej.ejercicioId, diaId: sesion.diaId,
      orden: ej.orden, bloque: bi, serie: si, tipo: b.tipo, peso: v.peso, unidad, reps: v.reps, partes: null,
      rir: v.rir, tempo: v.tempo, descansoSeg: v.descansoSeg, hecha,
    });
    if (hecha) onSerieHecha(ej);
  }

  const indicaciones = [ej.notas, ej.tempo ? `Tempo ${ej.tempo}` : null, ej.descanso_seg ? `Descanso ${fmtSeg(ej.descanso_seg)}` : null].filter(Boolean) as string[];
  const opciones = [ej.ejercicioId, ...ej.alternativasIds];

  return (
    <article className={`tarjeta ${completo ? 'border-ok/50' : ''}`} aria-label={nombre}>
      <header className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <h3 className="titulo text-[21px] leading-tight">{nombre}</h3>
          <p className="num mt-0.5 text-sm text-tenue">{ej.bloques.map(describirBloque).join(' · ')}</p>
        </div>
        <div className="flex shrink-0 rounded-[10px] bg-atenuado p-[3px]" role="radiogroup" aria-label="Unidad de peso">
          {(['kg', 'lb'] as const).map((u) => (
            <button key={u} role="radio" aria-checked={unidad === u} onClick={() => cambiarUnidad(u)}
              className={`min-h-9 rounded-lg px-2.5 text-[13px] font-semibold ${unidad === u ? 'bg-azul text-sobre-azul' : 'text-tenue'}`}>{u}</button>
          ))}
        </div>
      </header>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {ej.grupo && <span className="chip bg-azul/20 text-acento">Biserie {ej.grupo}</span>}
        {completo && <span className="chip bg-ok/15 text-ok">Completo</span>}
        {opciones.length > 1 && (
          <button className="chip min-h-8 bg-atenuado text-tenue" onClick={() => setEligiendo((x) => !x)} aria-expanded={eligiendo}>
            <Repeat size={14} aria-hidden /> Cambiar
          </button>
        )}
      </div>

      {eligiendo && (
        <ul className="mt-2 space-y-1.5 rounded-xl bg-atenuado p-2" aria-label="Elegir variante">
          {opciones.map((id, i) => (
            <li key={id}>
              <button onClick={() => elegir(id)} className={`w-full rounded-lg px-3 py-2.5 text-left text-sm ${id === actualId ? 'bg-azul text-sobre-azul' : 'bg-tarjeta'}`}>
                {catalogo.get(id)?.nombre ?? (i === 0 ? ej.nombre : ej.alternativas[i - 1])}
                {i === 0 && <span className="opacity-70"> (de la rutina)</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {ultima && (
        <p className="num mt-2.5 flex items-center gap-1.5 text-sm text-acento">
          <History size={16} aria-hidden /> La vez pasada: {textoUltima(ultima)}
        </p>
      )}
      {sugerencia && sugerencia.tipo !== 'ninguna' && (
        <p className={`chip mt-2 border ${sugerencia.tipo === 'subir' ? 'border-marca/50 bg-marca/15 text-marca-texto' : 'border-borde bg-atenuado text-tenue'}`}>
          {sugerencia.tipo === 'subir' && <ArrowUp size={14} aria-hidden />} {sugerencia.texto}
        </p>
      )}

      {indicaciones.length > 0 && (
        <details className="group mt-2">
          <summary className="flex min-h-9 list-none items-center gap-1.5 text-sm font-semibold text-tenue">
            <Info size={15} aria-hidden /> Indicaciones del coach <ChevronDown size={15} className="transition group-open:rotate-180" aria-hidden />
          </summary>
          <p className="text-sm text-tinta/90">{indicaciones.join(' · ')}</p>
        </details>
      )}

      <div className="mt-2">
        <div className="flex gap-2 px-0 pt-1 text-[11px] font-semibold uppercase tracking-wider text-tenue" aria-hidden>
          <span className="w-6" />
          <span className="flex-[1.3] text-center">Peso ({unidad})</span>
          <span className="flex-1 text-center">{ej.bloques.some((b) => b.tipo === 'segundos') ? 'Seg / reps' : 'Reps'}</span>
          {perfil.campos.rir && <span className="w-14 text-center">RIR</span>}
          <span className="w-12" />
        </div>
        {ej.bloques.map((b, bi) => {
          const conEncabezado = ej.bloques.length > 1 || b.tipo !== 'normal';
          return (
            <div key={bi} className={bi > 0 ? 'mt-2 border-t border-borde pt-2' : ''}>
              {conEncabezado && (
                <p className="pb-1 text-[13px] font-semibold text-tenue">
                  {NOMBRE_TIPO[b.tipo]} · {describirBloque(b)}{b.notas ? <span className="font-normal"> — {b.notas}</span> : null}
                </p>
              )}
              {Array.from({ length: b.series }, (_, si) => {
                const registro = mias.find((s) => s.bloque === bi && s.serie === si);
                const previa = ultima?.find((s) => s.bloque === bi && s.serie === si);
                // Peso propuesto: el de tu serie anterior de hoy en este bloque; si no hay, la sugerencia;
                // luego lo de la vez pasada y al final lo que indique el coach.
                const anteriorHoy = mias
                  .filter((s) => s.bloque === bi && s.serie < si && s.peso != null)
                  .sort((a, c) => c.serie - a.serie)[0];
                const phPeso = anteriorHoy?.peso
                  ?? (sugerencia?.peso != null && (b.tipo === 'normal' || b.tipo === 'rm') ? sugerencia.peso : null)
                  ?? previa?.peso ?? b.peso_indicado ?? null;
                const fijas = b.reps_min != null && b.reps_min === b.reps_max ? b.reps_min : null;
                return (
                  <FilaSerie
                    key={`${bi}-${si}-${registro?.id ?? 'n'}-${actualId}`}
                    etiqueta={String(ej.bloques.slice(0, bi).reduce((s, x) => s + x.series, 0) + si + 1)}
                    registro={registro}
                    phPeso={phPeso}
                    phReps={textoReps(b)}
                    repsFijas={fijas}
                    repsObligatorias={['normal', 'rm', 'segundos', 'fallo', 'amrap'].includes(b.tipo)}
                    repsEtiqueta={b.tipo === 'segundos' ? 'seg' : 'reps'}
                    campos={perfil.campos}
                    unidad={unidad}
                    onGuardar={(v, h) => guardar(bi, si, b, v, h)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function textoReps(b: Bloque): string {
  if (b.reps_min != null && b.reps_max != null) return b.reps_min === b.reps_max ? String(b.reps_min) : `${b.reps_min}–${b.reps_max}`;
  if (b.tipo === 'fallo') return 'fallo';
  if (b.tipo === 'amrap') return 'máx';
  if (b.secuencia) return b.secuencia.join('-');
  return 'reps';
}

function fmtSeg(s: number) { return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s} s`; }

function textoUltima(series: SerieRegistrada[]): string {
  const conPeso = series.filter((s) => s.reps != null);
  if (!conPeso.length) return 'sin datos';
  const pesos = new Set(conPeso.map((s) => s.peso));
  const u = conPeso[0].unidad;
  if (pesos.size === 1) {
    const p = conPeso[0].peso;
    return `${p != null ? `${fmt(p)} ${u} × ` : ''}${conPeso.map((s) => s.reps).join(' · ')}`;
  }
  return conPeso.map((s) => `${s.peso != null ? fmt(s.peso) : '—'}×${s.reps}`).join(' · ') + ` ${u}`;
}
