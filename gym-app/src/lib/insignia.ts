// Netlify (plan gratis) inyecta una insignia flotante abajo a la derecha que no se puede apagar.
// No se oculta: se mide y la barra inferior se sube lo necesario para que no quede tapada
// (variable CSS --insignia-alto). Si no hay insignia, vale 0 y la barra queda en su lugar.

const IGNORAR = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'TEMPLATE']);

/** Distancia (px) desde el borde inferior de la pantalla hasta el tope de lo que flote abajo fuera de la app. */
export function medirInsignia(raizApp: Element | null, alto = window.innerHeight): number {
  let max = 0;
  for (const el of Array.from(document.body.children)) {
    if (el === raizApp || IGNORAR.has(el.tagName)) continue;
    for (const c of [el, ...Array.from(el.querySelectorAll('iframe'))]) {
      const r = c.getBoundingClientRect();
      if (r.width < 20 || r.height < 12 || r.height > 160) continue;
      if (r.bottom < alto - 160 || r.top >= alto) continue; // solo lo que flota en el fondo de la pantalla
      const cs = getComputedStyle(c);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      max = Math.max(max, Math.ceil(alto - r.top + 8));
    }
  }
  return max;
}

export function vigilarInsignia(): () => void {
  const raiz = document.documentElement;
  const app = document.getElementById('root');
  let ultimo = -1;
  const medir = () => {
    const v = medirInsignia(app);
    if (v !== ultimo) { ultimo = v; raiz.style.setProperty('--insignia-alto', `${v}px`); }
  };
  const tamanos = new ResizeObserver(medir);
  const observarAjenos = () => {
    tamanos.disconnect();
    for (const el of Array.from(document.body.children)) if (el !== app && !IGNORAR.has(el.tagName)) tamanos.observe(el);
    medir();
  };
  const hijos = new MutationObserver(observarAjenos);
  hijos.observe(document.body, { childList: true });
  observarAjenos();
  // La insignia llega con un script asíncrono y puede animarse al entrar: revisar unas veces más.
  const tiempos = [500, 1500, 3000, 6000, 10000].map((ms) => setTimeout(medir, ms));
  window.addEventListener('resize', medir);
  document.addEventListener('visibilitychange', medir);
  return () => {
    hijos.disconnect(); tamanos.disconnect(); tiempos.forEach(clearTimeout);
    window.removeEventListener('resize', medir);
    document.removeEventListener('visibilitychange', medir);
  };
}
