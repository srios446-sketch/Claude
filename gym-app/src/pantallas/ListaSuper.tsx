import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import { Encabezado } from '../componentes/Encabezado';
import { Vacio } from '../componentes/ui';
import { useDietaActiva, useRutinaActiva } from '../db/hooks';
import { diasPorTipo, listaDelSuper, textoCantidad } from '../lib/dieta';

const CLAVE = 'evasof.super.marcados';

export function ListaSuper() {
  const dieta = useDietaActiva();
  const rutina = useRutinaActiva();
  const [semanas, setSemanas] = useState(1);
  const [marcados, setMarcados] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(CLAVE) ?? '{}'); } catch { return {}; } });
  const [copiado, setCopiado] = useState(false);

  const { dias, lista } = useMemo(() => {
    if (!dieta) return { dias: {} as Record<string, number>, lista: [] };
    const base = diasPorTipo(dieta, rutina?.dias.map((d) => d.tipo_dia_dieta) ?? []);
    const d = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v * semanas]));
    return { dias: d, lista: listaDelSuper(dieta, d) };
  }, [dieta, rutina, semanas]);

  if (!dieta) return <><Encabezado titulo="Lista del súper" /><div className="px-4"><Vacio titulo="Aún no tienes dieta" /></div></>;

  const alternar = (k: string) => setMarcados((m) => { const n = { ...m, [k]: !m[k] }; try { localStorage.setItem(CLAVE, JSON.stringify(n)); } catch { /* */ } return n; });
  async function copiar() {
    const texto = `Lista del súper (${semanas === 1 ? '1 semana' : `${semanas} semanas`})\n` + lista.map((r) => `• ${r.nombre}: ${textoCantidad(r.cantidad, r.unidad)}`).join('\n');
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* */ }
  }

  return (
    <>
      <Encabezado titulo="Lista del súper" subtitulo={dieta.nombre}
        accion={<Link to="/dieta" className="grid h-11 w-11 place-items-center rounded-xl bg-tarjeta text-tenue" aria-label="Volver a la dieta"><ArrowLeft size={20} aria-hidden /></Link>} />
      <div className="space-y-3 px-4">
        <div className="flex gap-2" role="radiogroup" aria-label="Para cuánto tiempo">
          {[1, 2].map((n) => (
            <button key={n} role="radio" aria-checked={semanas === n} onClick={() => setSemanas(n)}
              className={`chip min-h-10 !px-4 ${semanas === n ? 'bg-azul text-sobre-azul' : 'bg-atenuado text-tenue'}`}>{n === 1 ? '1 semana' : '2 semanas'}</button>
          ))}
          <button className="chip min-h-10 ml-auto !px-4 bg-atenuado text-tinta" onClick={copiar}>{copiado ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copiado ? 'Copiada' : 'Copiar'}</button>
        </div>
        <p className="text-xs text-tenue">
          Calculada con {dieta.tipos_dia.filter((t) => dias[t.id]).map((t) => `${dias[t.id]} días de ${t.nombre.toLowerCase()}`).join(', ')} (según tu rutina). Usa la primera opción de cada alimento.
        </p>
        <ul className="tarjeta !py-1">
          {lista.map((r) => {
            const k = `${r.nombre}|${r.unidad}`;
            return (
              <li key={k} className="border-b border-borde last:border-b-0">
                <button className="flex min-h-12 w-full items-center gap-3 py-2 text-left" onClick={() => alternar(k)} aria-pressed={!!marcados[k]}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 ${marcados[k] ? 'border-ok bg-ok text-sobre-ok' : 'border-borde'}`}>{marcados[k] && <Check size={16} strokeWidth={3} aria-hidden />}</span>
                  <span className={`flex-1 ${marcados[k] ? 'text-tenue line-through' : ''}`}>{r.nombre}</span>
                  <span className="num font-semibold">{textoCantidad(r.cantidad, r.unidad)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
