// Campos reutilizables del editor manual.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';

/** Número con buffer de texto (permite escribir "0." o borrar sin que salte). */
export function CampoNumero({ valor, onCambio, etiqueta, ph, decimales = true, clase = '' }: {
  valor: number | null; onCambio: (n: number | null) => void; etiqueta: string; ph?: string; decimales?: boolean; clase?: string;
}) {
  const [texto, setTexto] = useState(valor == null ? '' : String(valor));
  const enfocado = useRef(false);
  useEffect(() => { if (!enfocado.current) setTexto(valor == null ? '' : String(valor)); }, [valor]);
  return (
    <label className={`block min-w-0 ${clase}`}>
      <span className="etiqueta !mb-1 !text-xs">{etiqueta}</span>
      <input aria-label={etiqueta} className="campo num !min-h-11 !px-2 text-center" inputMode={decimales ? 'decimal' : 'numeric'} placeholder={ph} value={texto}
        onFocus={() => { enfocado.current = true; }}
        onBlur={() => { enfocado.current = false; setTexto(valor == null ? '' : String(valor)); }}
        onChange={(e) => {
          const t = e.target.value.replace(',', '.');
          setTexto(t);
          if (!t.trim()) { onCambio(null); return; }
          const n = Number(t);
          if (Number.isFinite(n) && n >= 0) onCambio(decimales ? n : Math.round(n));
        }} />
    </label>
  );
}

export function CampoTexto({ valor, onCambio, etiqueta, ph, lista, clase = '', area = false }: {
  valor: string | null; onCambio: (t: string) => void; etiqueta: string; ph?: string; lista?: string; clase?: string; area?: boolean;
}) {
  return (
    <label className={`block min-w-0 ${clase}`}>
      <span className="etiqueta !mb-1 !text-xs">{etiqueta}</span>
      {area
        ? <textarea aria-label={etiqueta} className="campo min-h-16 py-2" placeholder={ph} value={valor ?? ''} onChange={(e) => onCambio(e.target.value)} />
        : <input aria-label={etiqueta} className="campo !min-h-11" placeholder={ph} value={valor ?? ''} list={lista} onChange={(e) => onCambio(e.target.value)} autoCapitalize="sentences" />}
    </label>
  );
}

export function Selector<T extends string>({ valor, opciones, onCambio, etiqueta, clase = '' }: {
  valor: T; opciones: [T, string][]; onCambio: (v: T) => void; etiqueta: string; clase?: string;
}) {
  return (
    <label className={`block min-w-0 ${clase}`}>
      <span className="etiqueta !mb-1 !text-xs">{etiqueta}</span>
      <select aria-label={etiqueta} className="campo !min-h-11 !px-2" value={valor} onChange={(e) => onCambio(e.target.value as T)}>
        {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  );
}

export function Chips<T extends string>({ valores, opciones, onCambio, etiqueta }: {
  valores: T[]; opciones: [T, string][]; onCambio: (v: T[]) => void; etiqueta: string;
}) {
  return (
    <div>
      <span className="etiqueta !mb-1 !text-xs">{etiqueta}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={etiqueta}>
        {opciones.map(([v, t]) => {
          const on = valores.includes(v);
          return (
            <button key={v} type="button" aria-pressed={on} onClick={() => onCambio(on ? valores.filter((x) => x !== v) : [...valores, v])}
              className={`chip min-h-9 ${on ? 'bg-azul text-sobre-azul' : 'bg-atenuado text-tenue'}`}>{t}</button>
          );
        })}
      </div>
    </div>
  );
}

/** Botones de subir/bajar/duplicar/borrar para un elemento de lista. */
export function Acciones({ nombre, onSubir, onBajar, onDuplicar, onBorrar }: {
  nombre: string; onSubir?: () => void; onBajar?: () => void; onDuplicar?: () => void; onBorrar?: () => void;
}) {
  const b = 'grid h-9 w-9 place-items-center rounded-lg text-tenue disabled:opacity-30';
  return (
    <div className="flex shrink-0 items-center">
      {onSubir !== undefined && <button type="button" className={b} onClick={onSubir} aria-label={`Subir ${nombre}`}><ArrowUp size={17} aria-hidden /></button>}
      {onBajar !== undefined && <button type="button" className={b} onClick={onBajar} aria-label={`Bajar ${nombre}`}><ArrowDown size={17} aria-hidden /></button>}
      {onDuplicar && <button type="button" className={b} onClick={onDuplicar} aria-label={`Duplicar ${nombre}`}><Copy size={16} aria-hidden /></button>}
      {onBorrar && <button type="button" className={`${b} hover:text-peligro`} onClick={onBorrar} aria-label={`Borrar ${nombre}`}><Trash2 size={17} aria-hidden /></button>}
    </div>
  );
}

export function BotonAgregar({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-borde text-sm font-semibold text-acento">
      {children}
    </button>
  );
}
