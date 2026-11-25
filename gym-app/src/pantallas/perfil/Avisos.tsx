import { useEffect, useState } from 'react';
import { BellRing, Share } from 'lucide-react';
import { Mensaje } from '../../componentes/ui';
import { actualizarPerfil, type Perfil } from '../../db/db';
import { nubeConfigurada } from '../../nube/config';
import { activarPush, estadoPush, probarAviso, reprogramarAvisos, type EstadoPush } from '../../nube/avisos';
import { useNube } from '../../nube/useNube';

const TIPOS: { k: keyof Perfil['avisos']; t: string; d: string }[] = [
  { k: 'descanso', t: 'Fin del descanso', d: 'Aunque estés en otra app' },
  { k: 'comidas', t: 'Comidas', d: 'A la hora de cada comida (si no la has palomeado)' },
  { k: 'agua', t: 'Agua', d: '10, 13, 16 y 19 h, solo si no llevas tu meta' },
];

export function Avisos({ perfil }: { perfil: Perfil }) {
  const nube = useNube();
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [msg, setMsg] = useState<{ tono: 'ok' | 'error' | 'info'; t: string } | null>(null);
  useEffect(() => { estadoPush().then(setEstado); }, []);
  if (!nubeConfigurada || !nube.sesion || !estado) return null;

  async function activar() {
    try {
      const r = await activarPush(); setEstado(r);
      if (r === 'activo') { await probarAviso(); setMsg({ tono: 'ok', t: 'Listo. En unos segundos te llega un aviso de prueba.' }); }
    } catch (e) { setMsg({ tono: 'error', t: e instanceof Error ? e.message : 'No se pudieron activar.' }); }
  }
  async function alternar(k: keyof Perfil['avisos']) {
    await actualizarPerfil({ avisos: { ...perfil.avisos, [k]: !perfil.avisos[k] } });
    void reprogramarAvisos();
  }

  return (
    <section className="tarjeta space-y-3" aria-label="Avisos">
      <h2 className="titulo text-xl">Avisos</h2>
      {msg && <Mensaje tono={msg.tono} titulo={msg.t} />}
      {estado === 'instalar' && (
        <Mensaje tono="info" titulo="Primero instala la app en tu iPhone">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Abre esta página en <b>Safari</b>.</li>
            <li>Toca <Share size={14} className="inline" aria-label="Compartir" /> <b>Compartir</b> → <b>Agregar a inicio</b>.</li>
            <li>Abre EvaSof desde el ícono y vuelve aquí.</li>
          </ol>
        </Mensaje>
      )}
      {estado === 'no-soportado' && <p className="text-sm text-tenue">Este navegador no recibe notificaciones. En iPhone necesitas iOS 16.4 o más reciente y la app instalada.</p>}
      {estado === 'bloqueado' && <Mensaje tono="aviso" titulo="Las notificaciones están bloqueadas">Actívalas en Ajustes del iPhone → Notificaciones → {document.title || 'EvaSof'}.</Mensaje>}
      {estado === 'inactivo' && (
        <button className="btn btn-marca w-full" onClick={activar}><BellRing size={20} aria-hidden /> Activar notificaciones</button>
      )}
      {estado === 'activo' && (
        <>
          <ul className="space-y-1">
            {TIPOS.map(({ k, t, d }) => (
              <li key={k}>
                <button className="flex w-full items-center gap-3 py-1.5 text-left" role="switch" aria-checked={perfil.avisos[k]} onClick={() => alternar(k)}>
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{t}</span><span className="block text-xs text-tenue">{d}</span></span>
                  <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${perfil.avisos[k] ? 'bg-ok' : 'bg-atenuado'}`} aria-hidden>
                    <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${perfil.avisos[k] ? 'left-[22px]' : 'left-0.5'}`} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button className="btn btn-suave w-full !text-base" onClick={async () => { await probarAviso(); setMsg({ tono: 'ok', t: 'Aviso de prueba en camino (unos segundos).' }); }}>Mandar aviso de prueba</button>
        </>
      )}
    </section>
  );
}
