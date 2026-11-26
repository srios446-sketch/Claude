import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BRAND } from '../config/brand';

/**
 * Encabezado con título grande que, al hacer scroll hacia abajo, se vuelve una barra compacta
 * fija de vidrio (como los títulos grandes de iOS). Los dos dejan libre la franja que iOS 26
 * difumina bajo la barra de estado (`--margen-sup`).
 */
export function Encabezado({ titulo, subtitulo, accion }: { titulo: string; subtitulo?: string; accion?: ReactNode }) {
  const grandeRef = useRef<HTMLElement>(null);
  const barraRef = useRef<HTMLDivElement>(null);
  const [compacto, setCompacto] = useState(false);

  useEffect(() => {
    let cuadro = 0;
    const revisar = () => {
      cuadro = 0;
      // Compacto cuando el encabezado grande (título y fecha) ya pasó por debajo de la barra.
      const g = grandeRef.current, b = barraRef.current;
      if (g && b) setCompacto(g.getBoundingClientRect().bottom - 12 < b.getBoundingClientRect().bottom);
    };
    const alMover = () => { if (!cuadro) cuadro = requestAnimationFrame(revisar); };
    revisar();
    window.addEventListener('scroll', alMover, { passive: true });
    window.addEventListener('resize', alMover);
    return () => {
      window.removeEventListener('scroll', alMover);
      window.removeEventListener('resize', alMover);
      if (cuadro) cancelAnimationFrame(cuadro);
    };
  }, []);

  return (
    <>
      {/* Barra compacta: aparece cuando el título grande pasa por debajo de ella */}
      <div
        ref={barraRef}
        aria-hidden={!compacto}
        inert={!compacto}
        className={`vidrio fixed inset-x-0 top-0 z-30 shadow-[var(--shadow-barra)] transition-[opacity,transform] duration-200 ease-out ${
          compacto ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1.5 opacity-0'
        }`}
      >
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+var(--margen-sup))]">
          <img src={BRAND.logo} alt="" className="h-11 w-11 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="titulo truncate text-xl leading-tight">{titulo}</p>
            {subtitulo && <p className="truncate text-[13px] text-tenue">{subtitulo}</p>}
          </div>
          {accion}
        </div>
      </div>

      {/* Título grande */}
      <header ref={grandeRef} className="flex items-center gap-3.5 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+var(--margen-sup)+8px)]">
        <img src={BRAND.logo} alt={BRAND.nombre} className="h-14 w-14 rounded-2xl object-cover shadow-[var(--shadow-1)]" />
        <div className="min-w-0 flex-1">
          <h1 className="titulo truncate text-[34px] leading-none">{titulo}</h1>
          {subtitulo && <p className="mt-1.5 truncate text-[15px] text-tenue">{subtitulo}</p>}
        </div>
        {accion}
      </header>
    </>
  );
}
