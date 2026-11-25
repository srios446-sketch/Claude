# Importación de planes del coach (formato `evasof-plan` v1)

## Cómo se usa (copiar y pegar, sin API)

1. En la app: **Importar → Copiar prompt**. Copia el contenido de `prompt-importacion.txt`.
2. Abre Claude o Gemini, pega el prompt y **adjunta el PDF o la imagen** del coach.
3. Copia el bloque JSON de la respuesta y pégalo en la app.
4. La app lo valida. Si algo falla, te dice qué campo. Si todo está bien, muestra una **vista previa** y la lista de **dudas** que encontró la IA.
5. Corriges lo necesario y guardas. El plan anterior se archiva con su fecha.

## Archivos

| Archivo | Qué es |
|---|---|
| `prompt-importacion.txt` | El prompt exacto para copiar |
| `esquema.json` | JSON Schema (draft 2020-12) del formato; la app lo replica con Zod |
| `ejemplo.json` | El ejemplo del prompt; pasa la validación del esquema |

## Validaciones extra en la app (no caben en JSON Schema)

- Cada `tipo_dia_dieta` de la rutina y cada id en `solo_tipos_dia` deben existir en `dieta.tipos_dia`.
- Los ids `D#` y `TD#` no se repiten, y `orden` es consecutivo dentro de cada día y cada comida.
- Si `tipo_reps` es `reps` o `segundos`, debe venir `reps_min`/`reps_max` o `series_detalle`.
- Si viene `series_detalle`, su largo debe coincidir con `series`.
- `reps_min` ≤ `reps_max`.
- Antes de validar, se quitan las comillas de bloque (```` ```json ````) y el texto que la IA ponga alrededor.
- Si no viene la unidad de peso de un ejercicio, se usa la unidad preferida del usuario.

## Cambios de formato

Si el formato cambia, se sube `version` y la app sigue aceptando las versiones anteriores, convirtiéndolas.
