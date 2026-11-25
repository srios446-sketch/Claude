import { Route, Routes } from 'react-router-dom';
import { NavInferior } from './componentes/NavInferior';
import { Encabezado } from './componentes/Encabezado';

function Pendiente({ titulo }: { titulo: string }) {
  return (
    <>
      <Encabezado titulo={titulo} />
      <div className="px-4"><div className="tarjeta text-tenue">En construcción.</div></div>
    </>
  );
}

export default function App() {
  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-28">
      <Routes>
        <Route path="/" element={<Pendiente titulo="Entreno" />} />
        <Route path="/dieta" element={<Pendiente titulo="Dieta" />} />
        <Route path="/progreso" element={<Pendiente titulo="Progreso" />} />
        <Route path="/importar" element={<Pendiente titulo="Importar" />} />
        <Route path="/perfil" element={<Pendiente titulo="Perfil" />} />
      </Routes>
      <NavInferior />
    </div>
  );
}
