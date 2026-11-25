import { NavLink, useLocation } from 'react-router-dom';
import { Dumbbell, UtensilsCrossed, ChartLine, FileUp, UserRound } from 'lucide-react';

const ITEMS: { a: string; texto: string; Icono: typeof Dumbbell; tambien?: string }[] = [
  { a: '/', texto: 'Entreno', Icono: Dumbbell },
  { a: '/dieta', texto: 'Dieta', Icono: UtensilsCrossed },
  { a: '/progreso', texto: 'Progreso', Icono: ChartLine },
  { a: '/importar', texto: 'Planes', Icono: FileUp, tambien: '/plan' },
  { a: '/perfil', texto: 'Perfil', Icono: UserRound },
];

export function NavInferior() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-nav pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-xl justify-around">
        {ITEMS.map(({ a, texto, Icono, tambien }) => (
          <li key={a}>
            <NavLink
              to={a}
              end={a === '/'}
              className={({ isActive }) =>
                `flex min-h-16 w-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${isActive || (tambien && pathname.startsWith(tambien)) ? 'text-marca-texto' : 'text-tenue'}`
              }
            >
              <Icono size={24} aria-hidden />
              {texto}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
