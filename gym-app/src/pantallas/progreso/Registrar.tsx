import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { Encabezado } from '../../componentes/Encabezado';
import { db, nuevoId, type Metrica } from '../../db/db';
import { usePerfil } from '../../db/hooks';
import { fechaCorta, hoyISO } from '../../lib/fechas';
import { MEDIDAS, type ClaveMedida } from '../../lib/progreso';
import { aKg, deKg, fmt } from '../../lib/unidades';

const aNum = (s: string) => { const n = Number(s.replace(',', '.')); return s.trim() && Number.isFinite(n) && n > 0 ? n : null; };

export function Registrar() {
  const navegar = useNavigate();
  const perfil = usePerfil();
  const [fecha, setFecha] = useState(hoyISO());
  const [peso, setPeso] = useState('');
  const [grasa, setGrasa] = useState('');
  const [medidas, setMedidas] = useState<Partial<Record<ClaveMedida, string>>>({});
  const recientes = useLiveQuery(() => db.metricas.orderBy('fecha').reverse().limit(10).toArray(), []) ?? [];
  const u = perfil.unidadPeso, um = perfil.unidadMedida;

  async function guardar() {
    const medidasCm: Metrica['medidasCm'] = {};
    for (const m of MEDIDAS) { const v = aNum(medidas[m.clave] ?? ''); if (v != null) medidasCm[m.clave] = um === 'in' ? v * 2.54 : v; }
    const pesoKg = aNum(peso) != null ? aKg(aNum(peso)!, u) : null;
    if (pesoKg == null && aNum(grasa) == null && !Object.keys(medidasCm).length) return;
    // Un registro por día: si ya hay uno, se completa
    await db.transaction('rw', db.metricas, async () => {
    const previo = await db.metricas.where('fecha').equals(fecha).first();
    await db.metricas.put({
      id: previo?.id ?? nuevoId(), fecha,
      pesoKg: pesoKg ?? previo?.pesoKg ?? null,
      grasaPct: aNum(grasa) ?? previo?.grasaPct ?? null,
      medidasCm: { ...previo?.medidasCm, ...medidasCm },
    });
    }); // la transacción explícita se resuelve cuando ya quedó guardado
    navegar('/progreso');
  }

  return (
    <>
      <Encabezado titulo="Registrar" subtitulo="Peso, % de grasa y medidas"
        accion={<button onClick={() => navegar(-1)} className="grid h-11 w-11 place-items-center rounded-xl bg-tarjeta text-tenue" aria-label="Volver"><ArrowLeft size={20} aria-hidden /></button>} />
      <div className="space-y-3.5 px-4">
        <section className="tarjeta space-y-3">
          <label className="block"><span className="etiqueta">Fecha</span>
            <input type="date" className="campo" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value || hoyISO())} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="etiqueta">Peso ({u})</span>
              <input className="campo num font-titulo text-xl font-bold" inputMode="decimal" placeholder={u === 'kg' ? '78.4' : '172.8'} value={peso} onChange={(e) => setPeso(e.target.value)} /></label>
            <label className="block"><span className="etiqueta">% grasa</span>
              <input className="campo num font-titulo text-xl font-bold" inputMode="decimal" placeholder="opcional" value={grasa} onChange={(e) => setGrasa(e.target.value)} /></label>
          </div>
          <p className="text-xs text-tenue">Pésate en ayunas, después de ir al baño. La app usa el promedio de 7 días para que un día de retención no te asuste.</p>
        </section>
        <section className="tarjeta">
          <p className="font-semibold">Medidas ({um}) <span className="font-normal text-tenue">· opcionales</span></p>
          <div className="mt-2.5 grid grid-cols-2 gap-3">
            {MEDIDAS.map((m) => (
              <label key={m.clave} className="block"><span className="etiqueta">{m.nombre}</span>
                <input className="campo num" inputMode="decimal" value={medidas[m.clave] ?? ''} onChange={(e) => setMedidas((x) => ({ ...x, [m.clave]: e.target.value }))} /></label>
            ))}
          </div>
        </section>
        <button className="btn btn-marca w-full" onClick={guardar}><Save size={20} aria-hidden /> Guardar</button>

        {recientes.length > 0 && (
          <section className="tarjeta !py-1">
            <p className="pt-2 text-sm font-semibold text-tenue">Registros recientes</p>
            <ul>
              {recientes.map((m) => (
                <li key={m.id} className="flex items-center gap-2 border-b border-borde py-2 last:border-b-0">
                  <span className="w-16 text-sm text-tenue">{fechaCorta(m.fecha)}</span>
                  <span className="num flex-1 text-sm">
                    {[m.pesoKg != null ? `${fmt(deKg(m.pesoKg, u))} ${u}` : null, m.grasaPct != null ? `${fmt(m.grasaPct)} %` : null, Object.keys(m.medidasCm ?? {}).length ? `${Object.keys(m.medidasCm).length} medidas` : null].filter(Boolean).join(' · ')}
                  </span>
                  <button className="grid h-10 w-10 place-items-center rounded-lg text-tenue" aria-label={`Borrar registro del ${fechaCorta(m.fecha)}`}
                    onClick={() => confirm('¿Borrar este registro?') && db.metricas.delete(m.id)}><Trash2 size={18} aria-hidden /></button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
