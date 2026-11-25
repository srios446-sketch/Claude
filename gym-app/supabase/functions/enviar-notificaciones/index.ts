// Envía las notificaciones push que ya tocan. La llama pg_cron (cada 5 s, solo si hay pendientes).
import webpush from 'npm:web-push@3.6.7';
import { clienteServicio, error, json } from '../_comun/comun.ts';

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return error('No autorizado', 401);
  try {
    webpush.setVapidDetails(Deno.env.get('SITIO_URL') ?? 'https://evasof.app', Deno.env.get('VAPID_PUBLIC')!, Deno.env.get('VAPID_PRIVATE')!);
    const db = clienteServicio();
    const { data: lote, error: e } = await db.rpc('tomar_notificaciones', { limite: 200 });
    if (e) throw e;
    if (!lote?.length) return json({ enviadas: 0 });

    const usuarios = [...new Set(lote.map((n: { usuario_id: string }) => n.usuario_id))];
    const { data: subs } = await db.from('suscripciones_push').select('*').in('usuario_id', usuarios);
    let enviadas = 0;
    for (const n of lote) {
      const destinos = (subs ?? []).filter((s) => s.usuario_id === n.usuario_id);
      let ok = false;
      for (const s of destinos) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ titulo: n.titulo, cuerpo: n.cuerpo, url: n.url, tag: n.id, tipo: n.tipo }),
            { TTL: n.tipo === 'descanso' ? 120 : 3600, urgency: 'high' },
          );
          ok = true;
        } catch (err) {
          const codigo = (err as { statusCode?: number }).statusCode;
          if (codigo === 404 || codigo === 410) await db.from('suscripciones_push').delete().eq('endpoint', s.endpoint);
          else console.error('push', codigo, (err as Error).message);
        }
      }
      const estado = ok ? 'enviada' : destinos.length === 0 || n.intentos >= 3 ? 'error' : 'pendiente';
      await db.from('notificaciones').update({ estado, actualizado: new Date().toISOString() }).eq('usuario_id', n.usuario_id).eq('id', n.id);
      if (ok) enviadas++;
    }
    return json({ enviadas, total: lote.length });
  } catch (e) {
    console.error(e);
    return error('Error del servidor', 500);
  }
});
