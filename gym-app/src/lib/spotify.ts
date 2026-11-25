// Abrir Spotify (o una playlist) desde la app, sin cuentas ni API: con el esquema spotify:
// y, si la app no está instalada, con open.spotify.com.

const TIPOS = ['playlist', 'album', 'artist', 'track', 'show', 'episode'] as const;

export interface EnlaceSpotify { app: string; web: string }

/** Acepta "https://open.spotify.com/(intl-xx/)playlist/ID?si=…" o "spotify:playlist:ID". */
export function enlaceSpotify(texto: string | null | undefined): EnlaceSpotify | null {
  const t = (texto ?? '').trim();
  if (!t) return null;
  const uri = t.match(/^spotify:(playlist|album|artist|track|show|episode):([A-Za-z0-9]+)$/);
  if (uri) return { app: t, web: `https://open.spotify.com/${uri[1]}/${uri[2]}` };
  try {
    const u = new URL(t);
    if (!/(^|\.)spotify\.com$/.test(u.hostname)) return null;
    const partes = u.pathname.split('/').filter(Boolean).filter((p) => !p.startsWith('intl-'));
    const [tipo, id] = partes;
    if (!TIPOS.includes(tipo as (typeof TIPOS)[number]) || !/^[A-Za-z0-9]+$/.test(id ?? '')) return null;
    return { app: `spotify:${tipo}:${id}`, web: `https://open.spotify.com/${tipo}/${id}` };
  } catch {
    return null;
  }
}

/** Abre la app de Spotify; si después de un momento seguimos aquí, abre la versión web. */
export function abrirSpotify(playlist?: string | null) {
  const e = enlaceSpotify(playlist) ?? { app: 'spotify:', web: 'https://open.spotify.com' };
  const respaldo = setTimeout(() => {
    if (document.visibilityState === 'visible') window.open(e.web, '_blank', 'noopener');
  }, 1500);
  document.addEventListener('visibilitychange', () => clearTimeout(respaldo), { once: true });
  window.location.href = e.app;
}
