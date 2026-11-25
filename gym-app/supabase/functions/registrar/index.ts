// Crea una cuenta con código de invitación. Pública (sin sesión): valida el código, crea el usuario
// (usuario + contraseña, sin correo) y su perfil, y marca el código como usado.
import { clienteServicio, cors, DOMINIO_USUARIOS, error, json, normalizarCodigo, normalizarUsuario, usuarioValido } from '../_comun/comun.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return error('Método no permitido', 405);
  try {
    const cuerpo = await req.json().catch(() => ({}));
    const codigo = normalizarCodigo(cuerpo.codigo);
    const usuario = normalizarUsuario(cuerpo.usuario);
    const nombre = String(cuerpo.nombre ?? '').trim().slice(0, 40);
    const contrasena = String(cuerpo.contrasena ?? '');
    if (!codigo) return error('Escribe tu código de invitación.');
    if (!usuarioValido(usuario)) return error('El usuario debe tener de 3 a 24 caracteres: letras, números, punto, guion o guion bajo.');
    if (contrasena.length < 8) return error('La contraseña debe tener al menos 8 caracteres.');

    const db = clienteServicio();
    const { data: cod } = await db.from('codigos_invitacion').select('*').eq('codigo', codigo).maybeSingle();
    if (!cod || cod.usado_por) return error('Ese código no existe o ya se usó. Pídele uno nuevo a quien te invitó.');
    const { data: existe } = await db.from('perfiles').select('id').eq('usuario', usuario).maybeSingle();
    if (existe) return error('Ese usuario ya existe. Elige otro.', 409);

    const email = `${usuario}@${DOMINIO_USUARIOS}`;
    const { data: creado, error: e1 } = await db.auth.admin.createUser({ email, password: contrasena, email_confirm: true, user_metadata: { usuario, nombre } });
    if (e1 || !creado.user) {
      const msg = e1?.message ?? '';
      if (/already|registered|exists/i.test(msg)) return error('Ese usuario ya existe. Elige otro.', 409);
      if (/password/i.test(msg)) return error('La contraseña no es válida: usa al menos 8 caracteres.');
      console.error('createUser', msg);
      return error('No se pudo crear la cuenta. Intenta de nuevo.', 500);
    }
    const id = creado.user.id;
    // Marca el código solo si sigue libre (evita que dos personas lo usen al mismo tiempo)
    const { data: marcado } = await db.from('codigos_invitacion')
      .update({ usado_por: id, usado: new Date().toISOString() }).eq('codigo', codigo).is('usado_por', null).select().maybeSingle();
    if (!marcado) {
      await db.auth.admin.deleteUser(id);
      return error('Ese código acaba de usarse. Pídele uno nuevo a quien te invitó.', 409);
    }
    const { error: e2 } = await db.from('perfiles').insert({ id, usuario, nombre, es_admin: cod.es_admin, invitado_con: codigo });
    if (e2) {
      console.error('perfil', e2.message);
      await db.from('codigos_invitacion').update({ usado_por: null, usado: null }).eq('codigo', codigo);
      await db.auth.admin.deleteUser(id);
      return error('No se pudo crear la cuenta. Intenta de nuevo.', 500);
    }
    return json({ ok: true, email });
  } catch (e) {
    console.error(e);
    return error('Error del servidor. Intenta de nuevo.', 500);
  }
});
