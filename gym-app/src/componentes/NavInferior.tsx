import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Dumbbell, UtensilsCrossed, ChartLine, FileUp, UserRound } from 'lucide-react';
import { vigilarInsignia } from '../lib/insignia';

const ITEMS: { a: string; texto: string; Icono: typeof Dumbbell; tambien?: string }[] = [
  { a: '/', texto: 'Entreno', Icono: Dumbbell },
  { a: '/dieta', texto: 'Dieta', Icono: UtensilsCrossed },
  { a: '/progreso', texto: 'Progreso', Icono: ChartLine },
  { a: '/importar', texto: 'Planes', Icono: FileUp, tambien: '/plan' },
  { a: '/perfil', texto: 'Perfil', Icono: UserRound },
];

/** Barra flotante de vidrio. Se sube sola si algo ajeno a la app flota abajo (la insignia de Netlify). */
export function NavInferior() {
  const { pathname } = useLocation();
  useEffect(() => vigilarInsignia(), []);
  return (
    <nav aria-label="Secciones" className="fixed inset-x-3 bottom-[var(--nav-abajo)] z-30 mx-auto max-w-[552px]">
      <ul className="vidrio flex h-[var(--nav-alto)] items-center justify-around rounded-[30px] px-1.5 shadow-[var(--shadow-flotante)]">
        {ITEMS.map(({ a, texto, Icono, tambien }) => (
          <li key={a}>
            <NavLink
              to={a}
              end={a === '/'}
              className={({ isActive }) =>
                `flex h-[52px] w-[66px] flex-col items-center justify-center gap-0.5 rounded-[24px] text-xs font-semibold transition-colors duration-200 ${
                  isActive || (tambien && pathname.startsWith(tambien)) ? 'bg-[var(--nav-activo-bg)] text-[var(--nav-activo-texto)]' : 'text-tenue'
                }`
              }
            >
              <Icono size={22} aria-hidden />
              {texto}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
