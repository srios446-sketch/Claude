// Panel de administración: códigos de invitación, usuarios y reseteo de contraseñas. Solo admins.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { clienteServicio, cors, error, json, normalizarCodigo, normalizarUsuario } from '../_comun/comun.ts';

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I
function nuevoCodigo() {
  const r = crypto.getRandomValues(new Uint8Array(8));
  const s = [...r].map((b) => LETRAS[b % LETRAS.length]).join('');
  return `EVA-${s.slice(0, 4)}-${s.slice(4)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: u } = await cliente.auth.getUser();
    if (!u.user) return error('Inicia sesión.', 401);
    const db = clienteServicio();
    const { data: yo } = await db.from('perfiles').select('es_admin').eq('id', u.user.id).maybeSingle();
    if (!yo?.es_admin) return error('Solo la administradora o el administrador puede hacer esto.', 403);

    const { accion, ...p } = await req.json().catch(() => ({}));
    switch (accion) {
      case 'listar': {
        const [{ data: codigos }, { data: usuarios }] = await Promise.all([
          db.from('codigos_invitacion').select('codigo, nota, es_admin, creado, usado, usado_por').order('creado', { ascending: false }),
          db.from('perfiles').select('id, usuario, nombre, es_admin, creado').order('creado'),
        ]);
        const nombreDe = new Map((usuarios ?? []).map((x) => [x.id, x.usuario]));
        return json({ codigos: (codigos ?? []).map((c) => ({ ...c, usado_por: c.usado_por ? nombreDe.get(c.usado_por) ?? '—' : null })), usuarios });
      }
      case 'crear_codigo': {
        for (let i = 0; i < 5; i++) {
          const codigo = nuevoCodigo();
          const { error: e } = await db.from('codigos_invitacion').insert({ codigo, nota: String(p.nota ?? '').slice(0, 60), creado_por: u.user.id });
          if (!e) return json({ codigo });
        }
        return error('No se pudo crear el código.', 500);
      }
      case 'borrar_codigo': {
        await db.from('codigos_invitacion').delete().eq('codigo', normalizarCodigo(p.codigo)).is('usado_por', null);
        return json({ ok: true });
      }
      case 'resetear': {
        const contrasena = String(p.contrasena ?? '');
        if (contrasena.length < 8) return error('La contraseña nueva debe tener al menos 8 caracteres.');
        const { data: perfil } = await db.from('perfiles').select('id').eq('usuario', normalizarUsuario(p.usuario)).maybeSingle();
        if (!perfil) return error('Ese usuario no existe.', 404);
        const { error: e } = await db.auth.admin.updateUserById(perfil.id, { password: contrasena });
        if (e) return error('No se pudo cambiar la contraseña.', 500);
        return json({ ok: true });
      }
      default:
        return error('Acción desconocida.');
    }
  } catch (e) {
    console.error(e);
    return error('Error del servidor.', 500);
  }
});
