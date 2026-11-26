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
      className={`vidrio-fuerte fixed inset-x-3 bottom-[calc(var(--nav-ocupa)+10px)] z-40 mx-auto max-w-[552px] overflow-hidden rounded-[22px] text-tinta ${fin
        ? 'shadow-[inset_0_0_0_1px_rgba(34,197,94,.45),inset_0_1px_0_rgba(255,255,255,.1),0_12px_32px_rgba(0,0,0,.6),0_8px_28px_rgba(34,197,94,.22)]'
        : 'shadow-[inset_0_0_0_1px_rgba(255,122,64,.35),inset_0_1px_0_rgba(255,255,255,.1),0_12px_32px_rgba(0,0,0,.6),0_8px_28px_rgba(248,73,12,.22)]'}`}
    >
      {/* Avance del descanso: tinte de color que se llena y una línea brillante abajo */}
      <div className={`absolute inset-y-0 left-0 transition-[width] duration-300 ${fin ? 'bg-ok/20' : 'bg-marca/20'}`} style={{ width: `${progreso * 100}%` }} aria-hidden />
      <div className={`absolute bottom-0 left-0 h-[3px] rounded-r-full transition-[width] duration-300 ${fin ? 'bg-ok' : 'bg-marca'}`} style={{ width: `${progreso * 100}%` }} aria-hidden />
      <div className="relative flex items-center gap-2.5 px-3 py-2.5">
        <Timer size={28} className={fin ? 'text-ok' : 'text-marca-texto'} aria-hidden />
        <div className="min-w-0">
          <p className={`truncate text-xs font-semibold uppercase tracking-wide ${fin ? 'text-ok' : 'text-tenue'}`}>{fin ? '¡A darle!' : `Descanso · ${activo.etiqueta}`}</p>
          <p className="num font-titulo text-[34px] font-bold leading-none">{mmss(restante)}</p>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button className="h-11 min-w-12 rounded-xl bg-white/10 px-2 font-titulo text-base font-bold" onClick={() => ajustar(-15)} aria-label="Quitar 15 segundos">−15</button>
          <button className="h-11 min-w-12 rounded-xl bg-white/10 px-2 font-titulo text-base font-bold" onClick={() => ajustar(15)} aria-label="Agregar 15 segundos">+15</button>
          <button className="grid h-11 w-11 place-items-center rounded-xl bg-white/10" onClick={detener} aria-label="Saltar descanso"><X size={20} aria-hidden /></button>
        </div>
      </div>
    </div>
  );
}
