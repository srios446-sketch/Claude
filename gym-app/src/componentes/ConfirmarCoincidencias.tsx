import { TituloSeccion } from './ui';
import type { Coincidencia, Decisiones } from '../db/catalogo';

/** "¿Son el mismo ejercicio?": para no partir el historial cuando un nombre cambia un poco. */
export function ConfirmarCoincidencias({ parecidas, decisiones, onCambio }: {
  parecidas: Coincidencia[]; decisiones: Decisiones; onCambio: (d: Decisiones) => void;
}) {
  if (!parecidas.length) return null;
  return (
    <section className="tarjeta">
      <TituloSeccion>¿Son el mismo ejercicio?</TituloSeccion>
      <p className="mb-3 text-sm text-tenue">Si es el mismo, tu historial de pesos y récords sigue junto.</p>
      <ul className="space-y-3">
        {parecidas.map((c) => {
          const mismo = decisiones[c.clave] !== 'nuevo';
          return (
            <li key={c.clave} className="rounded-xl bg-atenuado p-3">
              <p className="text-sm">
                <b>{c.nombre}</b> <span className="text-tenue">se parece a</span> <b>{c.candidato!.nombre}</b>
              </p>
              <div className="mt-2 flex gap-2" role="radiogroup" aria-label={`¿${c.nombre} es ${c.candidato!.nombre}?`}>
                <button type="button" role="radio" aria-checked={mismo} className={`btn flex-1 !min-h-10 !text-sm ${mismo ? 'btn-azul' : 'btn-suave'}`}
                  onClick={() => onCambio({ ...decisiones, [c.clave]: c.candidato!.id })}>Es el mismo</button>
                <button type="button" role="radio" aria-checked={!mismo} className={`btn flex-1 !min-h-10 !text-sm ${!mismo ? 'btn-azul' : 'btn-suave'}`}
                  onClick={() => onCambio({ ...decisiones, [c.clave]: 'nuevo' })}>Es nuevo</button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
