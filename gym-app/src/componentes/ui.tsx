import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

type Tono = 'error' | 'aviso' | 'info' | 'ok';
const TONOS: Record<Tono, { caja: string; Icono: typeof Info }> = {
  error: { caja: 'border-peligro/60 bg-peligro/10', Icono: XCircle },
  aviso: { caja: 'border-aviso/60 bg-aviso/10', Icono: AlertTriangle },
  info: { caja: 'border-acento/50 bg-acento/10', Icono: Info },
  ok: { caja: 'border-ok/50 bg-ok/10', Icono: CheckCircle2 },
};
const COLOR_ICONO: Record<Tono, string> = { error: 'text-peligro', aviso: 'text-aviso', info: 'text-acento', ok: 'text-ok' };

export function Mensaje({ tono, titulo, children }: { tono: Tono; titulo: string; children?: ReactNode }) {
  const { caja, Icono } = TONOS[tono];
  return (
    <div role={tono === 'error' ? 'alert' : 'status'} className={`rounded-2xl border p-3.5 ${caja}`}>
      <div className="flex items-start gap-2.5">
        <Icono size={20} className={`mt-0.5 shrink-0 ${COLOR_ICONO[tono]}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{titulo}</p>
          {children && <div className="mt-1.5 text-sm text-tinta/90">{children}</div>}
        </div>
      </div>
    </div>
  );
}

export function Lista({ items }: { items: ReactNode[] }) {
  return <ul className="list-disc space-y-1 pl-5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
}

export function TituloSeccion({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-1 flex items-center justify-between gap-2">
      <h2 className="titulo text-[22px]">{children}</h2>
      {accion}
    </div>
  );
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="tarjeta text-center">
      <p className="titulo text-xl">{titulo}</p>
      {children && <div className="mt-2 text-sm text-tenue">{children}</div>}
    </div>
  );
}
