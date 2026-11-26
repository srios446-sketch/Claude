import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Droplets, FileUp, Minus, Pill, Plus, ShoppingCart } from 'lucide-react';
import { Encabezado } from '../componentes/Encabezado';
import { Resalte } from '../componentes/Resalte';
import { TituloSeccion, Vacio } from '../componentes/ui';
import { db, type DietaGuardada, type Perfil, type RegistroDieta } from '../db/db';
import { useDietaActiva, usePerfil, useRutinaActiva } from '../db/hooks';
import { elegirTipoDia, suplementosDelDia, textoCantidad } from '../lib/dieta';
import { siguienteDia } from '../lib/entreno';
import { fechaLarga, hoyISO } from '../lib/fechas';

export function Dieta() {
  const dieta = useDietaActiva();
  const perfil = usePerfil();
  if (dieta === undefined) return <Encabezado titulo="Dieta de hoy" />;
  if (!dieta) {
    return (
      <>
        <Encabezado titulo="Dieta de hoy" subtitulo={fechaLarga(hoyISO())} />
        <div className="px-4">
          <Vacio titulo="Aún no tienes dieta">
            <p>Importa la dieta que te mandó tu coach: con el mismo prompt de la rutina.</p>
            <Link to="/importar" className="btn btn-marca mt-4 w-full"><FileUp size={20} aria-hidden /> Importar dieta</Link>
          </Vacio>
        </div>
      </>
    );
  }
  return <DietaDeHoy dieta={dieta} perfil={perfil} />;
}

function DietaDeHoy({ dieta, perfil }: { dieta: DietaGuardada; perfil: Perfil }) {
  const hoy = hoyISO();
  const rutina = useRutinaActiva();
  const registro = useLiveQuery(async () => (await db.registroDieta.get(hoy)) ?? null, [hoy]);
  const sesionHoy = useLiveQuery(async () => (await db.sesiones.where('fecha').equals(hoy).first()) ?? null, [hoy]);
  const ultima = useLiveQuery(async () => (await db.sesiones.orderBy('inicio').reverse().filter((s) => s.fin !== null).first()) ?? null, []);
  const [cambiando, setCambiando] = useState(false);

  const eleccion = useMemo(() => {
    const diaHechoPlan = sesionHoy && rutina ? rutina.dias.find((d) => d.id === sesionHoy.diaId) : null;
    const toca = rutina && ultima !== undefined ? siguienteDia(rutina.dias, ultima?.diaId ?? null, hoy) : null;
    return elegirTipoDia(dieta, {
      manualId: registro?.tipoManual ? registro.tipoDiaId : null,
      diaHecho: diaHechoPlan ? { nombre: diaHechoPlan.nombre, tipo: diaHechoPlan.tipo_dia_dieta } : null,
      diaQueToca: toca ? { nombre: toca.nombre, tipo: toca.tipo_dia_dieta } : null,
    });
  }, [dieta, rutina, registro, sesionHoy, ultima, hoy]);

  const cargando = rutina === undefined || registro === undefined || sesionHoy === undefined || ultima === undefined;
  const tipo = eleccion.tipo;
  const comidasHechas = tipo.comidas.filter((c) => registro?.comidas?.[c.orden]).length;
  const suplementos = suplementosDelDia(dieta.suplementos, tipo.id);
  const metaAgua = (dieta.agua_litros ?? perfil.metaAguaL) * 1000;
  const agua = registro?.aguaMl ?? 0;

  async function guardar(cambios: Partial<RegistroDieta>) {
    const actual = await db.registroDieta.get(hoy);
    await db.registroDieta.put({
      fecha: hoy, dietaId: dieta.id, tipoDiaId: tipo.id, tipoManual: false, comidas: {}, suplementos: {}, aguaMl: 0,
      ...actual, ...cambios,
    });
  }
  const alternarComida = (orden: number) => guardar({ comidas: { ...registro?.comidas, [orden]: !registro?.comidas?.[orden] } });
  const alternarSuple = (nombre: string) => guardar({ suplementos: { ...registro?.suplementos, [nombre]: !registro?.suplementos?.[nombre] } });
  const sumarAgua = (ml: number) => guardar({ aguaMl: Math.max(0, agua + ml) });

  if (cargando) return <Encabezado titulo="Dieta de hoy" subtitulo={fechaLarga(hoy)} />;
  return (
    <>
      <Encabezado
        titulo="Dieta de hoy"
        subtitulo={fechaLarga(hoy)}
        accion={
          <Link to="/dieta/super" data-guia="super" className="grid h-11 w-11 place-items-center rounded-xl bg-tarjeta text-tenue" aria-label="Lista del súper">
            <ShoppingCart size={20} aria-hidden />
          </Link>
        }
      />
      <Resalte objetivo='[data-guia="super"]' clave="evasof.guia.super" titulo="Lista del súper"
        texto="Recuerda que en este botón puedes ver la lista del súper para la semana." />
      <div className="space-y-3.5 px-4">
        <section className="superficie-marca">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-tenue">Tipo de día · {eleccion.motivo}</p>
              <h2 className="titulo text-[28px] leading-tight">{tipo.nombre}</h2>
            </div>
            {dieta.tipos_dia.length > 1 && (
              <button className="min-h-11 px-1 text-sm font-semibold text-acento" onClick={() => setCambiando((x) => !x)} aria-expanded={cambiando}>Cambiar</button>
            )}
          </div>
          {cambiando && (
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de día">
              {dieta.tipos_dia.map((t) => (
                <button key={t.id} role="radio" aria-checked={t.id === tipo.id}
                  onClick={async () => { await guardar({ tipoDiaId: t.id, tipoManual: true }); setCambiando(false); }}
                  className={`chip min-h-10 !px-3.5 ${t.id === tipo.id ? 'bg-azul text-sobre-azul' : 'bg-white/10 text-tinta'}`}>{t.nombre}</button>
              ))}
              {registro?.tipoManual && (
                <button className="chip min-h-10 !px-3.5 bg-white/10 text-acento" onClick={async () => { await guardar({ tipoManual: false }); setCambiando(false); }}>Automático</button>
              )}
            </div>
          )}
          <p className="num mt-3 text-sm text-tenue">Comidas cumplidas: {comidasHechas} de {tipo.comidas.length}</p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-atenuado" role="progressbar" aria-valuemin={0} aria-valuemax={tipo.comidas.length} aria-valuenow={comidasHechas} aria-label="Comidas cumplidas">
            <div className="h-full rounded-full bg-ok transition-[width]" style={{ width: `${(comidasHechas / tipo.comidas.length) * 100}%` }} />
          </div>
          {tipo.macros_objetivo && (
            <p className="num mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-tenue">
              {tipo.macros_objetivo.kcal != null && <span><b className="text-tinta">{tipo.macros_objetivo.kcal}</b> kcal</span>}
              {tipo.macros_objetivo.proteina_g != null && <span>P <b className="text-tinta">{tipo.macros_objetivo.proteina_g}</b> g</span>}
              {tipo.macros_objetivo.carbohidratos_g != null && <span>C <b className="text-tinta">{tipo.macros_objetivo.carbohidratos_g}</b> g</span>}
              {tipo.macros_objetivo.grasa_g != null && <span>G <b className="text-tinta">{tipo.macros_objetivo.grasa_g}</b> g</span>}
            </p>
          )}
        </section>

        <section className="tarjeta !py-1" aria-label="Comidas">
          {tipo.comidas.map((c) => {
            const hecha = !!registro?.comidas?.[c.orden];
            return (
              <div key={c.orden} className="flex items-start gap-3 border-b border-borde py-3 last:border-b-0">
                <span className="num w-12 shrink-0 pt-0.5 font-titulo text-lg font-bold text-tenue">{c.hora ?? '—'}</span>
                <div className="min-w-0 flex-1">
                  <p className={`titulo text-lg leading-tight ${hecha ? 'text-ok' : ''}`}>{c.nombre}</p>
                  <ul className="mt-0.5 text-sm text-tenue">
                    {c.alimentos.map((a, i) => (
                      <li key={i}>
                        {a.unidad === 'al_gusto' ? `${a.nombre} al gusto` : `${textoCantidad(a.cantidad, a.unidad)} ${a.nombre.toLowerCase()}`}
                        {a.opciones.length > 0 && <span className="text-tenue/80"> · o {a.opciones.map((o) => `${textoCantidad(o.cantidad, o.unidad)} ${o.nombre.toLowerCase()}`).join(' · o ')}</span>}
                      </li>
                    ))}
                  </ul>
                  {c.notas && <p className="mt-1 text-xs text-tenue">{c.notas}</p>}
                </div>
                <button onClick={() => alternarComida(c.orden)} aria-pressed={hecha} aria-label={hecha ? `${c.nombre} cumplida. Tocar para desmarcar` : `Marcar ${c.nombre} como cumplida`}
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg border-2 ${hecha ? 'border-ok bg-ok text-sobre-ok' : 'border-borde text-tenue'}`}>
                  <Check size={22} strokeWidth={3} aria-hidden />
                </button>
              </div>
            );
          })}
        </section>

        <div className="grid grid-cols-2 gap-3">
          <section className="tarjeta" aria-label="Agua">
            <p className="flex items-center gap-1.5 text-[13px] text-tenue"><Droplets size={15} aria-hidden /> Agua</p>
            <p className="num font-titulo text-[30px] font-bold leading-tight">{(agua / 1000).toLocaleString('es-MX', { maximumFractionDigits: 2 })} <small className="text-base text-tenue">/ {metaAgua / 1000} L</small></p>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-atenuado">
              <div className="h-full rounded-full bg-acento transition-[width]" style={{ width: `${Math.min(100, (agua / metaAgua) * 100)}%` }} />
            </div>
            <div className="mt-2.5 flex gap-2">
              <button className="btn btn-suave !min-h-11 !px-3" onClick={() => sumarAgua(-250)} aria-label="Quitar 250 ml"><Minus size={18} aria-hidden /></button>
              <button className="btn btn-azul !min-h-11 flex-1 !px-2 !text-base" onClick={() => sumarAgua(250)} aria-label="Agregar 250 ml"><Plus size={18} aria-hidden /> 250 ml</button>
            </div>
          </section>
          <section className="tarjeta" aria-label="Suplementos">
            <p className="flex items-center gap-1.5 text-[13px] text-tenue"><Pill size={15} aria-hidden /> Suplementos</p>
            {suplementos.length === 0 && <p className="mt-2 text-sm text-tenue">Ninguno hoy.</p>}
            <ul className="mt-1 space-y-1">
              {suplementos.map((s) => {
                const tomado = !!registro?.suplementos?.[s.nombre];
                return (
                  <li key={s.nombre}>
                    <button className="flex w-full items-center gap-2.5 py-1 text-left" onClick={() => alternarSuple(s.nombre)} aria-pressed={tomado}>
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 ${tomado ? 'border-ok bg-ok text-sobre-ok' : 'border-borde text-tenue'}`}>
                        <Check size={18} strokeWidth={3} aria-hidden />
                      </span>
                      <span className="min-w-0 leading-tight">
                        <span className="block text-[15px]">{s.nombre}</span>
                        <span className="block text-xs text-tenue">{[s.dosis, s.hora ?? s.momento].filter(Boolean).join(' · ')}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
        <p className="text-center text-xs text-tenue">Dieta «{dieta.nombre}» · <Link to="/plan/dieta/editar" className="font-semibold text-acento">Editar dieta</Link></p>
        {dieta.notas_generales && (
          <section>
            <TituloSeccion>Notas del coach</TituloSeccion>
            <p className="text-sm text-tenue">{dieta.notas_generales}</p>
          </section>
        )}
      </div>
    </>
  );
}
