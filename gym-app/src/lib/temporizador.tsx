// Temporizador de descanso global. Guarda la hora de fin (no un contador), así sigue
// siendo correcto si la pantalla se bloquea o la app se recarga.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cancelarDescanso, programarDescanso } from '../nube/avisos';

interface EstadoTemporizador { fin: number; total: number; etiqueta: string }
interface Ctx {
  activo: EstadoTemporizador | null;
  restante: number; // segundos
  iniciar: (segundos: number, etiqueta: string) => void;
  ajustar: (delta: number) => void;
  detener: () => void;
}

const Contexto = createContext<Ctx | null>(null);
const CLAVE = 'evasof.temporizador';

function leer(): EstadoTemporizador | null {
  try { const v = JSON.parse(localStorage.getItem(CLAVE) ?? 'null'); return v && v.fin > Date.now() ? v : null; } catch { return null; }
}
function escribir(v: EstadoTemporizador | null) {
  try { v ? localStorage.setItem(CLAVE, JSON.stringify(v)) : localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
}

function avisarFin() {
  try { navigator.vibrate?.([250, 120, 250, 120, 400]); } catch { /* no soportado */ }
  try {
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    const ac = new AC();
    [0, 0.25, 0.5].forEach((t, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = i === 2 ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, ac.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.2);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.22);
    });
    setTimeout(() => ac.close(), 1200);
  } catch { /* sin audio */ }
}

export function ProveedorTemporizador({ children }: { children: ReactNode }) {
  const [activo, setActivo] = useState<EstadoTemporizador | null>(() => leer());
  const [ahora, setAhora] = useState(Date.now());
  const avisado = useRef(false);

  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(id);
  }, [activo]);

  const restante = activo ? Math.max(0, Math.ceil((activo.fin - ahora) / 1000)) : 0;

  useEffect(() => {
    if (activo && restante === 0 && !avisado.current) {
      avisado.current = true;
      avisarFin();
      const t = setTimeout(() => { setActivo(null); escribir(null); }, 1500);
      return () => clearTimeout(t);
    }
  }, [activo, restante]);

  const iniciar = useCallback((segundos: number, etiqueta: string) => {
    const v = { fin: Date.now() + segundos * 1000, total: segundos, etiqueta };
    avisado.current = false; setAhora(Date.now()); setActivo(v); escribir(v);
    programarDescanso(v.fin, etiqueta);
  }, []);
  const ajustar = useCallback((delta: number) => {
    setActivo((a) => {
      if (!a) return a;
      const v = { ...a, fin: Math.max(Date.now() + 1000, a.fin + delta * 1000), total: Math.max(1, a.total + delta) };
      escribir(v); programarDescanso(v.fin, a.etiqueta); return v;
    });
  }, []);
  const detener = useCallback(() => { setActivo(null); escribir(null); cancelarDescanso(); }, []);

  const valor = useMemo(() => ({ activo, restante, iniciar, ajustar, detener }), [activo, restante, iniciar, ajustar, detener]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTemporizador() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useTemporizador fuera del proveedor');
  return c;
}

export function mmss(seg: number): string {
  const m = Math.floor(seg / 60), s = seg % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
