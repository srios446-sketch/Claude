import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, ClipboardCopy, ClipboardPaste, Dumbbell, ExternalLink, Link2, Pencil, Plus, Save, UtensilsCrossed } from 'lucide-react';
import PROMPT from '../../importacion/prompt-importacion.txt?raw';
import { Encabezado } from '../componentes/Encabezado';
import { Lista, Mensaje, TituloSeccion } from '../componentes/ui';
import { ConfirmarCoincidencias } from '../componentes/ConfirmarCoincidencias';
import { detectarSeparados, leerPlan, unirConAnterior, type Lectura } from '../lib/importar';
import { describirBloque, seriesEfectivas, type Plan } from '../lib/plan';
import { buscarCoincidencias, decisionesPorDefecto, guardarPlan, type Coincidencia, type Decisiones } from '../db/catalogo';
import { useDietaActiva, useRutinaActiva } from '../db/hooks';

function ConIA() {
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [coincidencias, setCoincidencias] = useState<Coincidencia[]>([]);
  const [decisiones, setDecisiones] = useState<Decisiones>({});
  const [copiado, setCopiado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const resultado = useRef<HTMLDivElement>(null);

  async function copiarPrompt() {
    try { await navigator.clipboard.writeText(PROMPT); setCopiado(true); setTimeout(() => setCopiado(false), 2500); }
    catch { setCopiado(false); alert('No se pudo copiar. Abre "Ver prompt" y cópialo a mano.'); }
  }
  async function pegar() {
    try { setTexto(await navigator.clipboard.readText()); } catch { /* el usuario puede pegar a mano */ }
  }
  async function revisar(t = texto) {
    const r = leerPlan(t);
    setLectura(r);
    setPlan(r.plan);
    if (r.plan) {
      const cs = await buscarCoincidencias(r.plan);
      setCoincidencias(cs);
      setDecisiones(decisionesPorDefecto(cs));
    }
    requestAnimationFrame(() => resultado.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  async function unir(diaId: string, orden: number) {
    if (!plan) return;
    const nuevo = unirConAnterior(plan, diaId, orden);
    setPlan(nuevo);
    const cs = await buscarCoincidencias(nuevo);
    setCoincidencias(cs);
    setDecisiones((d) => ({ ...decisionesPorDefecto(cs), ...d }));
  }
  async function guardar() {
    if (!plan) return;
    setGuardando(true);
    try {
      await guardarPlan(plan, coincidencias, decisiones);
      navegar(plan.rutina ? '/' : '/dieta', { state: { recienImportado: true } });
    } finally { setGuardando(false); }
  }

  const separados = plan ? detectarSeparados(plan) : [];
  const parecidas = coincidencias.filter((c) => c.estado === 'parecida');
  const nuevas = coincidencias.filter((c) => decisiones[c.clave] === 'nuevo').length;

  return (
    <>
      <div className="space-y-4 px-4">
        <section className="tarjeta space-y-3">
          <Paso n={1} titulo="Copia el prompt">
            Lleva las instrucciones para que la IA convierta el PDF o la foto al formato de la app.
          </Paso>
          <div className="flex gap-2">
            <button className="btn btn-marca flex-1" onClick={copiarPrompt}>
              {copiado ? <Check size={20} aria-hidden /> : <ClipboardCopy size={20} aria-hidden />}
              {copiado ? 'Copiado' : 'Copiar prompt'}
            </button>
          </div>
          <details className="group">
            <summary className="flex min-h-11 list-none items-center gap-1 text-sm font-semibold text-acento">
              <ChevronDown size={16} className="transition group-open:rotate-180" aria-hidden /> Ver prompt
            </summary>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-atenuado p-3 text-xs text-tenue">{PROMPT}</pre>
          </details>
          <Paso n={2} titulo="Pégalo en Claude o Gemini">
            Junto con el PDF o la foto del plan. Si la respuesta se corta, escríbele «continúa».
          </Paso>
          <div className="flex gap-2">
            <a className="btn btn-suave flex-1 !text-base" href="https://claude.ai/new" target="_blank" rel="noreferrer">Claude <ExternalLink size={16} aria-hidden /></a>
            <a className="btn btn-suave flex-1 !text-base" href="https://gemini.google.com/app" target="_blank" rel="noreferrer">Gemini <ExternalLink size={16} aria-hidden /></a>
          </div>
          <Paso n={3} titulo="Pega aquí la respuesta">Puedes pegar todo; la app quita el texto de sobra.</Paso>
          <label className="sr-only" htmlFor="json">Respuesta de la IA</label>
          <textarea
            id="json"
            value={texto}
            onChange={(e) => { setTexto(e.target.value); setLectura(null); setPlan(null); }}
            placeholder='```json { "formato": "evasof-plan", … } ```'
            className="campo min-h-40 py-3 font-mono text-[13px] leading-relaxed"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          <div className="flex gap-2">
            <button className="btn btn-suave" onClick={pegar} aria-label="Pegar del portapapeles"><ClipboardPaste size={20} aria-hidden /></button>
            <button className="btn btn-azul flex-1" onClick={() => revisar()} disabled={!texto.trim()}>Revisar</button>
          </div>
        </section>

        <div ref={resultado} className="scroll-mt-4" />
        {lectura && lectura.errores.length > 0 && (
          <Mensaje tono="error" titulo="No se pudo leer el plan">
            <Lista items={lectura.errores} />
          </Mensaje>
        )}

        {plan && (
          <>
            <Mensaje tono="ok" titulo="El plan se leyó bien">
              {plan.rutina && (
                <p>
                  Rutina «{plan.rutina.nombre}»: {plan.rutina.dias.length} días,{' '}
                  {plan.rutina.dias.reduce((s, d) => s + d.ejercicios.length, 0)} ejercicios,{' '}
                  {plan.rutina.dias.reduce((s, d) => s + d.ejercicios.reduce((x, e) => x + seriesEfectivas(e), 0), 0)} series por semana.
                </p>
              )}
              {plan.dieta && (
                <p>Dieta «{plan.dieta.nombre}»: {plan.dieta.tipos_dia.length} tipos de día, {plan.dieta.suplementos.length} suplementos.</p>
              )}
            </Mensaje>

            {lectura!.correcciones.length > 0 && (
              <Mensaje tono="info" titulo="La app corrigió esto sola"><Lista items={lectura!.correcciones} /></Mensaje>
            )}
            {separados.length > 0 && (
              <Mensaje tono="aviso" titulo="Técnicas que parecen separadas">
                <ul className="space-y-2">
                  {separados.map((s) => (
                    <li key={`${s.diaId}-${s.orden}`} className="flex items-center gap-2">
                      <span className="flex-1">{s.diaId}: «{s.nombre}» parece parte de «{s.anterior}».</span>
                      <button className="btn btn-suave !min-h-10 !px-3 !text-sm" onClick={() => unir(s.diaId, s.orden)}>
                        <Link2 size={16} aria-hidden /> Unir
                      </button>
                    </li>
                  ))}
                </ul>
              </Mensaje>
            )}
            {lectura!.avisos.filter((a) => !a.includes('parece ser solo la técnica')).length > 0 && (
              <Mensaje tono="aviso" titulo="Revisa esto">
                <Lista items={lectura!.avisos.filter((a) => !a.includes('parece ser solo la técnica'))} />
              </Mensaje>
            )}
            {plan.dudas.length > 0 && (
              <Mensaje tono="aviso" titulo={`Dudas de la IA (${plan.dudas.length})`}>
                <p className="mb-1.5 text-tenue">Compáralas con la hoja de tu coach. Puedes guardar y corregir después.</p>
                <Lista items={plan.dudas} />
              </Mensaje>
            )}

            <ConfirmarCoincidencias parecidas={parecidas} decisiones={decisiones} onCambio={setDecisiones} />

            <VistaPlan plan={plan} />

            <div className="sticky bottom-[calc(var(--nav-ocupa)+8px)] z-10 space-y-2 rounded-2xl bg-fondo/95 py-2 backdrop-blur">
              <p className="text-center text-xs text-tenue">
                {nuevas > 0 ? `${nuevas} ejercicios nuevos en tu catálogo. ` : ''}
                Tu {plan.rutina ? 'rutina' : 'dieta'} actual se guarda en el historial.
              </p>
              <button className="btn btn-marca w-full" onClick={guardar} disabled={guardando}>
                <Save size={20} aria-hidden /> {guardando ? 'Guardando…' : 'Guardar plan'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function Importar() {
  const [modo, setModo] = useState<'ia' | 'mano'>(() => { try { return (sessionStorage.getItem('evasof.importar.modo') as 'ia' | 'mano') || 'ia'; } catch { return 'ia'; } });
  const elegir = (m: 'ia' | 'mano') => { setModo(m); try { sessionStorage.setItem('evasof.importar.modo', m); } catch { /* */ } };
  return (
    <>
      <Encabezado titulo="Planes" subtitulo="Rutina y dieta: importar con IA o capturar a mano" />
      <div className="mb-4 px-4">
        <div className="flex rounded-xl bg-tarjeta p-1" role="tablist" aria-label="Cómo cargar">
          {([['ia', 'Con IA'], ['mano', 'A mano']] as const).map(([m, t]) => (
            <button key={m} role="tab" aria-selected={modo === m} onClick={() => elegir(m)}
              className={`titulo min-h-11 flex-1 rounded-[9px] text-base ${modo === m ? 'bg-marca text-sobre-marca' : 'text-tenue'}`}>{t}</button>
          ))}
        </div>
      </div>
      {modo === 'ia' ? <ConIA /> : <AMano />}
    </>
  );
}

function AMano() {
  const rutina = useRutinaActiva();
  const dieta = useDietaActiva();
  const tarjeta = (tipo: 'rutina' | 'dieta', actual: { nombre: string } | null | undefined, Icono: typeof Dumbbell) => (
    <section className="tarjeta space-y-3" aria-label={tipo === 'rutina' ? 'Rutina' : 'Dieta'}>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-azul/20 text-acento"><Icono size={22} aria-hidden /></span>
        <div className="min-w-0">
          <h2 className="titulo text-xl">{tipo === 'rutina' ? 'Rutina' : 'Dieta'}</h2>
          <p className="truncate text-sm text-tenue">{actual ? `Actual: ${actual.nombre}` : 'Aún no tienes'}</p>
        </div>
      </div>
      {actual && <Link to={`/plan/${tipo}/editar`} className="btn btn-azul w-full !text-base"><Pencil size={18} aria-hidden /> Editar {tipo === 'rutina' ? 'la rutina' : 'la dieta'} actual</Link>}
      <Link to={`/plan/${tipo}/nueva`} className={`btn w-full !text-base ${actual ? 'btn-suave' : 'btn-marca'}`}><Plus size={18} aria-hidden /> {tipo === 'rutina' ? 'Crear rutina nueva' : 'Crear dieta nueva'}</Link>
      {actual && <p className="text-xs text-tenue">Editar guarda los cambios en la misma {tipo}. Crear una nueva manda la actual al historial (Perfil → Mis planes).</p>}
    </section>
  );
  return (
    <div className="space-y-4 px-4">
      {tarjeta('rutina', rutina, Dumbbell)}
      {tarjeta('dieta', dieta, UtensilsCrossed)}
    </div>
  );
}

function Paso({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-azul font-titulo text-lg font-bold text-sobre-azul">{n}</span>
      <div>
        <p className="font-semibold">{titulo}</p>
        <p className="text-sm text-tenue">{children}</p>
      </div>
    </div>
  );
}

function VistaPlan({ plan }: { plan: Plan }) {
  return (
    <section className="space-y-3">
      {plan.rutina && (
        <>
          <TituloSeccion>Vista previa: rutina</TituloSeccion>
          {plan.rutina.notas_generales && <p className="text-sm text-tenue">{plan.rutina.notas_generales}</p>}
          {plan.rutina.dias.map((d) => (
            <details key={d.id} className="tarjeta group" open={d.id === 'D1'}>
              <summary className="flex list-none items-center gap-2">
                <span className="titulo flex-1 text-lg">{d.nombre}</span>
                <span className="text-sm text-tenue">{d.ejercicios.length} ejercicios</span>
                <ChevronDown size={18} className="text-tenue transition group-open:rotate-180" aria-hidden />
              </summary>
              <ol className="mt-3 space-y-2.5">
                {d.ejercicios.map((e) => (
                  <li key={e.orden} className="flex gap-3">
                    <span className="w-5 shrink-0 text-right font-titulo text-lg text-tenue">{e.orden}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug">
                        {e.nombre}
                        {e.grupo && <span className="chip ml-2 bg-azul/20 !py-0.5 text-acento">Biserie {e.grupo}</span>}
                      </p>
                      <p className="num text-sm text-tenue">{e.bloques.map(describirBloque).join(' · ')}{e.tempo ? ` · tempo ${e.tempo}` : ''}</p>
                      {e.alternativas.length > 0 && <p className="text-xs text-tenue">o {e.alternativas.join(' / ')}</p>}
                    </div>
                  </li>
                ))}
                {d.cardio.map((c, i) => (
                  <li key={`c${i}`} className="flex gap-3">
                    <span className="w-5 shrink-0" />
                    <p className="text-sm"><b>Cardio:</b> {c.maquina} · {c.meta_valor} {c.meta_tipo === 'tiempo' ? 'min' : c.meta_tipo === 'calorias' ? 'kcal' : 'km'}</p>
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </>
      )}
      {plan.dieta && (
        <>
          <TituloSeccion>Vista previa: dieta</TituloSeccion>
          {plan.dieta.tipos_dia.map((t) => (
            <details key={t.id} className="tarjeta group">
              <summary className="flex list-none items-center gap-2">
                <span className="titulo flex-1 text-lg">{t.nombre}</span>
                <span className="text-sm text-tenue">{t.comidas.length} comidas</span>
                <ChevronDown size={18} className="text-tenue transition group-open:rotate-180" aria-hidden />
              </summary>
              <ul className="mt-3 space-y-2">
                {t.comidas.map((c) => (
                  <li key={c.orden} className="text-sm">
                    <b>{c.hora ? `${c.hora} · ` : ''}{c.nombre}</b>
                    <span className="text-tenue"> — {c.alimentos.map((a) => `${a.cantidad ?? ''} ${a.unidad === 'al_gusto' ? 'al gusto' : a.unidad} ${a.nombre}`.trim()).join(', ')}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </>
      )}
    </section>
  );
}
