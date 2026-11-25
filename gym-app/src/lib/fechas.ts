// Fechas en hora local, como texto "AAAA-MM-DD".

export function hoyISO(d = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function deISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function sumarDias(s: string, n: number): string {
  const d = deISO(s); d.setDate(d.getDate() + n); return hoyISO(d);
}

/** Lunes de la semana de la fecha dada. */
export function inicioSemana(s: string): string {
  const d = deISO(s); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return hoyISO(d);
}

export function diasEntre(a: string, b: string): number {
  return Math.round((deISO(b).getTime() - deISO(a).getTime()) / 86400000);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** "25 nov" */
export function fechaCorta(s: string): string { const d = deISO(s); return `${d.getDate()} ${MESES[d.getMonth()]}`; }
/** "Martes 25 nov" */
export function fechaLarga(s: string): string {
  const d = deISO(s); const dia = DIAS[d.getDay()];
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${d.getDate()} ${MESES[d.getMonth()]}`;
}
/** Índice de día de la semana con lunes = 0. */
export function diaSemanaIdx(s: string): number { return (deISO(s).getDay() + 6) % 7; }
