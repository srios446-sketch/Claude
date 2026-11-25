# EvaSof Training

App web instalable (PWA) para seguir rutina, dieta y progreso del gym. Funciona sin internet: todos los datos se guardan en el dispositivo (IndexedDB). La sincronización en la nube con cuentas de Google llegará después con Supabase.

- Especificación: [`ESPECIFICACION.md`](ESPECIFICACION.md)
- Sistema de diseño: [`design-system/evasof-training/MASTER.md`](design-system/evasof-training/MASTER.md) (colores en `tokens.css`)
- Formato de importación y prompt: [`importacion/`](importacion/README.md)

## Pantallas

| Pantalla | Qué hace |
|---|---|
| **Entreno** | Día que toca (rotación o día de la semana), registro de series por bloque (peso/reps; RIR, tempo y descanso opcionales), la vez pasada, sugerencia de progresión, biseries, temporizador de descanso con vibración, sustituir por alternativas, kg/lb por ejercicio, cardio y resumen con récords |
| **Dieta** | Tipo de día automático según el entreno (o manual), comidas para palomear, agua, suplementos por tipo de día, macros y lista del súper |
| **Progreso** | Peso con promedio de 7 días, adherencia, medidas, 1RM estimado por ejercicio, récords, series por grupo contra rangos, y check-in semanal exportable a PDF o imagen |
| **Importar** | Copiar el prompt, pegar la respuesta de la IA, validar con errores en español, vista previa, coincidencias con el catálogo y guardar (archiva el plan anterior) |
| **Perfil** | Unidades, meta, campos opcionales, descanso e incrementos, rangos de series, historial de planes, catálogo (renombrar y unir) y respaldo |

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas unitarias (Vitest)
npm run build      # typecheck + build de producción en dist/
npm run preview    # sirve dist/ (con service worker) en http://localhost:4173
```

Para probar la importación con una rutina real sin subirla al repositorio:

```bash
EVASOF_RUTINA=/ruta/a/rutina.json npm test
```

## Cambiar nombre, logo o colores

1. Nombre y ruta del logo: `src/config/brand.ts`.
2. Logo: reemplaza la imagen de `logoFuente` y corre `npm run icons`, que regenera los íconos de la PWA y el logo de la interfaz.
3. Colores: `design-system/evasof-training/tokens.css`. Las pantallas solo usan variables, nunca colores sueltos.

## Publicar (Netlify)

- Directorio base: `gym-app`
- Comando de build: `npm run build`
- Directorio a publicar: `gym-app/dist`

`public/_redirects` ya manda todas las rutas a `index.html`.

## Estructura

```
src/
  config/brand.ts          marca (nombre, logo)
  db/                      base local (Dexie), catálogo, sesiones, respaldo
  lib/                     lógica pura: formato del plan, importación, entreno, dieta, progreso
  componentes/             UI compartida (encabezado, navegación, gráficas, temporizador)
  pantallas/               Entreno, Dieta, Progreso, Importar, Perfil
```
