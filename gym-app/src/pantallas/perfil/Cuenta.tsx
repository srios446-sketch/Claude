import { useState } from 'react';
import { Cloud, CloudOff, KeyRound, LogOut, RefreshCw } from 'lucide-react';
import { Mensaje } from '../../componentes/ui';
import { nubeConfigurada } from '../../nube/config';
import { cambiarContrasena, cerrarSesion, sincronizarAhora } from '../../nube/servicio';
import { useNube } from '../../nube/useNube';

function hace(ms: number | null) {
  if (!ms) return 'nunca';
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'hace un momento';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return new Date(ms).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export function Cuenta() {
  const nube = useNube();
  const [cambiando, setCambiando] = useState(false);
  const [nueva, setNueva] = useState('');
  const [msg, setMsg] = useState<{ tono: 'ok' | 'error'; t: string } | null>(null);
  if (!nubeConfigurada) return null;

  const icono = nube.sync === 'sincronizando' ? <RefreshCw size={18} className="animate-spin text-acento" aria-hidden />
    : nube.sync === 'inactivo' && nube.sesion ? <Cloud size={18} className="text-ok" aria-hidden /> : <CloudOff size={18} className="text-aviso" aria-hidden />;
  const texto = !nube.sesion ? 'Sin sesión: tus cambios no se respaldan'
    : nube.sync === 'sincronizando' ? 'Sincronizando…'
    : nube.sync === 'sin-conexion' ? `Sin conexión · se subirá al volver la señal`
    : nube.sync === 'error' ? 'No se pudo sincronizar; se reintentará'
    : `Respaldado en la nube · ${hace(nube.ultimaSync)}`;

  async function guardarContrasena() {
    if (nueva.length < 8) { setMsg({ tono: 'error', t: 'Usa al menos 8 caracteres.' }); return; }
    try { await cambiarContrasena(nueva); setMsg({ tono: 'ok', t: 'Contraseña actualizada.' }); setCambiando(false); setNueva(''); }
    catch (e) { setMsg({ tono: 'error', t: e instanceof Error ? e.message : 'No se pudo cambiar.' }); }
  }

  return (
    <section className="tarjeta space-y-3" aria-label="Cuenta">
      <h2 className="titulo text-xl">Cuenta</h2>
      {nube.sesion && <p className="text-sm">Usuario: <b>{nube.usuario}</b>{nube.esAdmin && <span className="chip ml-2 bg-marca/15 !py-0.5 text-marca-texto">Admin</span>}</p>}
      <p className="flex items-center gap-2 text-sm text-tenue">{icono} {texto}</p>
      {nube.sync === 'error' && nube.errorSync && <p className="text-xs text-tenue">Detalle: {nube.errorSync}</p>}
      {msg && <Mensaje tono={msg.tono} titulo={msg.t} />}
      {nube.sesion && (
        <>
          <button className="btn btn-suave w-full !text-base" onClick={() => sincronizarAhora()} disabled={nube.sync === 'sincronizando'}>
            <RefreshCw size={18} aria-hidden /> Sincronizar ahora
          </button>
          {cambiando ? (
            <div className="flex gap-2">
              <label className="min-w-0 flex-1"><span className="sr-only">Nueva contraseña</span>
                <input className="campo" type="password" autoComplete="new-password" placeholder="Nueva contraseña" value={nueva} onChange={(e) => setNueva(e.target.value)} /></label>
              <button className="btn btn-azul !px-4 !text-base" onClick={guardarContrasena}>Guardar</button>
            </div>
          ) : (
            <button className="btn btn-suave w-full !text-base" onClick={() => setCambiando(true)}><KeyRound size={18} aria-hidden /> Cambiar contraseña</button>
          )}
          <button className="btn w-full !text-base text-peligro" onClick={async () => {
            if (confirm('¿Cerrar sesión? Se borran los datos de este celular (siguen guardados en tu cuenta).')) await cerrarSesion();
          }}><LogOut size={18} aria-hidden /> Cerrar sesión</button>
        </>
      )}
    </section>
  );
}
