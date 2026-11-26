// Tema de la app: claro ("Pomelo"), oscuro (OLED) o automático (sigue al iPhone).
// Se guarda por dispositivo en localStorage para aplicarlo antes del primer pintado
// (ver el script de index.html, que debe hacer lo mismo).
import { useSyncExternalStore } from 'react';

export type PrefTema = 'claro' | 'oscuro' | 'auto';
export type Tema = 'claro' | 'oscuro';

const CLAVE = 'evasof.tema';
const EVENTO = 'evasof:tema';
const COLOR_BARRA: Record<Tema, string> = { claro: '#F1C6D2', oscuro: '#000000' };
const consultaClaro = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null);

export function leerPrefTema(): PrefTema | null {
  try {
    const v = localStorage.getItem(CLAVE);
    return v === 'claro' || v === 'oscuro' || v === 'auto' ? v : null;
  } catch { return null; }
}

/** Preferencia vigente: si nunca se eligió, oscuro (así nadie cambia de tema por sorpresa al actualizar). */
export function prefTema(): PrefTema { return leerPrefTema() ?? 'oscuro'; }

export function resolverTema(p: PrefTema): Tema {
  return p === 'auto' ? (consultaClaro()?.matches ? 'claro' : 'oscuro') : p;
}

function pintar(p: PrefTema) {
  const t = resolverTema(p);
  const d = document.documentElement;
  d.dataset.tema = t;
  d.dataset.temaPref = p;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[t]);
}

/** Cambia y guarda el tema. Con transición suave si el navegador la tiene y no se pidió reducir movimiento. */
export function cambiarTema(p: PrefTema, animar = true) {
  try { localStorage.setItem(CLAVE, p); } catch { /* sin almacenamiento: dura la sesión */ }
  const reducir = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const aplicar = () => pintar(p);
  if (animar && !reducir && 'startViewTransition' in document) document.startViewTransition(aplicar);
  else aplicar();
  window.dispatchEvent(new Event(EVENTO));
}

/** Sigue los cambios del iPhone mientras la preferencia sea "auto". */
export function iniciarTema() {
  pintar(prefTema());
  consultaClaro()?.addEventListener('change', () => { if (prefTema() === 'auto') pintar('auto'); });
}

function suscribir(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener('storage', cb);
  return () => { window.removeEventListener(EVENTO, cb); window.removeEventListener('storage', cb); };
}

export function usePrefTema(): PrefTema {
  return useSyncExternalStore(suscribir, prefTema, () => 'oscuro');
}
