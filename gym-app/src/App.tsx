import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { NavInferior } from './componentes/NavInferior';
import { Encabezado } from './componentes/Encabezado';
import { BarraTemporizador } from './componentes/Temporizador';
import { ProveedorTemporizador } from './lib/temporizador';
import { Importar } from './pantallas/Importar';
import { Entreno } from './pantallas/entreno/Entreno';
import { Dieta } from './pantallas/Dieta';
import { ListaSuper } from './pantallas/ListaSuper';
import { Progreso } from './pantallas/progreso/Progreso';
import { Registrar } from './pantallas/progreso/Registrar';

function Pendiente({ titulo }: { titulo: string }) {
  return (
    <>
      <Encabezado titulo={titulo} />
      <div className="px-4"><div className="tarjeta text-tenue">En construcción.</div></div>
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
        <Routes>
          <Route path="/" element={<Entreno />} />
          <Route path="/dieta" element={<Dieta />} />
          <Route path="/dieta/super" element={<ListaSuper />} />
          <Route path="/progreso" element={<Progreso />} />
          <Route path="/progreso/registrar" element={<Registrar />} />
          <Route path="/importar" element={<Importar />} />
          <Route path="/perfil" element={<Pendiente titulo="Perfil" />} />
        </Routes>
        <BarraTemporizador />
        <NavInferior />
      </div>
    </ProveedorTemporizador>
  );
}
