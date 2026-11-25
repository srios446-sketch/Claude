# EvaSof Training: sistema de diseño (Master)

> **Lógica:** al construir una pantalla, revisa primero `pages/<pantalla>.md`. Si existe, sus reglas **reemplazan** a este archivo. Si no existe, sigue este archivo.

- **Base:** generado con la skill *UI UX Pro Max* (`fitness gym tracker app dark`). Categoría: Fitness/Gym App. Estilo: Vibrant & Block-based + modo oscuro.
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
| Éxito | `#22C55E` | `--color-success` | Serie completada, PR, comida palomeada | texto `#0F172A`: 7.83:1 |
| Destructivo | `#F43F5E` | `--color-destructive` | Borrar/eliminar (rosa-rojo, para no confundirse con el naranja) | texto `#0F172A`: 4.86:1 |
| Fondo | `#1F2937` | `--color-background` | Fondo general (gris oscuro) | — |
| Texto | `#F8FAFC` | `--color-foreground` | Texto principal | 14.03:1 |
| Tarjeta | `#313742` | `--color-card` | Tarjetas, hojas inferiores | — |
| Atenuado | `#37414F` / `#CBD5E1` | `--color-muted` / `--color-muted-foreground` | Campos inactivos, texto secundario | 6.96:1 |
| Borde | `#4B5563` | `--color-border` | Bordes de tarjetas y campos | — |
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

## Espaciado, radios y toque

| Token | Valor |
|---|---|
| `--space-xs/sm/md/lg/xl/2xl/3xl` | 4 / 8 / 16 / 24 / 32 / 48 / 64 px |
| `--radius-sm/md/lg` | 8 / 12 / 16 px |
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
- **Gamificación ligera:** destacar PRs y rachas de adherencia en verde.

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
  background: var(--color-card);
  color: var(--color-card-foreground);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
}

.input {
  background: var(--color-muted);
  color: var(--color-foreground);
  border: 1px solid var(--color-border);
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

## Checklist antes de entregar

- [ ] Contraste ≥ 4.5:1 en texto (verificado con los tokens).
- [ ] Objetivos táctiles ≥ 48 px con 8 px de separación.
- [ ] Teclado numérico en campos de peso, reps y medidas.
- [ ] Foco visible y `prefers-reduced-motion` respetado.
- [ ] Funciona en 360, 390 y 430 px de ancho sin scroll horizontal; zonas seguras de iPhone (`env(safe-area-inset-*)`).
- [ ] Íconos Lucide consistentes, sin emojis.
- [ ] Funciona sin conexión: fuentes y logo en caché.
