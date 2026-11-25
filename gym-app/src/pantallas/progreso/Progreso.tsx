import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, Plus, Table2, Trophy } from 'lucide-react';
import { Encabezado } from '../../componentes/Encabezado';
import { BarrasRango, GraficaLinea, Sparkline } from '../../componentes/graficas';
import { Vacio } from '../../componentes/ui';
import { db, RANGOS_SERIES_DEFECTO, type Perfil } from '../../db/db';
import { useCatalogo, usePerfil } from '../../db/hooks';
import { volumenSemanal } from '../../lib/entreno';
import { diasEntre, fechaCorta, hoyISO, inicioSemana, sumarDias } from '../../lib/fechas';
import { desdeRango, MEDIDAS, NOMBRE_RANGO, progresoFuerza, sentidoCambio, type Rango } from '../../lib/progreso';
import { GRUPOS, NOMBRE_GRUPO } from '../../lib/plan';
import { deKg, fmt } from '../../lib/unidades';
import { resumenPeso, useAdherencia, useMetricas } from './datos';
import { CheckInSemanal } from './CheckIn';

export function Progreso() {
  const perfil = usePerfil();
  const [tab, setTab] = useState<'general' | 'fuerza'>('general');
  const [rango, setRango] = useState<Rango>('8s');
  const hoy = hoyISO();
  const primera = useLiveQuery(async () => (await db.sesiones.orderBy('fecha').first())?.fecha ?? (await db.metricas.orderBy('fecha').first())?.fecha ?? null, []);
  const desde = desdeRango(rango, hoy, primera ?? undefined);

  return (
    <>
      <Encabezado
        titulo="Progreso"
        subtitulo={`Desde el ${fechaCorta(desde)}`}
        accion={<Link to="/progreso/registrar" className="grid h-11 w-11 place-items-center rounded-xl bg-marca text-sobre-marca" aria-label="Registrar peso y medidas"><Plus size={22} aria-hidden /></Link>}
      />
      <div className="space-y-3.5 px-4">
        <div className="flex rounded-xl bg-tarjeta p-1" role="tablist" aria-label="Vista">
          {(['general', 'fuerza'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`titulo min-h-11 flex-1 rounded-[9px] text-base ${tab === t ? 'bg-marca text-sobre-marca' : 'text-tenue'}`}>{t === 'general' ? 'General' : 'Fuerza'}</button>
          ))}
        </div>
        <div className="flex gap-2" role="radiogroup" aria-label="Periodo">
          {(Object.keys(NOMBRE_RANGO) as Rango[]).map((r) => (
            <button key={r} role="radio" aria-checked={rango === r} onClick={() => setRango(r)}
              className={`chip min-h-9 ${rango === r ? 'bg-azul text-sobre-azul' : 'bg-atenuado text-tenue'}`}>{NOMBRE_RANGO[r]}</button>
          ))}
        </div>
        {tab === 'general'
          ? <General desde={desde} hoy={hoy} perfil={perfil} />
          : <Fuerza desde={desde} hoy={hoy} perfil={perfil} />}
      </div>
    </>
  );
}

function ejesX(desde: string, hoy: string) {
  const total = Math.max(1, diasEntre(desde, hoy));
  return { pos: (f: string) => Math.min(1, Math.max(0, diasEntre(desde, f) / total)), etiquetas: [0, 0.25, 0.5, 0.75, 1].map((t) => ({ x: t, texto: fechaCorta(sumarDias(desde, Math.round(t * total))) })) };
}

function BotonTabla({ abierta, onClick }: { abierta: boolean; onClick: () => void }) {
  return (
    <button className="ml-auto inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-acento" onClick={onClick} aria-expanded={abierta}>
      <Table2 size={15} aria-hidden /> {abierta ? 'Gráfica' : 'Tabla'}
    </button>
  );
}

function Delta({ valor, sentido, sufijo }: { valor: number; sentido: -1 | 0 | 1; sufijo: string }) {
  const clase = sentido === 1 ? 'bg-ok/12 text-ok' : sentido === -1 ? 'bg-peligro/12 text-peligro' : 'bg-atenuado text-tenue';
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold ${clase}`}>
      {valor < 0 ? <ArrowDown size={14} aria-hidden /> : valor > 0 ? <ArrowUp size={14} aria-hidden /> : '='} {fmt(Math.abs(valor))}{sufijo}
    </span>
  );
}

function General({ desde, hoy, perfil }: { desde: string; hoy: string; perfil: Perfil }) {
  const metricas = useMetricas();
  const adherencia = useAdherencia(desde, hoy);
  const [tabla, setTabla] = useState(false);
  const u = perfil.unidadPeso;
  const { diarios, promedio } = useMemo(() => resumenPeso(metricas ?? []), [metricas]);
  const enRango = promedio.filter((p) => p.fecha >= desde);
  const diariosRango = diarios.filter((p) => p.fecha >= desde);
  const ejes = ejesX(desde, hoy);
  const actual = enRango[enRango.length - 1];
  const inicial = enRango[0];

  const conMedidas = (metricas ?? []).filter((m) => Object.keys(m.medidasCm ?? {}).length || m.grasaPct != null);
  const ultimaMed = conMedidas[conMedidas.length - 1];
  const previaMed = ultimaMed ? [...conMedidas].reverse().find((m) => diasEntre(m.fecha, ultimaMed.fecha) >= 21) ?? conMedidas[0] : undefined;

  if (metricas === undefined) return null;
  return (
    <>
      <section className="tarjeta" aria-label="Peso corporal">
        <div className="flex items-baseline gap-2"><h2 className="titulo text-xl">Peso corporal</h2>{diarios.length > 0 && <BotonTabla abierta={tabla} onClick={() => setTabla((x) => !x)} />}</div>
        {!actual ? (
          <div className="py-3 text-sm text-tenue">
            <p>Registra tu peso (idealmente en ayunas, 3 o más veces por semana) para ver tu tendencia.</p>
            <Link to="/progreso/registrar" className="btn btn-azul mt-3 w-full !text-base">Registrar peso</Link>
          </div>
        ) : (
          <>
            <div className="my-1.5 flex items-end gap-3">
              <p className="font-titulo text-[52px] font-bold leading-[0.9]">{fmt(deKg(actual.valor, u))}<small className="text-[22px] text-tenue"> {u}</small></p>
              {inicial && inicial !== actual && <Delta valor={deKg(actual.valor - inicial.valor, u)} sentido={sentidoCambio('peso', actual.valor - inicial.valor, perfil.objetivo)} sufijo={` ${u}`} />}
            </div>
            <p className="text-[13px] text-tenue">Promedio de 7 días · meta: {perfil.objetivo === 'bajar' ? 'bajar grasa' : perfil.objetivo === 'subir' ? 'subir masa' : 'mantener'}</p>
            {tabla ? (
              <table className="num mt-2 w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-tenue"><th className="py-1.5">Fecha</th><th className="text-right">Pesaje</th><th className="text-right">Promedio 7 d</th></tr></thead>
                <tbody>{[...diariosRango].reverse().map((d) => (
                  <tr key={d.fecha} className="border-t border-borde"><td className="py-1.5">{fechaCorta(d.fecha)}</td><td className="text-right">{fmt(deKg(d.valor, u))}</td><td className="text-right">{fmt(deKg(promedio.find((p) => p.fecha === d.fecha)!.valor, u))}</td></tr>
                ))}</tbody>
              </table>
            ) : (
              <>
                <p className="mb-0.5 mt-1 flex gap-3.5 text-[13px] text-tenue">
                  <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[7px] w-[7px] rounded-full bg-[var(--chart-deemph)]" />Pesaje diario</span>
                  <span className="inline-flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 rounded bg-marca" />Promedio 7 días</span>
                </p>
                <GraficaLinea
                  aria="Peso corporal diario y promedio de 7 días"
                  contexto={diariosRango.map((d) => ({ x: ejes.pos(d.fecha), y: deKg(d.valor, u), titulo: `${fechaCorta(d.fecha)}: ${fmt(deKg(d.valor, u))} ${u}` }))}
                  linea={enRango.map((d) => ({ x: ejes.pos(d.fecha), y: deKg(d.valor, u), titulo: `${fechaCorta(d.fecha)}: promedio ${fmt(deKg(d.valor, u))} ${u}` }))}
                  etiquetasX={ejes.etiquetas}
                  etiquetaFinal={`${fmt(deKg(actual.valor, u))} ${u}`}
                  formatoY={(v) => fmt(v, 1)}
                />
              </>
            )}
          </>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <TileAdherencia titulo="Entrenos cumplidos" a={adherencia?.entrenos} />
        <TileAdherencia titulo="Comidas cumplidas" a={adherencia?.comidas ?? undefined} vacio={adherencia && !adherencia.comidas ? 'Sin dieta' : undefined} />
      </div>

      <section className="tarjeta" aria-label="Medidas">
        <div className="flex items-baseline gap-2"><h2 className="titulo text-xl">Medidas</h2>
          {ultimaMed && previaMed && previaMed !== ultimaMed && <span className="ml-auto text-[13px] text-tenue">vs {fechaCorta(previaMed.fecha)}</span>}</div>
        {!ultimaMed ? (
          <p className="py-2 text-sm text-tenue">Aún no hay medidas. Mídete cada 2 a 4 semanas, a la misma hora.</p>
        ) : (
          <table className="num mt-1.5 w-full">
            <thead><tr className="text-xs uppercase tracking-wide text-tenue"><th className="py-1.5 text-left">Medida</th><th className="text-right">Actual</th><th className="text-right">Cambio</th></tr></thead>
            <tbody>
              {MEDIDAS.filter((m) => ultimaMed.medidasCm?.[m.clave] != null).map((m) => {
                const v = ultimaMed.medidasCm[m.clave]!; const antes = previaMed?.medidasCm?.[m.clave];
                const d = antes != null && previaMed !== ultimaMed ? v - antes : null;
                return (
                  <tr key={m.clave} className="border-t border-borde">
                    <td className="py-2 font-semibold">{m.nombre}</td><td className="text-right">{fmtMedida(v, perfil)}</td>
                    <td className="text-right">{d != null ? <Delta valor={perfil.unidadMedida === 'in' ? d / 2.54 : d} sentido={sentidoCambio(m.clave, d, perfil.objetivo)} sufijo="" /> : '—'}</td>
                  </tr>
                );
              })}
              {ultimaMed.grasaPct != null && (
                <tr className="border-t border-borde">
                  <td className="py-2 font-semibold">% grasa</td><td className="text-right">{fmt(ultimaMed.grasaPct)} %</td>
                  <td className="text-right">{previaMed?.grasaPct != null && previaMed !== ultimaMed ? <Delta valor={ultimaMed.grasaPct - previaMed.grasaPct} sentido={sentidoCambio('grasa', ultimaMed.grasaPct - previaMed.grasaPct, perfil.objetivo)} sufijo="" /> : '—'}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      <CheckInSemanal perfil={perfil} />
    </>
  );
}

function fmtMedida(cm: number, perfil: Perfil) { return perfil.unidadMedida === 'in' ? `${fmt(cm / 2.54)} in` : `${fmt(cm)} cm`; }

function TileAdherencia({ titulo, a, vacio }: { titulo: string; a?: { pct: number; hechos: number; esperados: number; porSemana: { pct: number }[] }; vacio?: string }) {
  return (
    <section className="tarjeta !p-3" aria-label={titulo}>
      <p className="text-[13px] text-tenue">{titulo}</p>
      {vacio ? <p className="mt-2 text-sm text-tenue">{vacio}</p> : a ? (
        <>
          <p className="my-0.5 font-titulo text-[32px] font-bold leading-tight">{a.pct}%<small className="text-[15px] text-tenue"> {a.hechos}/{a.esperados}</small></p>
          <Sparkline valores={a.porSemana.map((s) => s.pct)} aria={`${titulo} por semana`} />
        </>
      ) : null}
    </section>
  );
}

function Fuerza({ desde, hoy, perfil }: { desde: string; hoy: string; perfil: Perfil }) {
  const catalogo = useCatalogo();
  const series = useLiveQuery(() => db.series.toArray(), []);
  const [elegido, setElegido] = useState<string | null>(null);
  const [tabla, setTabla] = useState(false);
  const [semana, setSemana] = useState(inicioSemana(hoy));
  const u = perfil.unidadPeso;

  const ejercicios = useMemo(() => {
    const cuenta = new Map<string, Set<string>>();
    for (const s of series ?? []) if (s.hecha && s.peso != null) { if (!cuenta.has(s.ejercicioId)) cuenta.set(s.ejercicioId, new Set()); cuenta.get(s.ejercicioId)!.add(s.sesionId); }
    return [...cuenta.entries()].sort((a, b) => b[1].size - a[1].size).map(([id]) => id);
  }, [series]);
  const actualId = elegido && ejercicios.includes(elegido) ? elegido : ejercicios[0];
  const fuerza = useMemo(() => progresoFuerza((series ?? []).filter((s) => s.ejercicioId === actualId)), [series, actualId]);
  const puntos = fuerza.puntos.filter((p) => p.fecha >= desde);
  const ejes = ejesX(desde, hoy);

  const prs = useMemo(() => {
    const res: { id: string; fecha: string; peso: number; reps: number; unidad: string; valorKg: number; metrica: string }[] = [];
    for (const id of ejercicios) {
      const f = progresoFuerza((series ?? []).filter((s) => s.ejercicioId === id));
      for (const p of f.puntos) if (p.esPR && p.fecha >= desde) res.push({ id, fecha: p.fecha, peso: p.peso, reps: p.reps, unidad: p.unidad, valorKg: p.valorKg, metrica: f.metrica });
    }
    return res.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);
  }, [ejercicios, series, desde]);

  const volumen = useMemo(() => volumenSemanal(series ?? [], (id) => catalogo.get(id)?.grupos ?? [], semana), [series, catalogo, semana]);
  const filas = GRUPOS.filter((g) => g !== 'cuerpo_completo' && (volumen[g] ?? 0) + (perfil.rangosSeries[g]?.[0] ?? RANGOS_SERIES_DEFECTO[g][0]) > 0 && ((volumen[g] ?? 0) > 0 || catalogoUsaGrupo(catalogo, g)))
    .map((g) => { const [min, max] = perfil.rangosSeries[g] ?? RANGOS_SERIES_DEFECTO[g]; return { nombre: NOMBRE_GRUPO[g], valor: volumen[g] ?? 0, min, max }; });

  if (series === undefined) return null;
  if (!ejercicios.length) return <Vacio titulo="Aún no hay entrenos"><p>Registra tus series en Entreno y aquí verás tu fuerza, récords y series por grupo.</p></Vacio>;
  const ultimo = puntos[puntos.length - 1];
  const primero = puntos[0];
  return (
    <>
      <section className="tarjeta" aria-label="Fuerza por ejercicio">
        <div className="flex items-baseline gap-2"><h2 className="titulo text-xl">{fuerza.metrica === '1rm' ? 'Máximo estimado (1RM)' : 'Mejor peso'}</h2><BotonTabla abierta={tabla} onClick={() => setTabla((x) => !x)} /></div>
        <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Ejercicio">
          {ejercicios.map((id) => (
            <button key={id} role="radio" aria-checked={id === actualId} onClick={() => setElegido(id)}
              className={`chip min-h-9 shrink-0 ${id === actualId ? 'border border-marca/50 bg-marca/15 text-marca-texto' : 'bg-atenuado text-tenue'}`}>{catalogo.get(id)?.nombre ?? '…'}</button>
          ))}
        </div>
        {!ultimo ? <p className="py-3 text-sm text-tenue">Sin sesiones de este ejercicio en el periodo.</p> : (
          <>
            <div className="my-1.5 flex items-end gap-3">
              <p className="font-titulo text-[52px] font-bold leading-[0.9]">{fmt(deKg(ultimo.valorKg, u))}<small className="text-[22px] text-tenue"> {u}</small></p>
              {primero !== ultimo && <Delta valor={deKg(ultimo.valorKg - primero.valorKg, u)} sentido={ultimo.valorKg >= primero.valorKg ? (ultimo.valorKg > primero.valorKg ? 1 : 0) : -1} sufijo={` ${u}`} />}
            </div>
            <p className="text-[13px] text-tenue">{fuerza.metrica === '1rm' ? 'Calculado con tu mejor serie de cada sesión' : 'Este ejercicio va a reps altas: se muestra tu mejor peso'}</p>
            {tabla ? (
              <table className="num mt-2 w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-tenue"><th className="py-1.5">Fecha</th><th className="text-right">Mejor serie</th><th className="text-right">{fuerza.metrica === '1rm' ? '1RM est.' : 'Peso'}</th></tr></thead>
                <tbody>{[...puntos].reverse().map((p) => (
                  <tr key={p.sesionId} className="border-t border-borde"><td className="py-1.5">{fechaCorta(p.fecha)}{p.esPR && <Trophy size={13} className="ml-1 inline text-ok" aria-label="récord" />}</td><td className="text-right">{fmt(p.peso)} {p.unidad} × {p.reps}</td><td className="text-right">{fmt(deKg(p.valorKg, u))}</td></tr>
                ))}</tbody>
              </table>
            ) : (
              <GraficaLinea
                aria={`${fuerza.metrica === '1rm' ? 'Máximo estimado' : 'Mejor peso'} de ${catalogo.get(actualId)?.nombre} por sesión`}
                linea={puntos.map((p) => ({ x: ejes.pos(p.fecha), y: deKg(p.valorKg, u), marcado: p.esPR, titulo: `${fechaCorta(p.fecha)}: ${fmt(p.peso)} ${p.unidad} × ${p.reps}${p.esPR ? ' · récord' : ''}` }))}
                etiquetasX={ejes.etiquetas}
                etiquetaFinal={ultimo.esPR ? `PR ${fmt(deKg(ultimo.valorKg, u), 0)}` : fmt(deKg(ultimo.valorKg, u), 0)}
              />
            )}
          </>
        )}
      </section>

      <section className="tarjeta" aria-label="Récords recientes">
        <h2 className="titulo text-xl">Récords recientes</h2>
        {!prs.length ? <p className="py-2 text-sm text-tenue">Aún no hay récords en este periodo. Se marcan cuando superas tu mejor marca anterior.</p> : (
          <ul>
            {prs.map((p, i) => (
              <li key={`${p.id}-${p.fecha}`} className={`flex items-center gap-2.5 py-2.5 ${i ? 'border-t border-borde' : ''}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-ok/15 text-ok"><Trophy size={18} aria-hidden /></span>
                <p className="min-w-0 flex-1 font-semibold leading-tight">{catalogo.get(p.id)?.nombre}<small className="block font-normal text-tenue">{fmt(p.peso)} {p.unidad} × {p.reps} · {fechaCorta(p.fecha)}</small></p>
                <p className="num text-right font-titulo text-xl font-bold leading-tight">{fmt(deKg(p.valorKg, u), 0)} {u}<small className="block font-sans text-xs font-medium text-tenue">{p.metrica === '1rm' ? '1RM est.' : 'mejor peso'}</small></p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tarjeta" aria-label="Series por grupo">
        <div className="flex items-baseline gap-2">
          <h2 className="titulo text-xl">Series por grupo</h2>
          <div className="ml-auto flex gap-1" role="radiogroup" aria-label="Semana">
            {[inicioSemana(hoy), sumarDias(inicioSemana(hoy), -7)].map((s, i) => (
              <button key={s} role="radio" aria-checked={semana === s} onClick={() => setSemana(s)}
                className={`chip min-h-8 !px-2.5 !text-xs ${semana === s ? 'bg-azul text-sobre-azul' : 'bg-atenuado text-tenue'}`}>{i === 0 ? 'Esta semana' : 'Anterior'}</button>
            ))}
          </div>
        </div>
        <p className="mb-1 mt-1.5 flex gap-3.5 text-xs text-tenue">
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-[3px] bg-acento" />Series hechas</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-3.5 rounded-[3px] border border-borde bg-atenuado" />Rango sugerido</span>
          <span className="ml-auto">secundarios = ½</span>
        </p>
        {filas.length ? <BarrasRango filas={filas} alertas={semana !== inicioSemana(hoy)} aria="Series por grupo muscular contra el rango sugerido" /> : <p className="py-2 text-sm text-tenue">Sin series esta semana.</p>}
        <p className="mt-2 text-xs text-tenue">
          {semana === inicioSemana(hoy) ? 'Semana en curso: los avisos de grupos cortos salen al terminar la semana. ' : ''}
          Los rangos son generales; ajústalos en Perfil o con lo que diga tu coach.
        </p>
      </section>
    </>
  );
}

function catalogoUsaGrupo(catalogo: Map<string, { grupos: string[] }>, g: string) {
  for (const e of catalogo.values()) if (e.grupos[0] === g) return true;
  return false;
}
