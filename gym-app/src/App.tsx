import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { NavInferior } from './componentes/NavInferior';
import { Encabezado } from './componentes/Encabezado';
import { BarraTemporizador } from './componentes/Temporizador';
import { ProveedorTemporizador } from './lib/temporizador';
import { Entreno } from './pantallas/entreno/Entreno';
import { Dieta } from './pantallas/Dieta';

// Pantallas que no se usan al abrir la app: se cargan al entrar (siguen disponibles sin internet).
const Importar = lazy(() => import('./pantallas/Importar').then((m) => ({ default: m.Importar })));
const ListaSuper = lazy(() => import('./pantallas/ListaSuper').then((m) => ({ default: m.ListaSuper })));
const Progreso = lazy(() => import('./pantallas/progreso/Progreso').then((m) => ({ default: m.Progreso })));
const Registrar = lazy(() => import('./pantallas/progreso/Registrar').then((m) => ({ default: m.Registrar })));
const Perfil = lazy(() => import('./pantallas/Perfil').then((m) => ({ default: m.Perfil })));

function Pendiente({ titulo }: { titulo: string }) {
  return (
    <>
      <Encabezado titulo={titulo} />
      <div className="px-4"><div className="tarjeta text-tenue">Esta página no existe.</div></div>
    </>
  );
}

function AlInicioAlNavegar() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ProveedorTemporizador>
      <AlInicioAlNavegar />
      <div className="mx-auto min-h-dvh max-w-xl pb-44">
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Entreno />} />
          <Route path="/dieta" element={<Dieta />} />
          <Route path="/dieta/super" element={<ListaSuper />} />
          <Route path="/progreso" element={<Progreso />} />
          <Route path="/progreso/registrar" element={<Registrar />} />
          <Route path="/importar" element={<Importar />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="*" element={<Pendiente titulo="No encontrado" />} />
        </Routes>
        </Suspense>
        <BarraTemporizador />
        <NavInferior />
      </div>
    </ProveedorTemporizador>
  );
}
