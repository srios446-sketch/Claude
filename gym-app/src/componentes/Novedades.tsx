import { useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronsUp, LayoutGrid, LayoutPanelTop, Timer, Trophy } from 'lucide-react';
import { BRAND } from '../config/brand';
import { db } from '../db/db';
import { useTemporizador } from '../lib/temporizador';
import { cambiarTema, leerPrefTema, usePrefTema, type PrefTema, type Tema } from '../lib/tema';

// "Conoce la nueva imagen": se muestra una vez por dispositivo después de actualizar.
// Para una novedad futura, cambia ID y el contenido.
const ID = '2026-11-imagen';
const CLAVE = 'evasof.novedades';
const EVENTO = 'evasof:ver-novedades';
const RUTAS_OCUPADAS = ['/plan', '/importar', '/entrar', '/progreso/registrar'];

/** Abre la pantalla de novedades (desde Perfil). */
export function verNovedades() { window.dispatchEvent(new Event(EVENTO)); }

function yaVista() { try { return localStorage.getItem(CLAVE) === ID; } catch { return false; } }
function marcarVista() { try { localStorage.setItem(CLAVE, ID); } catch { /* sin almacenamiento */ } }

const NOVEDADES = [
  { Icono: Timer, titulo: 'Barra y temporizador de vidrio', texto: 'Flotan sobre la pantalla sin taparte nada. El descanso brilla mientras corre y se pone verde al terminar.' },
  { Icono: ChevronsUp, titulo: 'Títulos que se acomodan', texto: 'Al bajar, el título grande se vuelve una barra compacta y ves más de tu rutina.' },
  { Icono: LayoutPanelTop, titulo: 'Tarjetas más ligeras', texto: 'Sin bordes, con luz y sombra suaves. Todo se lee más fácil.' },
  { Icono: LayoutGrid, titulo: 'Progreso en mosaicos', texto: 'Tu peso, tus récords y tu constancia de un vistazo.' },
  { Icono: Trophy, titulo: 'Récords en dorado', texto: 'Cada récord personal brilla con su trofeo, también en las gráficas.', oro: true },
];

const TEMAS: [PrefTema, string, string][] = [
  ['oscuro', 'Oscuro', 'El de siempre'],
  ['claro', 'Claro', 'Nuevo'],
  ['auto', 'Automático', 'Sigue a tu iPhone'],
];

export function Novedades() {
  const [pendiente, setPendiente] = useState(false);
  const [paso, setPaso] = useState<0 | 1 | 2>(0); // 0 = cerrada
  const { activo } = useTemporizador();
  const abiertas = useLiveQuery(() => db.sesiones.filter((s) => s.fin === null).count(), [], -1);
  const { pathname } = useLocation();
  const titulo = useRef<HTMLHeadingElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const id = useId();

  // Solo a quien ya usaba la app (tiene historial). A una cuenta nueva no se le muestra
  // y arranca en Automático; quien ya la usaba se queda en Oscuro hasta que elija.
  useEffect(() => {
    if (yaVista()) return;
    let vivo = true;
    (async () => {
      const usos = (await db.sesiones.count()) + (await db.metricas.count()) + (await db.registroDieta.count());
      if (!vivo) return;
      if (usos > 0) setPendiente(true);
      else { marcarVista(); if (!leerPrefTema()) cambiarTema('auto', false); }
    })();
    return () => { vivo = false; };
  }, []);

  // Espera un momento tranquilo: sin entreno abierto ni descanso corriendo, fuera de editores.
  const tranquilo = !activo && abiertas === 0 && !RUTAS_OCUPADAS.some((r) => pathname.startsWith(r));
  useEffect(() => { if (pendiente && tranquilo && paso === 0) setPaso(1); }, [pendiente, tranquilo, paso]);

  useEffect(() => {
    const abrir = () => setPaso(1);
    window.addEventListener(EVENTO, abrir);
    return () => window.removeEventListener(EVENTO, abrir);
  }, []);

  const abierta = paso > 0;
  const cerrar = () => { marcarVista(); setPendiente(false); setPaso(0); };

  useEffect(() => {
    if (!abierta) return;
    const desborde = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', tecla);
    return () => { document.body.style.overflow = desborde; window.removeEventListener('keydown', tecla); };
  }, [abierta]);

  useEffect(() => {
    if (!paso) return;
    caja.current?.scrollTo(0, 0);
    titulo.current?.focus({ preventScroll: true });
  }, [paso]);

  if (!abierta) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby={id} className="fixed inset-0 z-[70] flex animate-[aparecer_250ms_ease-out] flex-col bg-fondo">
      <div ref={caja} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-xl px-5 pb-6 pt-[calc(env(safe-area-inset-top)+var(--margen-sup))]">
          <div className="flex min-h-11 items-center text-sm">
            <span className="w-16">{paso === 2 && <button className="min-h-11 font-semibold text-acento" onClick={() => setPaso(1)}>Atrás</button>}</span>
            <p className="flex-1 text-center text-tenue">Paso {paso} de 2</p>
            <span className="w-16 text-right"><button className="min-h-11 font-semibold text-acento" onClick={cerrar}>Saltar</button></span>
          </div>
          {paso === 1 ? <PasoImagen tituloRef={titulo} id={id} /> : <PasoTema tituloRef={titulo} id={id} />}
        </div>
      </div>
      <div className="mx-auto w-full max-w-xl px-5 pb-[max(env(safe-area-inset-bottom),16px,var(--insignia-alto))] pt-3">
        <button className="btn btn-marca w-full" onClick={paso === 1 ? () => setPaso(2) : cerrar}>{paso === 1 ? 'Siguiente' : 'Empezar'}</button>
      </div>
    </div>
  );
}

type PropsPaso = { tituloRef: React.RefObject<HTMLHeadingElement | null>; id: string };

function PasoImagen({ tituloRef, id }: PropsPaso) {
  return (
    <>
      <div className="mt-3 flex flex-col items-center text-center">
        <img src={BRAND.logo} alt="" className="h-20 w-20 rounded-3xl object-cover shadow-[var(--shadow-2)]" />
        <h1 ref={tituloRef} id={id} tabIndex={-1} className="titulo mt-5 text-[34px] leading-none outline-none">Conoce la nueva imagen</h1>
        <p className="mt-3 text-[15px] text-tenue">Renovamos {BRAND.nombre} para que se vea más limpio y se use mejor en el gym. Tus rutinas, dietas y récords siguen igual.</p>
      </div>
      <ul className="mt-6 space-y-3">
        {NOVEDADES.map(({ Icono, titulo, texto, oro }) => (
          <li key={titulo} className="tarjeta flex items-start gap-3.5 !p-3.5">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${oro ? 'insignia-oro' : 'bg-capa text-marca-texto'}`}><Icono size={22} aria-hidden /></span>
            <span className="min-w-0">
              <span className="block font-semibold">{titulo}</span>
              <span className="block text-sm text-tenue">{texto}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function PasoTema({ tituloRef, id }: PropsPaso) {
  const tema = usePrefTema();
  return (
    <>
      <h1 ref={tituloRef} id={id} tabIndex={-1} className="titulo mt-3 text-center text-[34px] leading-none outline-none">¿Claro u oscuro?</h1>
      <p className="mt-3 text-center text-[15px] text-tenue">Estrenamos modo claro. Elige cómo quieres ver la app; puedes cambiarlo cuando quieras en Perfil.</p>
      <fieldset className="mt-7">
        <legend className="sr-only">Tema</legend>
        <div className="grid grid-cols-3 gap-2.5">
          {TEMAS.map(([v, nombre, desc]) => (
            <label key={v} className="block cursor-pointer">
              <input type="radio" name="tema" value={v} checked={tema === v} onChange={() => cambiarTema(v)} className="peer sr-only" />
              <span className="block rounded-[20px] p-1 ring-2 ring-transparent transition-shadow peer-checked:ring-[var(--color-ring)] peer-focus-visible:ring-[var(--color-ring)] peer-focus-visible:ring-offset-2">
                <VistaPrevia tema={v} />
              </span>
              <span className="mt-2 block text-center font-semibold">{nombre}</span>
              <span className="block text-center text-xs text-tenue">{desc}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

/** Mini pantalla pintada con los tokens reales de cada tema (data-tema en su raíz). */
function VistaPrevia({ tema }: { tema: PrefTema }) {
  return (
    <span className="relative block aspect-[3/4]" aria-hidden>
      {tema === 'auto' ? (
        <>
          <Mini tema="oscuro" />
          <span className="absolute inset-0" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}><Mini tema="claro" /></span>
        </>
      ) : <Mini tema={tema} />}
    </span>
  );
}

function Mini({ tema }: { tema: Tema }) {
  return (
    <span data-tema={tema} className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-fondo p-2 text-tinta shadow-[var(--shadow-1)]">
      <span className="titulo text-[11px] leading-none">Entreno</span>
      <span className="mt-1.5 block rounded-[9px] bg-tarjeta p-1.5 shadow-[var(--shadow-1)]">
        <span className="flex items-center gap-1">
          <span className="insignia-oro grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full"><Trophy size={8} /></span>
          <span className="truncate text-[8px] font-semibold leading-tight">Press de banca</span>
        </span>
        <span className="mt-0.5 block text-[8px] leading-tight text-tenue">80 kg × 8</span>
      </span>
      <span className="mt-1.5 grid h-4 place-items-center rounded-md bg-marca font-titulo text-[7px] font-bold uppercase text-sobre-marca">Empezar</span>
      <span className="vidrio mt-auto flex h-5 items-center justify-around rounded-full px-1 shadow-[var(--shadow-flotante)]">
        <span className="h-3 w-5 rounded-full bg-[var(--nav-activo-bg)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-tenue" />
        <span className="h-1.5 w-1.5 rounded-full bg-tenue" />
        <span className="h-1.5 w-1.5 rounded-full bg-tenue" />
      </span>
    </span>
  );
}
