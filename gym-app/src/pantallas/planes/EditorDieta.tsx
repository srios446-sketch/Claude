import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { Encabezado } from '../../componentes/Encabezado';
import { Lista, Mensaje, Vacio } from '../../componentes/ui';
import type { DietaGuardada } from '../../db/db';
import { useDietaActiva } from '../../db/hooks';
import { actualizarDieta, guardarPlan } from '../../db/catalogo';
import { leerPlan } from '../../lib/importar';
import { UNIDADES_ALIMENTO, type Alimento, type Comida, type Dieta, type Suplemento, type TipoDia } from '../../lib/plan';
import { alimentoNuevo, comidaNueva, comoPlan, dietaABorrador, dietaNueva, limpiarDieta, mover, siguienteId, suplementoNuevo, tipoDiaNuevo, useBorrador } from './borrador';
import { Acciones, BotonAgregar, CampoNumero, CampoTexto, Chips, Selector } from './campos';

const NOMBRE_UNIDAD: Record<Alimento['unidad'], string> = {
  g: 'g', ml: 'ml', pieza: 'pieza', taza: 'taza', cda: 'cda', cdita: 'cdita', scoop: 'scoop', rebanada: 'rebanada', porcion: 'porción', al_gusto: 'al gusto',
};
const OPC_UNIDAD = UNIDADES_ALIMENTO.map((u) => [u, NOMBRE_UNIDAD[u]] as [Alimento['unidad'], string]);

export function EditorDieta({ modo }: { modo: 'nueva' | 'editar' }) {
  const dieta = useDietaActiva();
  const titulo = modo === 'nueva' ? 'Nueva dieta' : 'Editar dieta';
  if (dieta === undefined) return <Encabezado titulo={titulo} />;
  if (modo === 'editar' && !dieta) {
    return (<><Encabezado titulo={titulo} /><div className="px-4"><Vacio titulo="Aún no tienes dieta"><Link to="/plan/dieta/nueva" className="btn btn-marca mt-4 w-full">Crear dieta</Link></Vacio></div></>);
  }
  return <Cuerpo modo={modo} dieta={modo === 'editar' ? dieta! : null} titulo={titulo} />;
}

function Cuerpo({ modo, dieta, titulo }: { modo: 'nueva' | 'editar'; dieta: DietaGuardada | null; titulo: string }) {
  const navegar = useNavigate();
  const b = useBorrador<Dieta>(`evasof.borrador.dieta.${modo}${dieta ? `.${dieta.id}` : ''}`, () => (dieta ? dietaABorrador(dieta) : dietaNueva()));
  const [sel, setSel] = useState(0);
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const d = b.valor!;
  const i = Math.min(sel, d.tipos_dia.length - 1);
  const tipo = d.tipos_dia[i];
  const cambiarTipo = (fn: (t: TipoDia) => void) => b.cambiar((x) => fn(x.tipos_dia[i]));

  async function guardar() {
    const limpia = limpiarDieta(d);
    const lectura = leerPlan(JSON.stringify(comoPlan({ dieta: limpia })));
    if (!lectura.plan?.dieta) { setErrores(lectura.errores); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setErrores([]);
    setGuardando(true);
    try {
      if (dieta) await actualizarDieta(dieta.id, lectura.plan.dieta);
      else await guardarPlan(lectura.plan, [], {});
      b.descartar();
      navegar('/dieta');
    } finally { setGuardando(false); }
  }

  return (
    <>
      <Encabezado titulo={titulo} subtitulo={modo === 'nueva' ? 'La actual pasa al historial al guardar' : dieta?.nombre}
        accion={<button onClick={() => confirm('¿Salir sin guardar? Tu borrador queda guardado en este celular.') && navegar(-1)} className="grid h-11 w-11 place-items-center rounded-xl bg-tarjeta text-tenue" aria-label="Salir"><ArrowLeft size={20} aria-hidden /></button>} />
      <div className="space-y-3.5 px-4">
        {b.recuperado && (
          <Mensaje tono="info" titulo="Seguimos con tu borrador">
            <button className="font-semibold text-acento" onClick={() => { b.descartar(); b.reiniciar(dieta ? dietaABorrador(dieta) : dietaNueva()); setSel(0); }}>Empezar de nuevo</button>
          </Mensaje>
        )}
        {errores.length > 0 && <Mensaje tono="error" titulo="Revisa esto antes de guardar"><Lista items={errores} /></Mensaje>}

        <section className="tarjeta space-y-3">
          <CampoTexto etiqueta="Nombre de la dieta" ph="Ej. Dieta diciembre" valor={d.nombre} onCambio={(t) => b.cambiar((x) => { x.nombre = t; })} />
          <CampoNumero etiqueta="Agua por día (litros)" valor={d.agua_litros} onCambio={(v) => b.cambiar((x) => { x.agua_litros = v; })} ph="3" />
          <CampoTexto etiqueta="Notas del coach (opcional)" area valor={d.notas_generales} onCambio={(t) => b.cambiar((x) => { x.notas_generales = t; })} />
        </section>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Tipos de día">
          {d.tipos_dia.map((t, k) => (
            <button key={t.id} role="tab" aria-selected={k === i} onClick={() => setSel(k)}
              className={`chip min-h-10 shrink-0 !px-3.5 ${k === i ? 'bg-marca text-sobre-marca' : 'bg-tarjeta text-tenue'}`}>{t.nombre.trim() || `Tipo ${k + 1}`}</button>
          ))}
          <button className="chip min-h-10 shrink-0 bg-tarjeta text-acento" aria-label="Agregar tipo de día"
            onClick={() => { b.cambiar((x) => { x.tipos_dia.push(tipoDiaNuevo(siguienteId('TD', x.tipos_dia.map((t) => t.id)), 'Nuevo tipo de día')); }); setSel(d.tipos_dia.length); }}>
            <Plus size={16} aria-hidden /> Tipo de día
          </button>
        </div>
        <p className="-mt-1.5 text-xs text-tenue">Usa varios tipos si tu coach te da menús distintos (ej. día de pierna, tren superior, descanso).</p>

        <section className="tarjeta space-y-3" aria-label={`Tipo de día ${i + 1}`}>
          <div className="flex items-end gap-2">
            <CampoTexto clase="flex-1" etiqueta="Nombre del tipo de día" ph="Ej. Día de pierna" valor={tipo.nombre} onCambio={(t) => cambiarTipo((x) => { x.nombre = t; })} />
            <Acciones nombre="tipo de día"
              onDuplicar={() => { b.cambiar((x) => { const c = structuredClone(x.tipos_dia[i]); c.id = siguienteId('TD', x.tipos_dia.map((t) => t.id)); c.nombre = `${c.nombre} (copia)`; x.tipos_dia.splice(i + 1, 0, c); }); setSel(i + 1); }}
              onBorrar={d.tipos_dia.length > 1 ? () => { if (confirm(`¿Borrar «${tipo.nombre}»?`)) { b.cambiar((x) => { x.tipos_dia.splice(i, 1); }); setSel(Math.max(0, i - 1)); } } : undefined} />
          </div>
          <button type="button" className="flex w-full items-center gap-3 py-1 text-left" role="switch" aria-checked={tipo.es_descanso} onClick={() => cambiarTipo((x) => { x.es_descanso = !x.es_descanso; })}>
            <span className="flex-1 text-sm"><b>Es el menú de descanso</b><span className="block text-xs text-tenue">Se usa los días que no entrenas y en la lista del súper.</span></span>
            <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${tipo.es_descanso ? 'bg-ok' : 'bg-atenuado'}`} aria-hidden>
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${tipo.es_descanso ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
          <div>
            <span className="etiqueta !mb-1 !text-xs">Macros del día (opcional)</span>
            <div className="grid grid-cols-4 gap-2">
              {([['kcal', 'kcal'], ['proteina_g', 'Prot. g'], ['carbohidratos_g', 'Carb. g'], ['grasa_g', 'Grasa g']] as const).map(([k, t]) => (
                <CampoNumero key={k} etiqueta={t} decimales={false} valor={tipo.macros_objetivo?.[k] ?? null}
                  onCambio={(v) => cambiarTipo((x) => { x.macros_objetivo = { kcal: null, proteina_g: null, carbohidratos_g: null, grasa_g: null, ...x.macros_objetivo, [k]: v }; })} />
              ))}
            </div>
          </div>
        </section>

        {tipo.comidas.map((c, k) => (
          <EditorComida key={`${tipo.id}-${k}`} c={c} n={k + 1} total={tipo.comidas.length}
            cambiar={(fn) => cambiarTipo((t) => fn(t.comidas[k]))}
            subir={() => cambiarTipo((t) => mover(t.comidas, k, -1))}
            bajar={() => cambiarTipo((t) => mover(t.comidas, k, 1))}
            duplicar={() => cambiarTipo((t) => { t.comidas.splice(k + 1, 0, structuredClone(c)); })}
            borrar={tipo.comidas.length > 1 ? () => { if (confirm(`¿Borrar «${c.nombre}»?`)) cambiarTipo((t) => { t.comidas.splice(k, 1); }); } : undefined} />
        ))}
        <BotonAgregar onClick={() => cambiarTipo((t) => { t.comidas.push(comidaNueva(t.comidas.length + 1)); })}><Plus size={18} aria-hidden /> Agregar comida</BotonAgregar>

        <section className="tarjeta space-y-3" aria-label="Suplementos">
          <h2 className="titulo text-xl">Suplementos</h2>
          {d.suplementos.length === 0 && <p className="text-sm text-tenue">Sin suplementos.</p>}
          {d.suplementos.map((s, k) => (
            <EditorSuplemento key={k} s={s} tipos={d.tipos_dia} cambiar={(fn) => b.cambiar((x) => fn(x.suplementos[k]))} borrar={() => b.cambiar((x) => { x.suplementos.splice(k, 1); })} />
          ))}
          <BotonAgregar onClick={() => b.cambiar((x) => { x.suplementos.push(suplementoNuevo()); })}><Plus size={18} aria-hidden /> Agregar suplemento</BotonAgregar>
        </section>

        <div className="sticky bottom-24 z-10 rounded-2xl bg-fondo/95 py-2 backdrop-blur">
          <button className="btn btn-marca w-full" disabled={guardando} onClick={guardar}><Save size={20} aria-hidden /> {modo === 'nueva' ? 'Guardar dieta nueva' : 'Guardar cambios'}</button>
        </div>
      </div>
    </>
  );
}

function EditorComida({ c, n, total, cambiar, subir, bajar, duplicar, borrar }: {
  c: Comida; n: number; total: number; cambiar: (fn: (c: Comida) => void) => void; subir: () => void; bajar: () => void; duplicar: () => void; borrar?: () => void;
}) {
  return (
    <article className="tarjeta space-y-2.5" aria-label={`Comida ${n}`}>
      <div className="flex items-end gap-2">
        <CampoTexto clase="flex-1" etiqueta="Comida" valor={c.nombre} onCambio={(t) => cambiar((x) => { x.nombre = t; })} />
        <label className="block w-28 shrink-0">
          <span className="etiqueta !mb-1 !text-xs">Hora</span>
          <input type="time" aria-label="Hora" className="campo num !min-h-11 !px-2" value={c.hora ?? ''} onChange={(e) => cambiar((x) => { x.hora = e.target.value || null; })} />
        </label>
      </div>
      <div className="flex justify-end">
        <Acciones nombre={`comida ${n}`} onSubir={n > 1 ? subir : undefined} onBajar={n < total ? bajar : undefined} onDuplicar={duplicar} onBorrar={borrar} />
      </div>
      {c.alimentos.map((a, k) => (
        <div key={k} className="rounded-xl bg-atenuado/60 p-2.5">
          <div className="flex items-end gap-2">
            <CampoTexto clase="flex-1" etiqueta="Alimento" ph="Ej. Pechuga de pollo" valor={a.nombre} onCambio={(t) => cambiar((x) => { x.alimentos[k].nombre = t; })} />
            <Acciones nombre={`alimento ${k + 1}`} onBorrar={() => cambiar((x) => { x.alimentos.splice(k, 1); })} />
          </div>
          <div className="mt-2 flex gap-2">
            {a.unidad !== 'al_gusto' && <CampoNumero clase="w-24 shrink-0" etiqueta="Cantidad" valor={a.cantidad} onCambio={(v) => cambiar((x) => { x.alimentos[k].cantidad = v; })} />}
            <Selector clase="flex-1" etiqueta="Unidad" valor={a.unidad} opciones={OPC_UNIDAD} onCambio={(v) => cambiar((x) => { x.alimentos[k].unidad = v; })} />
          </div>
          {a.opciones.map((o, j) => (
            <div key={j} className="mt-2 space-y-2 border-l-2 border-borde pl-2.5">
              <div className="flex items-end gap-2">
                <CampoTexto clase="flex-1" etiqueta="O en su lugar" ph="Ej. Pescado blanco" valor={o.nombre} onCambio={(t) => cambiar((x) => { x.alimentos[k].opciones[j].nombre = t; })} />
                <Acciones nombre="alternativa" onBorrar={() => cambiar((x) => { x.alimentos[k].opciones.splice(j, 1); })} />
              </div>
              <div className="flex gap-2">
                {o.unidad !== 'al_gusto' && <CampoNumero clase="w-24 shrink-0" etiqueta="Cantidad" valor={o.cantidad} onCambio={(v) => cambiar((x) => { x.alimentos[k].opciones[j].cantidad = v; })} />}
                <Selector clase="flex-1" etiqueta="Unidad" valor={o.unidad} opciones={OPC_UNIDAD} onCambio={(v) => cambiar((x) => { x.alimentos[k].opciones[j].unidad = v; })} />
              </div>
            </div>
          ))}
          <button type="button" className="mt-1.5 text-xs font-semibold text-acento"
            onClick={() => cambiar((x) => { x.alimentos[k].opciones.push({ nombre: '', cantidad: a.cantidad, unidad: a.unidad }); })}>+ Alternativa (ej. pollo o pescado)</button>
        </div>
      ))}
      <button type="button" className="text-sm font-semibold text-acento" onClick={() => cambiar((x) => { x.alimentos.push(alimentoNuevo()); })}>+ Agregar alimento</button>
      <CampoTexto etiqueta="Notas (opcional)" valor={c.notas} onCambio={(t) => cambiar((x) => { x.notas = t; })} />
    </article>
  );
}

function EditorSuplemento({ s, tipos, cambiar, borrar }: { s: Suplemento; tipos: TipoDia[]; cambiar: (fn: (s: Suplemento) => void) => void; borrar: () => void }) {
  return (
    <div className="space-y-2 rounded-xl bg-atenuado/60 p-2.5">
      <div className="flex items-end gap-2">
        <CampoTexto clase="flex-1" etiqueta="Suplemento" ph="Ej. Creatina" valor={s.nombre} onCambio={(t) => cambiar((x) => { x.nombre = t; })} />
        <Acciones nombre="suplemento" onBorrar={borrar} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <CampoTexto etiqueta="Dosis" ph="5 g" valor={s.dosis} onCambio={(t) => cambiar((x) => { x.dosis = t; })} />
        <CampoTexto etiqueta="Momento" ph="Comida 1" valor={s.momento} onCambio={(t) => cambiar((x) => { x.momento = t; })} />
        <label className="block min-w-0">
          <span className="etiqueta !mb-1 !text-xs">Hora</span>
          <input type="time" aria-label="Hora del suplemento" className="campo num !min-h-11 !px-2" value={s.hora ?? ''} onChange={(e) => cambiar((x) => { x.hora = e.target.value || null; })} />
        </label>
      </div>
      {tipos.length > 1 && (
        <Chips etiqueta="Solo en estos días (vacío = todos)" valores={s.solo_tipos_dia ?? []} opciones={tipos.map((t) => [t.id, t.nombre] as [string, string])}
          onCambio={(v) => cambiar((x) => { x.solo_tipos_dia = v.length ? v : null; })} />
      )}
    </div>
  );
}
