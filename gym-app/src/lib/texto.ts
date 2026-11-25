// Normalización y similitud de nombres (para el catálogo de ejercicios).

const RELLENO = new Set(['de', 'del', 'en', 'con', 'la', 'el', 'los', 'las', 'a', 'al', 'y', 'o', 'para', 'por', 'un', 'una']);

/** "Elevaciones laterales en polea baja" → "elevacion lateral polea baja" */
export function claveNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((p) => p && !RELLENO.has(p))
    .map(singular)
    .join(' ');
}

function singular(p: string): string {
  if (p.length > 4 && p.endsWith('ones')) return p.slice(0, -2); // elevaciones → elevacion
  if (p.length > 4 && p.endsWith('es') && !p.endsWith('ces')) return p.slice(0, -2); // laterales → lateral
  if (p.length > 3 && p.endsWith('s')) return p.slice(0, -1); // pájaros → pajaro
  return p;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const v = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = v[0]; v[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = v[j];
      v[j] = Math.min(v[j] + 1, v[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return v[b.length];
}

/** Similitud 0–1 entre dos nombres (palabras en común + parecido de letras). */
export function similitud(a: string, b: string): number {
  const ka = claveNombre(a), kb = claveNombre(b);
  if (!ka || !kb) return 0;
  if (ka === kb) return 1;
  const ta = new Set(ka.split(' ')), tb = new Set(kb.split(' '));
  const comunes = [...ta].filter((t) => tb.has(t)).length;
  // Coeficiente de solapamiento: "Elevaciones laterales en polea baja unilateral" contiene a "...polea baja".
  const solape = comunes / Math.min(ta.size, tb.size);
  const jaccard = comunes / new Set([...ta, ...tb]).size;
  const letras = 1 - levenshtein(ka, kb) / Math.max(ka.length, kb.length);
  return Math.max(letras, 0.5 * solape + 0.5 * jaccard);
}
