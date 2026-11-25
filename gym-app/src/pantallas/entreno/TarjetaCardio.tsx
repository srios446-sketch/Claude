import { useState } from 'react';
import { Check, HeartPulse } from 'lucide-react';
import type { CardioRegistrado, Sesion } from '../../db/db';
import { guardarCardio } from '../../db/sesiones';
import type { Cardio } from '../../lib/plan';

const aNum = (s: string) => { const n = Number(s.replace(',', '.')); return s.trim() && Number.isFinite(n) ? n : null; };

export function TarjetaCardio({ plan, indice, sesion, registro }: { plan: Cardio; indice: number; sesion: Sesion; registro?: CardioRegistrado }) {
  const [v, setV] = useState({
    minutos: registro?.minutos?.toString() ?? '',
    calorias: registro?.calorias?.toString() ?? '',
    distanciaKm: registro?.distanciaKm?.toString() ?? '',
    inclinacion: registro?.inclinacion?.toString() ?? '',
    velocidad: registro?.velocidad?.toString() ?? '',
    nivel: registro?.nivel?.toString() ?? '',
    fcPromedio: registro?.fcPromedio?.toString() ?? '',
  });
  const hecho = registro?.hecho ?? false;
  const meta = `${plan.meta_valor} ${plan.meta_tipo === 'tiempo' ? 'min' : plan.meta_tipo === 'calorias' ? 'kcal' : 'km'}`;

  async function guardar(h: boolean) {
    const minutos = aNum(v.minutos) ?? (h && plan.meta_tipo === 'tiempo' ? plan.meta_valor : null);
    const calorias = aNum(v.calorias) ?? (h && plan.meta_tipo === 'calorias' ? plan.meta_valor : null);
    const distanciaKm = aNum(v.distanciaKm) ?? (h && plan.meta_tipo === 'distancia' ? plan.meta_valor : null);
    await guardarCardio({
      sesionId: sesion.id, fecha: sesion.fecha, indice, plan, minutos, calorias, distanciaKm,
      inclinacion: aNum(v.inclinacion) ?? plan.inclinacion_pct, velocidad: aNum(v.velocidad) ?? plan.velocidad,
      nivel: aNum(v.nivel) ?? plan.nivel, fcPromedio: aNum(v.fcPromedio), hecho: h,
    });
  }
  const campo = (k: keyof typeof v, etiqueta: string, ph?: number | null) => (
    <label className="min-w-0 flex-1">
      <span className="etiqueta !mb-1 !text-xs">{etiqueta}</span>
      <input className="campo num text-center font-titulo text-lg font-bold" inputMode="decimal" placeholder={ph != null ? String(ph) : '—'}
        value={v[k]} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} onBlur={() => registro && guardar(hecho)} />
    </label>
  );

  return (
    <article className={`tarjeta ${hecho ? 'border-ok/50' : ''}`} aria-label={`Cardio: ${plan.maquina}`}>
      <div className="flex items-start gap-2.5">
        <HeartPulse size={22} className="mt-0.5 text-marca-texto" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="titulo text-[21px] leading-tight">Cardio · {plan.maquina}</h3>
          <p className="text-sm text-tenue">Meta: {meta}{plan.fc_objetivo ? ` · FC ${plan.fc_objetivo}` : ''}{plan.notas ? ` · ${plan.notas}` : ''}</p>
        </div>
        <button onClick={() => guardar(!hecho)} aria-pressed={hecho} aria-label={hecho ? 'Cardio hecho. Tocar para desmarcar' : 'Marcar cardio como hecho'}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg border-2 ${hecho ? 'border-ok bg-ok text-sobre-ok' : 'border-borde text-tenue'}`}>
          <Check size={22} strokeWidth={3} aria-hidden />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        {campo('minutos', 'Minutos', plan.meta_tipo === 'tiempo' ? plan.meta_valor : null)}
        {campo('calorias', 'kcal', plan.meta_tipo === 'calorias' ? plan.meta_valor : null)}
        {campo(plan.meta_tipo === 'distancia' ? 'distanciaKm' : 'fcPromedio', plan.meta_tipo === 'distancia' ? 'km' : 'FC prom.', plan.meta_tipo === 'distancia' ? plan.meta_valor : null)}
      </div>
      <div className="mt-2 flex gap-2">
        {campo('inclinacion', 'Inclinación %', plan.inclinacion_pct)}
        {campo('velocidad', `Velocidad${plan.velocidad_unidad ? ` ${plan.velocidad_unidad}` : ''}`, plan.velocidad)}
        {campo('nivel', 'Nivel', plan.nivel)}
      </div>
    </article>
  );
}
