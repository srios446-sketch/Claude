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
      className="vidrio-fuerte fixed inset-x-3 bottom-[calc(var(--nav-ocupa)+10px)] z-40 mx-auto max-w-[552px] overflow-hidden rounded-[22px] text-tinta"
      style={{ boxShadow: fin
        ? 'inset 0 0 0 1px var(--timer-fin-borde), var(--shadow-2), 0 8px 28px var(--timer-fin-brillo)'
        : 'inset 0 0 0 1px var(--timer-borde), var(--shadow-2), 0 8px 28px var(--timer-brillo)' }}
    >
      {/* Avance del descanso: tinte de color que se llena y una línea brillante abajo */}
      <div className="absolute inset-y-0 left-0 transition-[width] duration-300" style={{ width: `${progreso * 100}%`, background: fin ? 'var(--timer-fin-relleno)' : 'var(--timer-relleno)' }} aria-hidden />
      <div className="absolute bottom-0 left-0 h-[3px] rounded-r-full transition-[width] duration-300" style={{ width: `${progreso * 100}%`, background: fin ? 'var(--color-success)' : 'var(--timer-linea)' }} aria-hidden />
      <div className="relative flex items-center gap-2.5 px-3 py-2.5">
        <Timer size={28} className={fin ? 'text-ok' : 'text-marca-texto'} aria-hidden />
        <div className="min-w-0">
          <p className={`truncate text-xs font-semibold uppercase tracking-wide ${fin ? 'text-ok' : 'text-tenue'}`}>{fin ? '¡A darle!' : `Descanso · ${activo.etiqueta}`}</p>
          <p className="num font-titulo text-[34px] font-bold leading-none">{mmss(restante)}</p>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button className="h-11 min-w-12 rounded-xl bg-capa px-2 font-titulo text-base font-bold" onClick={() => ajustar(-15)} aria-label="Quitar 15 segundos">−15</button>
          <button className="h-11 min-w-12 rounded-xl bg-capa px-2 font-titulo text-base font-bold" onClick={() => ajustar(15)} aria-label="Agregar 15 segundos">+15</button>
          <button className="grid h-11 w-11 place-items-center rounded-xl bg-capa" onClick={detener} aria-label="Saltar descanso"><X size={20} aria-hidden /></button>
        </div>
      </div>
    </div>
  );
}
