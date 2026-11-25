// Marca de la app (tentativa). Cambia aquí el nombre y el logo; los colores viven en
// design-system/evasof-training/tokens.css. Después de cambiar el logo: `npm run icons`.
export const BRAND = {
  nombre: 'EvaSof Training',
  nombreCorto: 'EvaSof',
  descripcion: 'Tu rutina, tu dieta y tu progreso del gym, aunque no haya señal.',
  logoFuente: 'assets/logo-evasof.jpg', // imagen original (se recorta para los íconos)
  logo: '/brand/logo.png',              // versión para la interfaz (la genera `npm run icons`)
  colorTema: '#1F2937',
  colorFondo: '#1F2937',
} as const;
