# EvaSof Training: sistema de diseño (Master)

> **Lógica:** al construir una pantalla, revisa primero `pages/<pantalla>.md`. Si existe, sus reglas **reemplazan** a este archivo. Si no existe, sigue este archivo.

- **Base:** generado con la skill *UI UX Pro Max* (`fitness gym tracker app dark`). Categoría: Fitness/Gym App. Estilo: Vibrant & Block-based + modo oscuro.
- **Versión premium (26-nov-2026):** fondo negro OLED, vidrio solo en la barra inferior y el temporizador, tarjetas con sombra y luz suave en lugar de borde, Progreso en bento y dorado para récords.
- **Colores:** tomados del logo (`../../assets/logo-evasof.jpg`).
- **Tokens:** `tokens.css` (variables CSS) y `tokens.json` (W3C DTCG). Hay que mantenerlos sincronizados.
- **Diales de diseño:**
  - Variedad: 4/10 (balanceado)
  - Movimiento: 3/10 (sutil)
  - Densidad: 7/10 (estándar)

---

## Paleta (modo oscuro)

| Rol | Hex | Variable | Uso | Contraste |
|---|---|---|---|---|
| Primario (naranja EvaSof) | `#F8490C` | `--color-primary` | Botón principal, temporizador, estado activo | texto `#0F172A`: 5.06:1 |
| Texto naranja | `#FF7A40` | `--color-primary-text` | Texto o íconos pequeños en naranja | 5.67:1 en fondo, 4.62:1 en tarjeta |
| Secundario (azul EvaSof) | `#016BDA` | `--color-secondary` | Botones secundarios, chips seleccionados | texto blanco: 5.10:1 |
| Acento (azul claro) | `#7FB9E6` | `--color-accent` | "La vez pasada", links, info | 6.98:1 en fondo |
| Éxito | `#22C55E` | `--color-success` | Serie completada, comida palomeada | texto `#0F172A`: 7.83:1 |
| Dorado (récords) | `#E8B54A` | `--color-record` | Solo récords: insignias, puntos de PR en gráficas, conteos | 11.14:1 en fondo, 9.43:1 en tarjeta; texto `#0F172A` encima: 9.47:1 |
| Destructivo | `#F43F5E` | `--color-destructive` | Borrar/eliminar (rosa-rojo, para no confundirse con el naranja) | texto `#0F172A`: 4.86:1 |
| Fondo | `#000000` | `--color-background` | Fondo general (negro OLED) | — |
| Texto | `#F8FAFC` | `--color-foreground` | Texto principal | 20.07:1 |
| Tarjeta | `#16181C` (degradado `#1A1C21`→`#141619`) | `--color-card` / `--card-gradient` | Tarjetas, hojas inferiores | 16.99:1 con texto |
| Atenuado | `#24272D` / `#CBD5E1` | `--color-muted` / `--color-muted-foreground` | Campos, chips inactivos, texto secundario | 11.97:1 en tarjeta |
| Borde | `#363A42` | `--color-border` | Solo divisores de listas y contornos de controles (no tarjetas) | — |
| Foco | `#FF7A40` | `--color-ring` | Anillo de foco visible | — |
| Superficie de marca (marino) | `#112E54` | `--color-brand-surface` | Encabezado o hero con el logo | texto blanco: 13.61:1 |
| Gráficas | naranja · azul claro · verde · camuflaje `#8A9A5B` | `--chart-1..4` | Series en gráficas; siempre con etiqueta además del color | — |

**Reglas de color**
- El naranja en **fondo de botón** va con texto oscuro `#0F172A`, no con texto blanco (el blanco da 3.53:1 y no pasa AA).
- Para **texto pequeño en naranja** se usa `--color-primary-text`, nunca `#F8490C` directo.
- El azul `#016BDA` solo va como **fondo** con texto blanco. Sobre el fondo oscuro no se usa como texto (2.88:1); en su lugar se usa el azul claro `#7FB9E6`.
- En los componentes no se escriben hex sueltos: solo variables.

## Tipografía

- **Títulos:** Barlow Condensed (600/700). Es angosta y deportiva; también va en números grandes (peso, reps, temporizador).
- **Texto:** Barlow (400/500/600). Base de 16 px, interlineado de 1.5.
- **Números:** `font-variant-numeric: tabular-nums` en pesos, reps y temporizador, para que no "bailen" al cambiar.
- **Fuente:** `https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap`. Se guarda en caché para que funcione sin internet.

## Superficies y efectos

| Pieza | Token / clase | Regla |
|---|---|---|
| Tarjeta | `.tarjeta` · `--shadow-1` | Sin borde. Superficie un poco más clara que el negro, luz de 1 px arriba y sombra suave. Radio 20 px. |
| Elemento flotante | `--shadow-2` | Temporizador, avisos y la tarjeta de marca. |
| Campo | `.campo` · `--shadow-hundido` | Sin borde visible: relleno atenuado con sombra interior. El borde transparente se usa solo para marcar errores. |
| Tarjeta de marca | `.superficie-marca` · `--brand-gradient` | Degradado marino para el día de hoy (Entreno y Dieta). |
| Vidrio | `.vidrio` / `.vidrio-fuerte` | **Solo** barra inferior y barra compacta del encabezado (72 %) y temporizador (84 %), con `blur(22px) saturate(180%)`. Sin `backdrop-filter` o con "Reducir transparencia" se vuelve sólido. Texto `#CBD5E1` sobre la barra: ≥ 4.9:1 aun con blanco detrás. |
| Insignia de récord | `.insignia-oro` · `--record-gradient` | Degradado dorado con trofeo oscuro. Solo para récords. |

**Encabezado:** título grande (34 px, logo de 56 px) que, al bajar, se vuelve una barra compacta fija de vidrio (título de 20 px, logo de 44 px). En iPhone (`html[data-ios]`) todo empieza 30 px debajo de la barra de estado (`--margen-sup`), porque iOS 26 difumina esa franja.

**Barra inferior:** flotante y redondeada (vidrio). Si algo ajeno a la app flota abajo, como la insignia "Powered by Netlify" del plan gratis, la barra se sube sola (`--insignia-alto`, medido en `src/lib/insignia.ts`). La insignia no se oculta. El temporizador, los avisos y las barras de guardar se colocan con `--nav-ocupa`.

**Progreso (bento):** cuadrícula de 2 columnas con separación de 12 px. Arriba, una tarjeta grande (peso corporal o 1RM) que ocupa 2 columnas; debajo, mosaicos de 1 columna (adherencia, récords, series de la semana y cada medida). Un mosaico impar al final ocupa 2 columnas. El registro de series de Entreno **no** usa bento (es una lista densa).

## Espaciado, radios y toque

| Token | Valor |
|---|---|
| `--space-xs/sm/md/lg/xl/2xl/3xl` | 4 / 8 / 16 / 24 / 32 / 48 / 64 px |
| `--radius-sm/md/lg/xl` | 8 / 12 / 16 / 20 px (tarjetas: 20) |
| `--touch-min` | **48 px**: botones y campos tocables, para usarse con una mano y sudado |

## Patrones de la app (no es landing page)

- **Navegación inferior** de 4 a 5 pestañas, con ícono y texto: Hoy · Rutina · Dieta · Progreso · Perfil.
- **Pantalla "Hoy":**
  - Entreno del día.
  - Dieta del tipo de día que toca.
  - Suplementos y agua.
- **Registro de series:** una fila por serie con peso, reps y check.
  - Los campos opcionales (RPE/RIR, tempo, descanso) se muestran solo si están activados.
  - Debajo de cada ejercicio, en azul claro, va "la vez pasada".
  - La sugerencia de progresión va en un chip naranja.
- **Temporizador de descanso:** barra fija abajo, en naranja, con vibración al terminar.
- **Acciones destructivas:** siempre con confirmación y con opción de deshacer.
- **Formularios:**
  - Etiqueta visible siempre.
  - Error junto al campo.
  - Teclado numérico (`inputmode="decimal"`) en pesos y medidas.
- **Íconos:** SVG de una sola familia (Lucide). **Nada de emojis como íconos.**
- **Movimiento:** transiciones de 150 a 250 ms. Se respeta `prefers-reduced-motion`.
- **Gamificación ligera:** los récords van en **dorado** (insignia y conteo); lo cumplido (series, comidas, adherencia) va en verde.

## Componentes base

```css
.btn-primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
  min-height: var(--touch-min);
  padding: 12px 20px;
  border-radius: var(--radius-md);
  font: 700 18px/1 var(--font-heading);
  letter-spacing: .02em;
  text-transform: uppercase;
  transition: filter 150ms ease, transform 150ms ease;
}
.btn-primary:active { transform: scale(.98); filter: brightness(.95); }

.btn-secondary {
  background: var(--color-secondary);
  color: var(--color-on-secondary);
  min-height: var(--touch-min);
  border-radius: var(--radius-md);
}

.btn-ghost {
  background: transparent;
  color: var(--color-primary-text);
  border: 2px solid var(--color-primary);
}

.card {
  background: var(--color-card) var(--card-gradient);
  color: var(--color-card-foreground);
  box-shadow: var(--shadow-1); /* sin borde */
  border-radius: var(--radius-xl);
  padding: var(--space-md);
}

.input {
  background: var(--color-muted);
  color: var(--color-foreground);
  border: 1px solid transparent;          /* se colorea solo en errores */
  box-shadow: var(--shadow-hundido);
  border-radius: var(--radius-sm);
  min-height: var(--touch-min);
  font-size: 16px; /* evita el zoom automático en iOS */
}
.input:focus-visible { outline: 3px solid var(--color-ring); outline-offset: 1px; }
```

## Prohibido

- Emojis como íconos.
- Hex sueltos en los componentes.
- Texto naranja `#F8490C` en tamaño pequeño.
- Azul `#016BDA` como texto sobre el fondo oscuro.
- Botones de menos de 48 px.
- Información que se distinga solo por el color, como en gráficas o estados.
- Quitar el anillo de foco.
- Bordes alrededor de tarjetas (se usa sombra).
- Vidrio (desenfoque) fuera de la barra inferior, el temporizador y la barra compacta del encabezado.
- Texto en los primeros 30 px bajo la barra de estado del iPhone (se ve borroso).
- Dorado para algo que no sea un récord.

## Checklist antes de entregar

- [ ] Contraste ≥ 4.5:1 en texto (verificado con los tokens).
- [ ] Objetivos táctiles ≥ 48 px con 8 px de separación.
- [ ] Teclado numérico en campos de peso, reps y medidas.
- [ ] Foco visible y `prefers-reduced-motion` respetado.
- [ ] Funciona en 360, 390 y 430 px de ancho sin scroll horizontal; zonas seguras de iPhone (`env(safe-area-inset-*)`).
- [ ] Íconos Lucide consistentes, sin emojis.
- [ ] Funciona sin conexión: fuentes y logo en caché.
