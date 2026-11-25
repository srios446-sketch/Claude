import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Perfil, SerieRegistrada } from '../../db/db';
import type { UnidadPeso } from '../../lib/unidades';

export interface ValoresSerie { peso: number | null; reps: number | null; rir: number | null; tempo: string | null; descansoSeg: number | null }

const aNum = (s: string): number | null => {
  const t = s.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const aTexto = (n: number | null | undefined) => (n == null ? '' : String(n));

interface Props {
  etiqueta: string;
  registro?: SerieRegistrada;
  phPeso: number | null;
  phReps: string;
  repsFijas: number | null;      // si el bloque pide reps exactas, se usan al marcar sin escribir
  repsObligatorias: boolean;
  repsEtiqueta: 'reps' | 'seg';
  campos: Perfil['campos'];
  unidad: UnidadPeso;
  onGuardar: (v: ValoresSerie, hecha: boolean) => Promise<void> | void;
}

export function FilaSerie({ etiqueta, registro, phPeso, phReps, repsFijas, repsObligatorias, repsEtiqueta, campos, unidad, onGuardar }: Props) {
  const [peso, setPeso] = useState(aTexto(registro?.peso));
  const [reps, setReps] = useState(aTexto(registro?.reps));
  const [rir, setRir] = useState(aTexto(registro?.rir));
  const [tempo, setTempo] = useState(registro?.tempo ?? '');
  const [desc, setDesc] = useState(aTexto(registro?.descansoSeg));
  const [falta, setFalta] = useState(false);
  const hecha = registro?.hecha ?? false;

  const valores = (): ValoresSerie => ({
    peso: aNum(peso) ?? (hecha ? null : phPeso),
    reps: aNum(reps) ?? repsFijas,
    rir: aNum(rir),
    tempo: tempo.trim() || null,
    descansoSeg: aNum(desc),
  });

  async function alternar() {
    const v = valores();
    if (!hecha && repsObligatorias && v.reps == null) { setFalta(true); return; }
    setFalta(false);
    if (!hecha) { setPeso(aTexto(v.peso)); setReps(aTexto(v.reps)); }
    await onGuardar(v, !hecha);
  }
  const alSalir = () => { if (registro) onGuardar(valores(), registro.hecha); };
  const u = registro?.unidad ?? unidad;

  const caja = `num h-12 w-full rounded-lg border text-center font-titulo text-[22px] font-bold placeholder:font-semibold placeholder:text-[#8592A6] ${
    hecha ? 'border-ok/45 bg-ok/10' : 'border-borde bg-atenuado'
  }`;
  return (
    <div className="py-1">
      <div className="flex items-center gap-2">
        <span className="w-6 text-center font-titulo text-xl font-bold text-tenue" aria-hidden>{etiqueta}</span>
        <label className="min-w-0 flex-[1.3]">
          <span className="sr-only">Peso serie {etiqueta} ({u})</span>
          <input className={caja} inputMode="decimal" placeholder={phPeso != null ? String(phPeso) : u} value={peso}
            onChange={(e) => setPeso(e.target.value)} onBlur={alSalir} />
        </label>
        <label className="min-w-0 flex-1">
          <span className="sr-only">{repsEtiqueta === 'seg' ? 'Segundos' : 'Repeticiones'} serie {etiqueta}</span>
          <input className={`${caja} ${falta ? '!border-peligro ring-2 ring-peligro/40' : ''}`} inputMode="numeric" placeholder={phReps} value={reps}
            onChange={(e) => { setReps(e.target.value); setFalta(false); }} onBlur={alSalir} aria-invalid={falta} />
        </label>
        {campos.rir && (
          <label className="w-14 shrink-0">
            <span className="sr-only">RIR serie {etiqueta}</span>
            <input className={caja} inputMode="numeric" placeholder="RIR" value={rir} onChange={(e) => setRir(e.target.value)} onBlur={alSalir} />
          </label>
        )}
        <button
          onClick={alternar}
          aria-pressed={hecha}
          aria-label={hecha ? `Serie ${etiqueta} hecha. Tocar para desmarcar` : `Marcar serie ${etiqueta} como hecha`}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg border-2 transition ${hecha ? 'border-ok bg-ok text-sobre-ok' : 'border-borde text-tenue'}`}
        >
          <Check size={22} strokeWidth={3} aria-hidden />
        </button>
      </div>
      {(campos.tempo || campos.descanso) && (
        <div className="mt-1.5 flex gap-2 pl-8 pr-14">
          {campos.tempo && (
            <label className="flex flex-1 items-center gap-1.5 text-xs text-tenue">Tempo
              <input className="campo !min-h-9 num text-center text-sm" placeholder="3-1-1-0" value={tempo} onChange={(e) => setTempo(e.target.value)} onBlur={alSalir} />
            </label>
          )}
          {campos.descanso && (
            <label className="flex flex-1 items-center gap-1.5 text-xs text-tenue">Desc. (s)
              <input className="campo !min-h-9 num text-center text-sm" inputMode="numeric" placeholder="90" value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={alSalir} />
            </label>
          )}
        </div>
      )}
      {falta && <p className="pl-8 pt-1 text-xs text-peligro">Escribe cuántas {repsEtiqueta === 'seg' ? 'segundos' : 'reps'} hiciste.</p>}
    </div>
  );
}
