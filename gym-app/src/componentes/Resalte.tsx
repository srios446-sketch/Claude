import { useEffect, useId, useRef, useState } from 'react';

/** Lee/escribe sin romper si el almacenamiento está bloqueado (modo privado). */
function leer(alm: () => Storage, k: string) { try { return alm().getItem(k); } catch { return null; } }
function escribir(alm: () => Storage, k: string, v: string) { try { alm().setItem(k, v); } catch { /* sin almacenamiento */ } }

/**
 * Guía de un paso: difumina toda la pantalla (vidrio esmerilado) menos el botón `objetivo`,
 * lo resalta y explica para qué sirve. Sale una vez por apertura de la app hasta marcar
 * "No volver a mostrar".
 */
export function Resalte({ objetivo, clave, titulo, texto }: { objetivo: string; clave: string; titulo: string; texto: string }) {
  const [abierto, setAbierto] = useState(() => leer(() => localStorage, clave) !== 'no' && leer(() => sessionStorage, clave) !== 'visto');
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [noMostrar, setNoMostrar] = useState(false);
  const noMostrarRef = useRef(noMostrar);
  noMostrarRef.current = noMostrar;
  const tarjeta = useRef<HTMLDivElement>(null);
  const id = useId();

  const cerrar = () => {
    escribir(() => sessionStorage, clave, 'visto');
    if (noMostrarRef.current) escribir(() => localStorage, clave, 'no');
    setAbierto(false);
  };

  useEffect(() => {
    if (!abierto) return;
    // El botón aparece dos veces (encabezado grande y barra compacta inerte): se usa el visible.
    const buscar = () => Array.from(document.querySelectorAll<HTMLElement>(objetivo)).find((e) => !e.closest('[inert]') && e.getBoundingClientRect().width > 0);
    const medir = () => { const el = buscar(); setRect(el ? el.getBoundingClientRect() : null); };
    const el = buscar();
    medir();
    const alTocarObjetivo = () => cerrar();
    el?.addEventListener('click', alTocarObjetivo);
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    const desborde = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('resize', medir);
    window.addEventListener('keydown', alTeclear);
    return () => {
      el?.removeEventListener('click', alTocarObjetivo);
      document.body.style.overflow = desborde;
      window.removeEventListener('resize', medir);
      window.removeEventListener('keydown', alTeclear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, objetivo]);

  // El foco va a la tarjeta (sin anillo visible) para que el lector de pantalla la lea primero.
  useEffect(() => { if (rect) tarjeta.current?.focus({ preventScroll: true }); }, [rect]);

  if (!abierto || !rect) return null;
  const m = 6;
  const x = rect.left - m, y = rect.top - m, w = rect.width + 2 * m, h = rect.height + 2 * m;
  const ancho = Math.min(320, window.innerWidth - 24);
  const derecha = Math.max(12, window.innerWidth - (x + w));
  const flecha = Math.min(ancho - 22, Math.max(14, window.innerWidth - derecha - (x + w / 2) - 7));
  // Cuatro paneles esmerilados alrededor del botón: el hueco queda nítido y tocable
  // (el contenedor deja pasar los toques; solo los paneles y la tarjeta los atrapan).
  const paneles = [
    { left: 0, top: 0, right: 0, height: Math.max(0, y) },
    { left: 0, top: y + h, right: 0, bottom: 0 },
    { left: 0, top: y, width: Math.max(0, x), height: h },
    { left: x + w, top: y, right: 0, height: h },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 z-50 animate-[aparecer_200ms_ease-out]" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
      {paneles.map((s, i) => <div key={i} className="mascara-esmerilada pointer-events-auto absolute" style={s} aria-hidden />)}
      <div className="anillo-guia pointer-events-none absolute rounded-2xl" style={{ left: x, top: y, width: w, height: h }} aria-hidden />
      <div ref={tarjeta} tabIndex={-1} className="tarjeta pointer-events-auto absolute !p-4 shadow-[var(--shadow-2)] outline-none" style={{ top: y + h + 14, right: derecha, width: ancho }}>
        <span className="absolute -top-1.5 h-3.5 w-3.5 rotate-45 rounded-[3px] bg-tarjeta" style={{ right: flecha }} aria-hidden />
        <p id={`${id}-t`} className="titulo text-xl">{titulo}</p>
        <p id={`${id}-d`} className="mt-1 text-[15px] text-tenue">{texto}</p>
        <label className="mt-3 flex min-h-11 items-center gap-2.5 text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-control)]" checked={noMostrar} onChange={(e) => setNoMostrar(e.target.checked)} />
          No volver a mostrar
        </label>
        <button className="btn btn-marca mt-1 w-full" onClick={cerrar}>Entendido</button>
      </div>
    </div>
  );
}
