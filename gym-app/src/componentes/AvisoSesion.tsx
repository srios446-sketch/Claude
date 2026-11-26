import { Link, useLocation } from 'react-router-dom';
import { CloudOff } from 'lucide-react';
import { nubeConfigurada } from '../nube/config';
import { useNube } from '../nube/useNube';

/** Si la sesión se cerró (contraseña cambiada, sesión vencida), la app sigue funcionando local y avisa. */
export function AvisoSesion() {
  const nube = useNube();
  const { pathname } = useLocation();
  if (!nubeConfigurada || nube.sesion || nube.cargando || pathname === '/entrar') return null;
  return (
    <div className="mx-4 mt-[max(12px,env(safe-area-inset-top))] flex items-center gap-2.5 rounded-xl bg-aviso/12 shadow-[var(--shadow-1)] px-3 py-2 text-sm">
      <CloudOff size={18} className="shrink-0 text-aviso" aria-hidden />
      <span className="flex-1">Tus datos no se están respaldando en la nube.</span>
      <Link to="/entrar" className="font-semibold text-acento">Entrar</Link>
    </div>
  );
}
