import { Timer, X } from 'lucide-react';
import { mmss, useTemporizador } from '../lib/temporizador';

export function BarraTemporizador() {
  const { activo, restante, ajustar, detener } = useTemporizador();
  if (!activo) return null;
  const fin = restante === 0;
  const progreso = activo.total > 0 ? 1 - restante / activo.total : 1;
  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Descanso: ${mmss(restante)}`}
      className={`fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[552px] overflow-hidden rounded-2xl text-sobre-marca shadow-[0_10px_30px_rgba(248,73,12,.35)] ${fin ? 'bg-ok text-sobre-ok' : 'bg-marca'}`}
    >
      <div className="absolute inset-y-0 left-0 bg-black/10 transition-[width] duration-300" style={{ width: `${progreso * 100}%` }} aria-hidden />
      <div className="relative flex items-center gap-2.5 px-3 py-2.5">
        <Timer size={28} aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide">{fin ? '¡A darle!' : `Descanso · ${activo.etiqueta}`}</p>
          <p className="num font-titulo text-[34px] font-bold leading-none">{mmss(restante)}</p>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button className="h-11 min-w-12 rounded-xl bg-black/15 px-2 font-titulo text-base font-bold" onClick={() => ajustar(-15)} aria-label="Quitar 15 segundos">−15</button>
          <button className="h-11 min-w-12 rounded-xl bg-black/15 px-2 font-titulo text-base font-bold" onClick={() => ajustar(15)} aria-label="Agregar 15 segundos">+15</button>
          <button className="grid h-11 w-11 place-items-center rounded-xl bg-black/15" onClick={detener} aria-label="Saltar descanso"><X size={20} aria-hidden /></button>
        </div>
      </div>
    </div>
  );
}
