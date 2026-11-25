// Gráficas SVG ligeras con el estilo de la maqueta: líneas de 2px, cuadrícula tenue,
// etiqueta solo al final y tooltip nativo en objetivos grandes.
import { AlertTriangle } from 'lucide-react';

const C = {
  linea: 'var(--chart-1)', contexto: 'var(--chart-deemph)', grid: 'var(--chart-grid)', tarjeta: 'var(--color-card)',
  acento: 'var(--color-accent)', atenuado: 'var(--color-muted)', borde: 'var(--color-border)', aviso: 'var(--color-warning)',
};

export function escalaBonita(min: number, max: number, n = 4): { min: number; max: number; paso: number } {
  if (!(max > min)) { max = min + 1; min = min - 1; }
  const crudo = (max - min) / n;
  const mag = 10 ** Math.floor(Math.log10(crudo));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= crudo) ?? 10 * mag;
  return { min: Math.floor(min / paso) * paso, max: Math.ceil(max / paso) * paso, paso };
}

export interface PuntoGrafica { x: number; y: number; titulo: string; marcado?: boolean }

export function GraficaLinea({
  linea, contexto = [], etiquetasX, etiquetaFinal, aria, alto = 170, ancho = 310, formatoY = (v: number) => String(v),
}: {
  linea: PuntoGrafica[];
  contexto?: PuntoGrafica[];
  etiquetasX: { x: number; texto: string }[];
  etiquetaFinal: string;
  aria: string;
  alto?: number;
  ancho?: number;
  formatoY?: (v: number) => string;
}) {
  const W = ancho, H = alto, L = 32, R = 52, T = 12, B = 24;
  const ys = [...linea, ...contexto].map((p) => p.y);
  const { min, max, paso } = escalaBonita(Math.min(...ys), Math.max(...ys));
  const x = (v: number) => L + v * (W - L - R);
  const y = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const ticks: number[] = [];
  for (let v = min; v <= max + paso / 1000; v += paso) ticks.push(Math.round(v * 1000) / 1000);
  const ruta = linea.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
  const fin = linea[linea.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label={aria}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R + 8} y1={y(v)} y2={y(v)} stroke={C.grid} strokeWidth={1} />
          <text x={L - 6} y={y(v) + 4} textAnchor="end" className="num fill-tenue text-[11px]">{formatoY(v)}</text>
        </g>
      ))}
      {etiquetasX.map((e, i) => (
        <text key={i} x={x(e.x)} y={H - 6} textAnchor={i === 0 ? 'start' : i === etiquetasX.length - 1 ? 'end' : 'middle'} className="fill-tenue text-[11px]">{e.texto}</text>
      ))}
      {contexto.map((p, i) => (
        <circle key={`c${i}`} cx={x(p.x)} cy={y(p.y)} r={2.5} fill={C.contexto} opacity={0.75}><title>{p.titulo}</title></circle>
      ))}
      {linea.length > 1 && <path d={ruta} fill="none" stroke={C.linea} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
      {linea.filter((p) => p.marcado && p !== fin).map((p, i) => (
        <circle key={`m${i}`} cx={x(p.x)} cy={y(p.y)} r={4} fill={C.linea} stroke={C.tarjeta} strokeWidth={2} />
      ))}
      {fin && (
        <>
          <circle cx={x(fin.x)} cy={y(fin.y)} r={5} fill={C.linea} stroke={C.tarjeta} strokeWidth={2} />
          <text x={x(fin.x) + 9} y={y(fin.y) + 4} className="num fill-tinta text-[12px] font-semibold">{etiquetaFinal}</text>
        </>
      )}
      {linea.map((p, i) => (
        <circle key={`h${i}`} cx={x(p.x)} cy={y(p.y)} r={12} fill="transparent"><title>{p.titulo}</title></circle>
      ))}
    </svg>
  );
}

export function Sparkline({ valores, aria }: { valores: number[]; aria: string }) {
  const W = 140, H = 36, P = 5;
  if (valores.length < 2) return null;
  const x = (i: number) => P + (i * (W - 2 * P)) / (valores.length - 1);
  const y = (v: number) => P + (1 - Math.min(100, Math.max(0, v)) / 100) * (H - 2 * P);
  const ultimo = valores.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={aria}>
      <path d={valores.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')} fill="none" stroke={C.contexto} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(ultimo)} cy={y(valores[ultimo])} r={4} fill={C.linea} stroke={C.tarjeta} strokeWidth={2} />
      {valores.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={9} fill="transparent"><title>{`Semana ${i + 1}: ${v}%`}</title></circle>)}
    </svg>
  );
}

export interface FilaBarra { nombre: string; valor: number; min: number; max: number }

export function BarrasRango({ filas, aria, alertas = true }: { filas: FilaBarra[]; aria: string; alertas?: boolean }) {
  const W = 310, L = 84, R = 40, fila = 30, bh = 14;
  const tope = Math.max(20, ...filas.map((f) => Math.max(f.valor, f.max)));
  const { max } = escalaBonita(0, tope, 4);
  const x = (v: number) => L + (v / max) * (W - L - R);
  const H = filas.length * fila + 22;
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label={aria}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={0} y2={filas.length * fila} stroke={C.grid} strokeWidth={1} />
          <text x={x(v)} y={filas.length * fila + 16} textAnchor="middle" className="num fill-tenue text-[11px]">{Math.round(v)}</text>
        </g>
      ))}
      {filas.map((f, i) => {
        const cy = i * fila + fila / 2, w = Math.max(0, x(f.valor) - L), r = Math.min(4, w);
        const bajo = alertas && f.valor < f.min;
        return (
          <g key={f.nombre}>
            <title>{`${f.nombre}: ${fmtSeries(f.valor)} series · rango sugerido ${f.min}–${f.max}${bajo ? ' · por debajo' : ''}`}</title>
            <text x={0} y={cy + 4} className="fill-tinta text-[12px] font-medium">{f.nombre}</text>
            <rect x={x(f.min)} y={cy - bh / 2 - 3} width={Math.max(0, x(f.max) - x(f.min))} height={bh + 6} rx={4} fill={C.atenuado} stroke={C.borde} strokeWidth={1} />
            {w > 0 && <path d={`M${L},${cy - bh / 2}H${L + w - r}a${r},${r} 0 0 1 ${r},${r}V${cy + bh / 2 - r}a${r},${r} 0 0 1 -${r},${r}H${L}Z`} fill={C.acento} />}
            <text x={x(Math.max(f.valor, f.max)) + 6} y={cy + 4} className="num fill-tinta text-[12px] font-semibold">{fmtSeries(f.valor)}</text>
            {bajo && (
              <g transform={`translate(${x(Math.max(f.valor, f.max)) + 22},${cy - 8})`}>
                <AlertTriangle width={16} height={16} color={C.aviso} strokeWidth={2.4} aria-hidden />
              </g>
            )}
            <rect x={0} y={i * fila} width={W} height={fila} fill="transparent" />
          </g>
        );
      })}
    </svg>
  );
}

function fmtSeries(v: number) { return Number.isInteger(v) ? String(v) : v.toFixed(1); }
