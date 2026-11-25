import type { ReactNode } from 'react';
import { BRAND } from '../config/brand';

export function Encabezado({ titulo, subtitulo, accion }: { titulo: string; subtitulo?: string; accion?: ReactNode }) {
  return (
    <header className="flex items-center gap-3 px-4 pb-3 pt-[max(18px,env(safe-area-inset-top))]">
      <img src={BRAND.logo} alt={BRAND.nombre} className="h-11 w-11 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <h1 className="titulo truncate text-xl leading-tight">{titulo}</h1>
        {subtitulo && <p className="truncate text-[13px] text-tenue">{subtitulo}</p>}
      </div>
      {accion}
    </header>
  );
}
