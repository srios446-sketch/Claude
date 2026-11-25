import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileDown, ImageDown } from 'lucide-react';
import { db, type Perfil } from '../../db/db';
import { BRAND } from '../../config/brand';
import { GraficaLinea } from '../../componentes/graficas';
import { adherenciaComidas, adherenciaEntrenos, MEDIDAS, progresoFuerza } from '../../lib/progreso';
import { diasEntre, fechaCorta, hoyISO, inicioSemana, sumarDias } from '../../lib/fechas';
import { deKg, fmt } from '../../lib/unidades';
import { resumenPeso } from './datos';

const PREGUNTAS = [
  { k: 'energia', t: 'Energía', bajo: 'Agotada', alto: 'Al 100' },
  { k: 'sueno', t: 'Sueño', bajo: 'Muy mal', alto: 'Excelente' },
  { k: 'hambre', t: 'Hambre', bajo: 'Nada', alto: 'Muchísima' },
  { k: 'estres', t: 'Estrés', bajo: 'Nada', alto: 'Muchísimo' },
] as const;
type Clave = (typeof PREGUNTAS)[number]['k'];

export function CheckInSemanal({ perfil }: { perfil: Perfil }) {
  const semana = inicioSemana(hoyISO());
  const guardado = useLiveQuery(async () => (await db.checkins.get(semana)) ?? null, [semana]);
  const [v, setV] = useState<Record<Clave, number>>({ energia: 7, sueno: 7, hambre: 5, estres: 5 });
  const [notas, setNotas] = useState('');
  const [datos, setDatos] = useState<DatosReporte | null>(null);
  const [formato, setFormato] = useState<'pdf' | 'png'>('pdf');
  const [estado, setEstado] = useState<string | null>(null);

  useEffect(() => {
    if (guardado) { setV({ energia: guardado.energia, sueno: guardado.sueno, hambre: guardado.hambre, estres: guardado.estres }); setNotas(guardado.notas); }
  }, [guardado]);

  const guardar = (cambios: Partial<Record<Clave, number>> = {}, n = notas) =>
    db.checkins.put({ semana, ...v, ...cambios, notas: n, actualizado: Date.now() });

  async function generar(f: 'pdf' | 'png') {
    await guardar();
    setFormato(f); setEstado('Generando…');
    setDatos(await reunirDatos(semana, perfil, v, notas));
  }

  if (guardado === undefined) return null;
  return (
    <section className="tarjeta" aria-label="Check-in semanal">
      <div className="flex items-baseline gap-2"><h2 className="titulo text-xl">Check-in semanal</h2><span className="ml-auto text-[13px] text-tenue">Semana del {fechaCorta(semana)}</span></div>
      <p className="text-sm text-tenue">Del 1 al 10, ¿cómo estuvo tu semana?</p>
      <div className="mt-3 space-y-3">
        {PREGUNTAS.map((p) => (
          <label key={p.k} className="block">
            <span className="flex items-baseline justify-between text-sm font-semibold">{p.t} <b className="font-titulo text-xl">{v[p.k]}</b></span>
            <input type="range" min={1} max={10} step={1} value={v[p.k]} className="mt-1 w-full accent-[var(--color-primary)]"
              onChange={(e) => setV((x) => ({ ...x, [p.k]: Number(e.target.value) }))}
              onPointerUp={(e) => guardar({ [p.k]: Number((e.target as HTMLInputElement).value) })}
              onKeyUp={(e) => guardar({ [p.k]: Number((e.target as HTMLInputElement).value) })}
              aria-valuetext={`${v[p.k]} de 10`} />
            <span className="flex justify-between text-[11px] text-tenue" aria-hidden><span>{p.bajo}</span><span>{p.alto}</span></span>
          </label>
        ))}
        <label className="block">
          <span className="etiqueta">Notas para tu coach</span>
          <textarea className="campo min-h-20 py-2.5" value={notas} onChange={(e) => setNotas(e.target.value)} onBlur={() => guardar({}, notas)}
            placeholder="Cómo te sentiste, molestias, antojos, cambios de horario…" />
        </label>
      </div>
      <button className="btn btn-marca mt-3 w-full" onClick={() => generar('pdf')} disabled={!!estado}><FileDown size={20} aria-hidden /> {estado ?? 'Generar PDF para el coach'}</button>
      <button className="btn btn-suave mt-2 w-full !text-base" onClick={() => generar('png')} disabled={!!estado}><ImageDown size={18} aria-hidden /> Guardar como imagen</button>
      {datos && createPortal(
        <Captura datos={datos} formato={formato} onListo={(msg) => { setDatos(null); setEstado(null); if (msg) alert(msg); }} />,
        document.body,
      )}
    </section>
  );
}

interface DatosReporte {
  nombre: string; semana: string; unidad: 'kg' | 'lb';
  peso: { actual: number | null; vsSemana: number | null; vs4: number | null; serie: { fecha: string; valor: number }[]; diarios: { fecha: string; valor: number }[] };
  entrenos: { hechos: number; esperados: number; lista: string[] };
  comidas: number | null;
  medidas: { nombre: string; valor: string }[];
  prs: string[];
  respuestas: Record<Clave, number>; notas: string;
}

async function reunirDatos(semana: string, perfil: Perfil, respuestas: Record<Clave, number>, notas: string): Promise<DatosReporte> {
  const fin = sumarDias(semana, 6);
  const hoy = hoyISO();
  const hasta = fin < hoy ? fin : hoy;
  const metricas = await db.metricas.orderBy('fecha').toArray();
  const { promedio, diarios } = resumenPeso(metricas);
  const en = (f: string) => [...promedio].reverse().find((p) => p.fecha <= f)?.valor ?? null;
  const actual = en(hasta), semanaAntes = en(sumarDias(hasta, -7)), antes4 = en(sumarDias(hasta, -28));
  const rutina = await db.rutinas.where('activa').equals(1).first();
  const sesiones = await db.sesiones.where('fecha').between(semana, hasta, true, true).filter((s) => s.fin !== null).sortBy('inicio');
  const entrenos = adherenciaEntrenos([...new Set(sesiones.map((s) => s.fecha))], Math.min(7, rutina?.dias.length ?? 4), semana, hasta);
  const dieta = await db.dietas.where('activa').equals(1).first();
  let comidas: number | null = null;
  if (dieta) {
    const regs = await db.registroDieta.where('fecha').between(semana, hasta, true, true).toArray();
    const dias = [];
    for (let f = semana; f <= hasta; f = sumarDias(f, 1)) {
      const r = regs.find((x) => x.fecha === f);
      const tipo = dieta.tipos_dia.find((t) => t.id === r?.tipoDiaId) ?? dieta.tipos_dia[0];
      dias.push({ fecha: f, hechas: r ? tipo.comidas.filter((c) => r.comidas?.[c.orden]).length : 0, total: tipo.comidas.length });
    }
    comidas = adherenciaComidas(dias, semana, hasta).pct;
  }
  const ultimaMed = [...metricas].reverse().find((m) => Object.keys(m.medidasCm ?? {}).length || m.grasaPct != null);
  const medidas = ultimaMed ? [
    ...MEDIDAS.filter((m) => ultimaMed.medidasCm[m.clave] != null).map((m) => ({ nombre: m.nombre, valor: perfil.unidadMedida === 'in' ? `${fmt(ultimaMed.medidasCm[m.clave]! / 2.54)} in` : `${fmt(ultimaMed.medidasCm[m.clave]!)} cm` })),
    ...(ultimaMed.grasaPct != null ? [{ nombre: '% grasa', valor: `${fmt(ultimaMed.grasaPct)} %` }] : []),
  ] : [];
  const catalogo = new Map((await db.ejercicios.toArray()).map((e) => [e.id, e.nombre]));
  const todas = await db.series.toArray();
  const prs: string[] = [];
  for (const id of new Set(todas.map((s) => s.ejercicioId))) {
    for (const p of progresoFuerza(todas.filter((s) => s.ejercicioId === id)).puntos) {
      if (p.esPR && p.fecha >= semana && p.fecha <= hasta) prs.push(`${catalogo.get(id)}: ${fmt(p.peso)} ${p.unidad} × ${p.reps}`);
    }
  }
  const u = perfil.unidadPeso;
  const conv = (x: number | null) => (x == null ? null : deKg(x, u));
  return {
    nombre: perfil.nombre, semana, unidad: u,
    peso: {
      actual: conv(actual), vsSemana: actual != null && semanaAntes != null ? deKg(actual - semanaAntes, u) : null, vs4: actual != null && antes4 != null ? deKg(actual - antes4, u) : null,
      serie: promedio.filter((p) => p.fecha >= sumarDias(hasta, -55)).map((p) => ({ fecha: p.fecha, valor: deKg(p.valor, u) })),
      diarios: diarios.filter((p) => p.fecha >= sumarDias(hasta, -55)).map((p) => ({ fecha: p.fecha, valor: deKg(p.valor, u) })),
    },
    entrenos: { hechos: entrenos.hechos, esperados: entrenos.esperados, lista: sesiones.map((s) => `${fechaCorta(s.fecha)} · ${rutina?.dias.find((d) => d.id === s.diaId)?.nombre ?? s.diaId}`) },
    comidas, medidas, prs, respuestas, notas,
  };
}

const TEMA_CLARO = {
  '--color-card': '#FFFFFF', '--color-foreground': '#0F172A', '--color-muted-foreground': '#475569', '--chart-grid': '#E2E8F0',
  '--chart-deemph': '#94A3B8', '--color-muted': '#F1F5F9', '--color-border': '#E2E8F0',
} as React.CSSProperties;

function Captura({ datos, formato, onListo }: { datos: DatosReporte; formato: 'pdf' | 'png'; onListo: (msg?: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const listo = useRef(onListo);
  listo.current = onListo;
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        await document.fonts.ready;
        const { toPng } = await import('html-to-image');
        const url = await toPng(ref.current!, { pixelRatio: 2, backgroundColor: '#FFFFFF', cacheBust: true });
        if (cancelado) return;
        const nombre = `check-in-${datos.semana}`;
        let archivo: File;
        if (formato === 'png') {
          archivo = new File([await (await fetch(url)).blob()], `${nombre}.png`, { type: 'image/png' });
        } else {
          const { jsPDF } = await import('jspdf');
          const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
          const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
          const nodo = ref.current!;
          const alto = (nodo.offsetHeight * W) / nodo.offsetWidth;
          const escala = alto > H ? H / alto : 1;
          pdf.addImage(url, 'PNG', (W - W * escala) / 2, 0, W * escala, alto * escala);
          archivo = new File([pdf.output('blob')], `${nombre}.pdf`, { type: 'application/pdf' });
        }
        if (navigator.canShare?.({ files: [archivo] })) {
          try { await navigator.share({ files: [archivo], title: 'Check-in semanal' }); } catch { /* cancelado */ }
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(archivo); a.download = archivo.name; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        }
        listo.current();
      } catch (e) {
        console.error(e);
        listo.current('No se pudo generar el archivo. Intenta de nuevo.');
      }
    })();
    return () => { cancelado = true; };
  }, [datos, formato]);

  const ini = datos.peso.serie[0]?.fecha ?? datos.semana;
  const total = Math.max(1, diasEntre(ini, sumarDias(datos.semana, 6)));
  const pos = (f: string) => Math.min(1, diasEntre(ini, f) / total);
  const sig = (x: number | null, u: string) => (x == null ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${fmt(Math.abs(x))} ${u}`);
  return (
    <div aria-hidden style={{ position: 'fixed', left: -10000, top: 0 }}>
      <div ref={ref} style={{ ...TEMA_CLARO, width: 794, padding: 40, background: '#fff', color: '#0F172A', fontFamily: 'Barlow, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderBottom: '4px solid #F8490C', paddingBottom: 16 }}>
          <img src={BRAND.logo} alt="" style={{ width: 64, height: 64, borderRadius: 14 }} />
          <div>
            <div style={{ fontFamily: '"Barlow Condensed"', fontWeight: 700, fontSize: 34, textTransform: 'uppercase', lineHeight: 1 }}>Check-in semanal</div>
            <div style={{ fontSize: 16, color: '#475569', marginTop: 4 }}>{datos.nombre ? `${datos.nombre} · ` : ''}Semana del {fechaCorta(datos.semana)} al {fechaCorta(sumarDias(datos.semana, 6))}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20 }}>
          {[
            ['Peso (prom. 7 d)', datos.peso.actual != null ? `${fmt(datos.peso.actual)} ${datos.unidad}` : '—'],
            ['vs semana pasada', sig(datos.peso.vsSemana, datos.unidad)],
            ['Entrenos', `${datos.entrenos.hechos} de ${datos.entrenos.esperados}`],
            ['Comidas cumplidas', datos.comidas != null ? `${datos.comidas}%` : '—'],
          ].map(([k, val]) => (
            <div key={k} style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: '#475569' }}>{k}</div>
              <div style={{ fontFamily: '"Barlow Condensed"', fontWeight: 700, fontSize: 28 }}>{val}</div>
            </div>
          ))}
        </div>
        {datos.peso.serie.length > 1 && (
          <div style={{ marginTop: 18, border: '1px solid #E2E8F0', borderRadius: 12, padding: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Peso corporal · últimas 8 semanas (cambio en 4 semanas: {sig(datos.peso.vs4, datos.unidad)})</div>
            <GraficaLinea alto={200} ancho={700} aria="Peso"
              contexto={datos.peso.diarios.map((d) => ({ x: pos(d.fecha), y: d.valor, titulo: '' }))}
              linea={datos.peso.serie.map((d) => ({ x: pos(d.fecha), y: d.valor, titulo: '' }))}
              etiquetasX={[0, 0.5, 1].map((t) => ({ x: t, texto: fechaCorta(sumarDias(ini, Math.round(t * total))) }))}
              etiquetaFinal={`${fmt(datos.peso.serie[datos.peso.serie.length - 1].valor)} ${datos.unidad}`} formatoY={(v) => fmt(v)} />
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 18 }}>
          <div>
            <h3 style={{ fontFamily: '"Barlow Condensed"', fontWeight: 700, fontSize: 22, textTransform: 'uppercase' }}>Cómo me sentí</h3>
            {PREGUNTAS.map((p) => (
              <div key={p.k} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}>
                <span style={{ width: 70 }}>{p.t}</span>
                <div style={{ flex: 1, height: 10, background: '#F1F5F9', borderRadius: 99 }}><div style={{ width: `${datos.respuestas[p.k] * 10}%`, height: 10, background: '#F8490C', borderRadius: 99 }} /></div>
                <b style={{ width: 28, textAlign: 'right' }}>{datos.respuestas[p.k]}</b>
              </div>
            ))}
            {datos.notas && <p style={{ marginTop: 10, fontSize: 14, whiteSpace: 'pre-wrap' }}><b>Notas:</b> {datos.notas}</p>}
          </div>
          <div>
            <h3 style={{ fontFamily: '"Barlow Condensed"', fontWeight: 700, fontSize: 22, textTransform: 'uppercase' }}>Entrenos de la semana</h3>
            {datos.entrenos.lista.length ? datos.entrenos.lista.map((t) => <div key={t} style={{ fontSize: 14, margin: '3px 0' }}>✓ {t}</div>) : <div style={{ fontSize: 14, color: '#475569' }}>Sin entrenos registrados.</div>}
            {datos.prs.length > 0 && (<>
              <h3 style={{ fontFamily: '"Barlow Condensed"', fontWeight: 700, fontSize: 22, textTransform: 'uppercase', marginTop: 12 }}>Récords</h3>
              {datos.prs.map((t) => <div key={t} style={{ fontSize: 14, margin: '3px 0' }}>★ {t}</div>)}
            </>)}
            {datos.medidas.length > 0 && (<>
              <h3 style={{ fontFamily: '"Barlow Condensed"', fontWeight: 700, fontSize: 22, textTransform: 'uppercase', marginTop: 12 }}>Medidas</h3>
              <div style={{ fontSize: 14 }}>{datos.medidas.map((m) => `${m.nombre} ${m.valor}`).join(' · ')}</div>
            </>)}
          </div>
        </div>
        <div style={{ marginTop: 22, fontSize: 12, color: '#94A3B8' }}>Generado con {BRAND.nombre} el {fechaCorta(hoyISO())}</div>
      </div>
    </div>
  );
}
