import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, Clock, FileUp, Play, SlidersHorizontal, Trophy, UtensilsCrossed } from 'lucide-react';
import { Encabezado } from '../../componentes/Encabezado';
import { Mensaje, Vacio } from '../../componentes/ui';
import { db, actualizarPerfil, type DiaPlan, type EjercicioPlan, type Perfil, type RutinaGuardada, type Sesion } from '../../db/db';
import { useCatalogo, useDietaActiva, usePerfil, useRutinaActiva } from '../../db/hooks';
import { cancelarSesion, iniciarSesion, resumenSesion, terminarSesion, type Resumen } from '../../db/sesiones';
import { siguienteDia } from '../../lib/entreno';
import { fechaCorta, fechaLarga, hoyISO } from '../../lib/fechas';
import { describirBloque, seriesEfectivas } from '../../lib/plan';
import { useTemporizador } from '../../lib/temporizador';
import { deKg, fmt } from '../../lib/unidades';
import { TarjetaEjercicio } from './TarjetaEjercicio';
import { TarjetaCardio } from './TarjetaCardio';

export function Entreno() {
  const perfil = usePerfil();
  const rutina = useRutinaActiva();
  const abierta = useLiveQuery(async () => (await db.sesiones.filter((s) => s.fin === null).first()) ?? null, []);
  const rutinaDeAbierta = useLiveQuery(async () => (abierta ? (await db.rutinas.get(abierta.rutinaId)) ?? null : null), [abierta?.rutinaId]);

  if (rutina === undefined || abierta === undefined) return <Encabezado titulo="Entreno" />;
  if (abierta && rutinaDeAbierta) return <SesionEnCurso sesion={abierta} rutina={rutinaDeAbierta} perfil={perfil} />;
  if (!rutina) {
    return (
      <>
        <Encabezado titulo="Entreno" subtitulo={fechaLarga(hoyISO())} />
        <div className="px-4">
          <Vacio titulo="Aún no tienes rutina">
            <p>Importa la rutina que te mandó tu coach y aquí verás qué te toca hoy.</p>
            <Link to="/importar" className="btn btn-marca mt-4 w-full"><FileUp size={20} aria-hidden /> Importar rutina</Link>
          </Vacio>
        </div>
      </>
    );
  }
  return <InicioEntreno rutina={rutina} perfil={perfil} />;
}

function InicioEntreno({ rutina, perfil }: { rutina: RutinaGuardada; perfil: Perfil }) {
  const hoy = hoyISO();
  const ultima = useLiveQuery(
    async () => (await db.sesiones.orderBy('inicio').reverse().filter((s) => s.rutinaId === rutina.id && s.fin !== null).first()) ?? null,
    [rutina.id],
  );
  const deHoy = useLiveQuery(() => db.sesiones.where('fecha').equals(hoy).filter((s) => s.fin !== null).toArray(), [hoy]) ?? [];
  const sugerido = useMemo(() => siguienteDia(rutina.dias, ultima?.diaId ?? null, hoy), [rutina, ultima, hoy]);
  const [elegido, setElegido] = useState<string | null>(null);
  const dia = rutina.dias.find((d) => d.id === (elegido ?? sugerido.id)) ?? rutina.dias[0];

  return (
    <>
      <Encabezado titulo="Entreno" subtitulo={fechaLarga(hoy)} />
      <div className="space-y-4 px-4">
        {deHoy.map((s) => <ResumenDeHoy key={s.id} sesion={s} rutina={rutina} perfil={perfil} />)}

        <section className="superficie-marca overflow-hidden">
          <p className="text-sm text-tenue">{elegido && elegido !== sugerido.id ? 'Elegiste' : deHoy.length ? 'Siguiente' : 'Hoy toca'}</p>
          <h2 className="titulo mt-0.5 text-[30px] leading-none">{dia.nombre}</h2>
          <p className="mt-2 text-sm text-tenue">
            {dia.ejercicios.length} ejercicios · {dia.ejercicios.reduce((s, e) => s + seriesEfectivas(e), 0)} series
            {dia.cardio.length > 0 && ` · cardio ${dia.cardio.map((c) => `${c.meta_valor} ${c.meta_tipo === 'tiempo' ? 'min' : c.meta_tipo === 'calorias' ? 'kcal' : 'km'}`).join(' + ')}`}
          </p>
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Elegir día">
            {rutina.dias.map((d) => (
              <button key={d.id} role="radio" aria-checked={d.id === dia.id} onClick={() => setElegido(d.id)}
                className={`chip min-h-10 shrink-0 !px-3.5 ${d.id === dia.id ? 'bg-azul text-sobre-azul' : 'bg-white/10 text-tinta'}`}>
                Día {d.id.slice(1)}{d.id === sugerido.id ? ' •' : ''}
              </button>
            ))}
          </div>
          <button className="btn btn-marca mt-4 w-full" onClick={() => iniciarSesion(rutina, dia.id)}>
            <Play size={20} aria-hidden /> Empezar entreno
          </button>
        </section>

        <section className="tarjeta">
          <ol className="space-y-2.5">
            {dia.ejercicios.map((e) => (
              <li key={e.orden} className="flex gap-3">
                <span className="w-5 shrink-0 text-right font-titulo text-lg text-tenue">{e.orden}</span>
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">{e.nombre}{e.grupo && <span className="chip ml-2 bg-azul/20 !py-0.5 text-acento">Biserie {e.grupo}</span>}</p>
                  <p className="num text-sm text-tenue">{e.bloques.map(describirBloque).join(' · ')}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <p className="pb-2 text-center text-xs text-tenue">
          Rutina «{rutina.nombre}» · desde el {fechaCorta(rutina.importada.slice(0, 10))} · <Link to="/plan/rutina/editar" className="font-semibold text-acento">Editar rutina</Link>
        </p>
      </div>
    </>
  );
}

function SesionEnCurso({ sesion, rutina, perfil }: { sesion: Sesion; rutina: RutinaGuardada; perfil: Perfil }) {
  const catalogo = useCatalogo();
  const temporizador = useTemporizador();
  const series = useLiveQuery(() => db.series.where('sesionId').equals(sesion.id).toArray(), [sesion.id]) ?? [];
  const cardio = useLiveQuery(() => db.cardio.where('sesionId').equals(sesion.id).toArray(), [sesion.id]) ?? [];
  const dieta = useDietaActiva();
  const dia = rutina.dias.find((d) => d.id === sesion.diaId) as DiaPlan;
  const [notas, setNotas] = useState(sesion.notas);
  const [ajustes, setAjustes] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const minutos = useMinutos(sesion.inicio);

  const completos = dia.ejercicios.filter((e) => series.filter((s) => s.orden === e.orden && s.hecha).length >= e.bloques.reduce((x, b) => x + b.series, 0)).length;
  const tipoDieta = dieta && dia.tipo_dia_dieta ? dieta.tipos_dia.find((t) => t.id === dia.tipo_dia_dieta) : null;

  function alHacerSerie(ej: EjercicioPlan) {
    const grupo = ej.grupo ? dia.ejercicios.filter((e) => e.grupo === ej.grupo) : [ej];
    const ultimoDelGrupo = grupo[grupo.length - 1].orden === ej.orden;
    if (!ultimoDelGrupo) {
      const sig = grupo[grupo.findIndex((e) => e.orden === ej.orden) + 1];
      temporizador.detener();
      setAviso(`Sigue con ${catalogo.get(sig.ejercicioId)?.nombre ?? sig.nombre}`);
      return;
    }
    setAviso(null);
    const descanso = Math.max(...grupo.map((e) => e.descanso_seg ?? 0)) || perfil.descansoDefectoSeg;
    temporizador.iniciar(descanso, ej.grupo ? `biserie ${ej.grupo}` : (catalogo.get(ej.ejercicioId)?.nombre ?? ej.nombre));
  }
  useEffect(() => { if (aviso) { const t = setTimeout(() => setAviso(null), 6000); return () => clearTimeout(t); } }, [aviso]);

  async function terminar() {
    temporizador.detener();
    await terminarSesion(sesion.id, notas);
  }
  async function cancelar() {
    if (!confirm('¿Cancelar este entreno? Se borran las series que registraste hoy en él.')) return;
    temporizador.detener();
    await cancelarSesion(sesion.id);
  }

  return (
    <>
      <Encabezado
        titulo="Entreno"
        subtitulo={sesion.fecha === hoyISO() ? fechaLarga(sesion.fecha) : `Sin terminar · ${fechaLarga(sesion.fecha)}`}
        accion={
          <button className="grid h-11 w-11 place-items-center rounded-xl bg-tarjeta text-tenue" onClick={() => setAjustes((x) => !x)} aria-expanded={ajustes} aria-label="Campos a registrar">
            <SlidersHorizontal size={20} aria-hidden />
          </button>
        }
      />
      <div className="space-y-3.5 px-4">
        {ajustes && <AjustesCampos perfil={perfil} />}
        <section className="superficie-marca">
          <h2 className="titulo text-[28px] leading-none">{dia.nombre}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="chip bg-ok/15 text-ok"><CheckCircle2 size={15} aria-hidden /> {completos} de {dia.ejercicios.length} ejercicios</span>
            <span className="chip bg-white/10 text-tinta"><Clock size={15} aria-hidden /> {minutos} min</span>
            {tipoDieta && <span className="chip bg-azul text-sobre-azul"><UtensilsCrossed size={15} aria-hidden /> Dieta: {tipoDieta.nombre}</span>}
          </div>
          {rutina.notasGenerales && <p className="mt-3 text-xs text-tenue">{rutina.notasGenerales}</p>}
        </section>

        {dia.cardio.filter((c) => c.momento === 'antes').map((c) => {
          const i = dia.cardio.indexOf(c);
          return <TarjetaCardio key={`c${i}-${cardio.find((x) => x.indice === i)?.id ?? 'n'}`} plan={c} indice={i} sesion={sesion} registro={cardio.find((x) => x.indice === i)} />;
        })}
        {dia.ejercicios.map((e) => (
          <TarjetaEjercicio key={e.orden} ej={e} sesion={sesion} perfil={perfil} catalogo={catalogo} seriesSesion={series} onSerieHecha={alHacerSerie} />
        ))}
        {dia.cardio.filter((c) => c.momento !== 'antes').map((c) => {
          const i = dia.cardio.indexOf(c);
          return <TarjetaCardio key={`c${i}-${cardio.find((x) => x.indice === i)?.id ?? 'n'}`} plan={c} indice={i} sesion={sesion} registro={cardio.find((x) => x.indice === i)} />;
        })}

        <label className="block">
          <span className="etiqueta">Notas del entreno</span>
          <textarea className="campo min-h-20 py-2.5" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Cómo te sentiste, molestias, máquinas que cambiaste…" />
        </label>
        <button className="btn btn-marca w-full" onClick={terminar}><CheckCircle2 size={20} aria-hidden /> Terminar entreno</button>
        <button className="btn w-full !text-base text-peligro" onClick={cancelar}>Cancelar entreno</button>
      </div>
      {aviso && (
        <div role="status" className="fixed inset-x-3 bottom-[calc(var(--nav-ocupa)+18px)] z-40 mx-auto max-w-[552px] rounded-2xl bg-azul px-4 py-3 font-semibold text-sobre-azul shadow-[var(--shadow-2)]">
          Biserie: {aviso}
        </div>
      )}
    </>
  );
}

function AjustesCampos({ perfil }: { perfil: Perfil }) {
  const opciones: { k: keyof Perfil['campos']; t: string }[] = [
    { k: 'rir', t: 'RIR' }, { k: 'tempo', t: 'Tempo' }, { k: 'descanso', t: 'Descanso real' },
  ];
  return (
    <section className="tarjeta">
      <p className="font-semibold">Qué registrar en cada serie</p>
      <p className="text-sm text-tenue">Peso y reps siempre. Activa lo demás cuando lo necesites.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {opciones.map(({ k, t }) => (
          <button key={k} aria-pressed={perfil.campos[k]} onClick={() => actualizarPerfil({ campos: { ...perfil.campos, [k]: !perfil.campos[k] } })}
            className={`chip min-h-10 !px-4 ${perfil.campos[k] ? 'bg-azul text-sobre-azul' : 'bg-atenuado text-tenue'}`}>{t}</button>
        ))}
      </div>
    </section>
  );
}

function ResumenDeHoy({ sesion, rutina, perfil }: { sesion: Sesion; rutina: RutinaGuardada; perfil: Perfil }) {
  const catalogo = useCatalogo();
  const [r, setR] = useState<Resumen | null>(null);
  useEffect(() => { resumenSesion(sesion).then(setR); }, [sesion]);
  const dia = rutina.dias.find((d) => d.id === sesion.diaId);
  if (!r) return null;
  const u = perfil.unidadPeso;
  return (
    <Mensaje tono="ok" titulo={`Entreno terminado: ${dia?.nombre ?? sesion.diaId}`}>
      <p className="num">{r.minutos} min · {r.ejercicios} ejercicios · {r.series} series · {fmt(deKg(r.volumenKg, u), 0)} {u} movidos</p>
      {r.prs.length > 0 && (
        <ul className="mt-2 space-y-1">
          {r.prs.map((p) => (
            <li key={p.ejercicioId} className="flex items-center gap-2 font-semibold text-oro">
              <span className="insignia-oro grid h-6 w-6 shrink-0 place-items-center rounded-full"><Trophy size={14} aria-hidden /></span> Récord en {catalogo.get(p.ejercicioId)?.nombre ?? 'ejercicio'}: {fmt(p.peso)} {p.unidad} × {p.reps}
              <span className="font-normal text-tenue">(1RM est. {fmt(deKg(p.unoRMKg, u))} {u})</span>
            </li>
          ))}
        </ul>
      )}
    </Mensaje>
  );
}

function useMinutos(inicio: number) {
  const [m, setM] = useState(() => Math.floor((Date.now() - inicio) / 60000));
  useEffect(() => { const id = setInterval(() => setM(Math.floor((Date.now() - inicio) / 60000)), 15000); return () => clearInterval(id); }, [inicio]);
  return m;
}
