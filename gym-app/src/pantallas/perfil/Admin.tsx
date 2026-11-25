import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Plus, Share2, Trash2 } from 'lucide-react';
import { Mensaje } from '../../componentes/ui';
import { BRAND } from '../../config/brand';
import { admin } from '../../nube/servicio';
import { useNube } from '../../nube/useNube';

interface Codigo { codigo: string; nota: string; es_admin: boolean; creado: string; usado: string | null; usado_por: string | null }
interface Usuario { id: string; usuario: string; nombre: string; es_admin: boolean; creado: string }

export function Admin() {
  const nube = useNube();
  const [datos, setDatos] = useState<{ codigos: Codigo[]; usuarios: Usuario[] } | null>(null);
  const [nota, setNota] = useState('');
  const [copiado, setCopiado] = useState<string | null>(null);
  const [reset, setReset] = useState<{ usuario: string; contrasena: string } | null>(null);
  const [msg, setMsg] = useState<{ tono: 'ok' | 'error'; t: string } | null>(null);

  const cargar = () => admin<{ codigos: Codigo[]; usuarios: Usuario[] }>('listar').then(setDatos).catch((e) => setMsg({ tono: 'error', t: e.message }));
  useEffect(() => { if (nube.esAdmin) void cargar(); }, [nube.esAdmin]);
  if (!nube.esAdmin) return null;

  async function crear() {
    try { const { codigo } = await admin<{ codigo: string }>('crear_codigo', { nota }); setNota(''); await cargar(); await compartir(codigo); }
    catch (e) { setMsg({ tono: 'error', t: (e as Error).message }); }
  }
  async function compartir(codigo: string) {
    const texto = `Te invito a ${BRAND.nombre} 💪\n1. Abre ${location.origin} en Safari\n2. Compartir → "Agregar a inicio"\n3. "Crear cuenta" con este código: ${codigo}`;
    if ('share' in navigator) { try { await navigator.share({ text: texto }); return; } catch { /* cancelado */ } }
    try { await navigator.clipboard.writeText(texto); setCopiado(codigo); setTimeout(() => setCopiado(null), 2000); } catch { /* */ }
  }
  async function restablecer() {
    if (!reset) return;
    try { await admin('resetear', reset); setMsg({ tono: 'ok', t: `Contraseña de ${reset.usuario} restablecida. Pásale la nueva.` }); setReset(null); }
    catch (e) { setMsg({ tono: 'error', t: (e as Error).message }); }
  }

  const libres = datos?.codigos.filter((c) => !c.usado) ?? [];
  const usados = datos?.codigos.filter((c) => c.usado) ?? [];
  return (
    <section className="tarjeta space-y-3" aria-label="Administración">
      <h2 className="titulo text-xl">Invitaciones</h2>
      {msg && <Mensaje tono={msg.tono} titulo={msg.t} />}
      <div className="flex gap-2">
        <label className="min-w-0 flex-1"><span className="sr-only">Para quién</span>
          <input className="campo" placeholder="Para quién (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} /></label>
        <button className="btn btn-marca !px-4 !text-base" onClick={crear}><Plus size={18} aria-hidden /> Código</button>
      </div>
      <p className="text-xs text-tenue">Cada código sirve para una sola cuenta. Al crearlo puedes mandarlo por WhatsApp con las instrucciones.</p>
      {libres.length > 0 && (
        <ul>
          {libres.map((c) => (
            <li key={c.codigo} className="flex items-center gap-1 border-t border-borde py-2 first:border-t-0">
              <p className="min-w-0 flex-1"><b className="num tracking-wider">{c.codigo}</b><small className="block text-xs text-tenue">{c.nota || 'Sin usar'}</small></p>
              <button className="grid h-10 w-10 place-items-center rounded-lg text-tenue" aria-label={`Compartir ${c.codigo}`} onClick={() => compartir(c.codigo)}>
                {copiado === c.codigo ? <Check size={18} aria-hidden /> : 'share' in navigator ? <Share2 size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
              </button>
              <button className="grid h-10 w-10 place-items-center rounded-lg text-tenue" aria-label={`Borrar ${c.codigo}`}
                onClick={async () => { if (confirm(`¿Borrar el código ${c.codigo}?`)) { await admin('borrar_codigo', { codigo: c.codigo }); await cargar(); } }}><Trash2 size={18} aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
      <h3 className="titulo pt-1 text-lg">Personas ({datos?.usuarios.length ?? '…'})</h3>
      <ul>
        {datos?.usuarios.map((u) => (
          <li key={u.id} className="border-t border-borde py-2 first:border-t-0">
            <div className="flex items-center gap-1">
              <p className="min-w-0 flex-1">{u.nombre || u.usuario} <small className="text-tenue">@{u.usuario}{u.es_admin ? ' · admin' : ''}</small></p>
              <button className="chip min-h-9 bg-atenuado text-acento" onClick={() => setReset(reset?.usuario === u.usuario ? null : { usuario: u.usuario, contrasena: '' })}>
                <KeyRound size={14} aria-hidden /> Contraseña
              </button>
            </div>
            {reset?.usuario === u.usuario && (
              <div className="mt-2 flex gap-2">
                <label className="min-w-0 flex-1"><span className="sr-only">Nueva contraseña para {u.usuario}</span>
                  <input className="campo" placeholder="Nueva contraseña (8+)" value={reset.contrasena} onChange={(e) => setReset({ ...reset, contrasena: e.target.value })} /></label>
                <button className="btn btn-azul !px-4 !text-base" onClick={restablecer}>Guardar</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {usados.length > 0 && <p className="text-xs text-tenue">Códigos usados: {usados.map((c) => `${c.codigo} (${c.usado_por})`).join(', ')}</p>}
    </section>
  );
}
