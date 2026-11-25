// Configuración de la nube (valores públicos, se ponen al compilar: .env.production).
export const NUBE = {
  url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  clave: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  vapid: import.meta.env.VITE_VAPID_PUBLIC as string | undefined,
};
export const nubeConfigurada = !!(NUBE.url && NUBE.clave);
/** Las cuentas son usuario + contraseña; por dentro Supabase usa un correo que nunca recibe nada. */
export const DOMINIO_USUARIOS = 'usuarios.evasof.app';
export const correoDe = (usuario: string) => `${usuario.trim().toLowerCase()}@${DOMINIO_USUARIOS}`;
