# Importación de planes del coach (formato `evasof-plan` v2)

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
- `reps_min` ≤ `reps_max` en cada bloque.
- **Corrección automática de biseries:** los ejercicios de un mismo `grupo` deben ir seguidos. Si la IA repite una letra para dos biseries distintas del mismo día (pasó con "A" en dos días de una rutina real), la app vuelve a poner las letras A, B, C… en orden y lo muestra en la vista previa.
- Avisos (no bloquean el guardado):
  - Un mismo ejercicio escrito distinto en varios días (ej. "Elevation con disco" y "Elevación con disco"). La app propone unificarlos.
  - Un ejercicio con un solo bloque de tipo `cluster` o `dropset` y un nombre que termina en "- cluster set" o "- drop set". Probablemente la IA lo separó del ejercicio anterior; la app propone unirlos.
- Antes de validar, se quitan las comillas de bloque (```` ```json ````) y el texto que la IA ponga alrededor. Si el JSON viene partido en dos respuestas ("continúa"), se pueden pegar las dos partes juntas.
- Si no viene la unidad de peso de un ejercicio, se usa la unidad preferida del usuario.

## Catálogo de ejercicios (para no partir el progreso)

Cada importación puede escribir un mismo ejercicio un poco distinto, por ejemplo "Elevaciones laterales en polea baja unilateral" en una y "Elevaciones laterales en polea baja" en otra. Si la app los tratara como ejercicios distintos, tu historial de pesos y PRs quedaría partido. Por eso:

- La app guarda un **catálogo de ejercicios por usuario**. Cada ejercicio de la rutina apunta a uno del catálogo.
- Al importar, cada nombre se compara con el catálogo (sin mayúsculas, acentos ni palabras de relleno, y por similitud). En la vista previa se ve así:
  - **Coincidencia exacta:** se liga solo.
  - **Parecido:** "¿Es el mismo que *Elevaciones laterales en polea baja*?" → Sí / No, es nuevo.
  - **Nuevo:** se crea en el catálogo.
- Las `alternativas` también se ligan al catálogo, así un "Sustituir ejercicio" en el gym queda registrado contra el ejercicio correcto.

## Descanso en biseries

En un `grupo`, el temporizador no corre entre ejercicios del grupo. Arranca al terminar la ronda completa, con el `descanso_seg` más alto de los ejercicios del grupo.

## Conteo de series (volumen semanal)

Series efectivas de un ejercicio = la suma de `series` de sus bloques, sin contar los de tipo `calentamiento`. Un drop set o un cluster cuenta como 1 serie por cada `series` del bloque.

## Cambios de formato

Si el formato cambia, se sube `version` y la app sigue aceptando las versiones anteriores, convirtiéndolas.

- **v2** (actual): cada ejercicio se describe con `bloques` (2X15, 2X10, 3X8RM, drop sets, clusters), más `alternativas` para variantes con "/".
- **v1**: usaba `series_detalle` por serie. Se descartó antes de construir la app porque no podía representar drop sets ni clusters; no hace falta convertirla.
