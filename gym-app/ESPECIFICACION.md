# EvaSof Training: especificación (v1)

Resumen de lo que se definió en la ronda de preguntas (25-nov-2026).

## 1. Visión general

| Tema | Decisión |
|---|---|
| Nombre | **EvaSof Training** (tentativo: nombre, logo y colores pueden cambiar) |
| Plataforma | PWA (web instalable en iPhone, Android y computadora) |
| Usuarios | Tú + amigos/familia, cada quien con su propio plan (el coach no entra a la app) |
| Acceso | Registro solo con **código de invitación** que tú generas |
| Login | Google |
| Datos | Nube con cuenta, sincronizados entre dispositivos |
| Offline | Sí: se registra sin señal y se sincroniza al volver la conexión |
| Unidades | kg **y** lb: se elige por ejercicio, con conversión automática |
| Diseño | Oscuro "modo gym": botones grandes, colores vivos, uso con una mano |
| Alcance v1 | Todo junto (rutinas, dieta, progreso, check-in, importación) |

## 2. Carga de planes del coach (PDF o imagen)

El coach manda los planes en **PDF o imagen**. Hay dos formas de cargarlos:

1. **Copiar y pegar (principal, gratis)**
   - La app muestra un **prompt** listo para copiar.
   - Lo pegas en Claude o Gemini junto con el PDF.
   - La IA responde con un **JSON en formato estricto**.
   - Pegas el JSON en la app, que lo **valida**. Si algo viene mal, te dice qué campo falla.
   - Ves una **vista previa** y la editas antes de guardar.
2. **API con Opus 5.5 (opcional, después)**
   - Subes el PDF y se procesa solo. Usa una clave central, con un límite de usos al mes por persona.
   - Costo estimado: ~$0.35–0.40 USD por PDF (~10K tokens de entrada y ~15K de salida, a $4/$20 por millón de tokens).

En los dos casos:
- Al importar una rutina o dieta nueva, **la anterior se archiva** con su fecha (historial de versiones).
- Siempre se puede **editar a mano** después de importar.

## 3. Rutinas

- **Estructura:** días (Día 1, Día 2...), cada uno con sus ejercicios. Cada ejercicio trae series, rango de reps, descanso y notas del coach.
- **Registro por serie:**
  - Siempre: **peso + reps**.
  - Opcionales, se activan o desactivan cuando quieras: **RPE/RIR**, **tempo**, **descanso real**.
- **Durante el entreno:**
  - Temporizador de descanso automático, con vibración o sonido.
  - Ver lo que hiciste **la vez pasada** en ese ejercicio.
  - **Sustituir ejercicio** (ej. máquina ocupada). Queda registrado.
- **Sugerencia de progresión (doble progresión):**
  - Si llegaste al tope del rango de reps en todas las series, sugiere subir peso: +2.5 kg / +5 lb, o el incremento que configures por ejercicio.
  - Si no llegaste, sugiere repetir el peso.
- **Cardio flexible:**
  - Máquina + tiempo, o máquina + meta de calorías.
  - Parámetros: inclinación, velocidad, nivel.
  - Registro: tiempo, calorías y frecuencia cardiaca.

## 4. Dieta

- **Formato:** menú fijo por comida con gramos exactos. Son 4 o 5 comidas, con horario casi siempre fijo.
- **Variantes por día (tipos de día libres):**
  - Cada usuario define sus propios tipos de día según lo que mande su coach. Ej: "Tren superior", "Tren inferior", "Descanso", "Alto en carbos".
  - Cada tipo de día tiene su propio menú (comidas, gramos, horarios y suplementos).
  - Cada día de la rutina se **vincula** a un tipo de día de dieta (ej. "Día 2 – Pierna" → "Tren inferior").
  - Al abrir la dieta de hoy, la app muestra **automáticamente** el menú que toca según el entreno del día. Si hoy no hay entreno, muestra el de descanso.
  - Se puede **cambiar a mano** si ese día cambiaste de entreno o no fuiste al gym.
  - Al importar el PDF, la IA detecta las variantes (ej. "Día de pierna", "Día de torso") y propone el vínculo con los días de la rutina.
- **Registro:** palomear cada comida para medir adherencia.
- **Extras:**
  - Lista del súper generada desde la dieta (por semana, sumando los gramos).
  - Suplementos con dosis y horario, para palomear.
  - Agua: meta diaria y contador rápido.

## 5. Progreso

- **Métricas corporales:** peso corporal, medidas (cintura, pecho, brazo, pierna, cadera...) y % de grasa o báscula inteligente. Fotos: no se incluyen en v1.
- **Gráficas:**
  - Fuerza por ejercicio, con PRs y 1RM estimado.
  - Volumen semanal (series por grupo muscular).
  - Adherencia de entrenos y comidas.
  - Peso corporal con tendencia (promedio móvil).
- **Check-in semanal para el coach:**
  - Mini cuestionario del 1 al 10: energía, sueño, hambre, estrés, más notas.
  - Se combina con el resumen de la semana (peso, adherencia, PRs, medidas).
  - Se exporta como **PDF o imagen** con gráficas.

## 6. Notificaciones

- Recordatorio de cada comida y suplemento, a una hora configurable por comida.
- Recordatorios de agua.
- Nota: en iPhone, las notificaciones de una PWA solo funcionan si la app se agrega a la pantalla de inicio (iOS 16.4 o más reciente).

## 7. Arquitectura propuesta

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | React + TypeScript + Vite + `vite-plugin-pwa` | PWA instalable, rápida y con un solo código |
| Estilos | Tailwind CSS (tema oscuro) | Diseño consistente y rápido de iterar |
| Offline | IndexedDB (Dexie) + cola de sincronización | Registrar en el gym sin señal |
| Backend | Supabase (Postgres + Auth con Google + Row Level Security) | Gratis para pocos usuarios; cada quien solo ve sus datos |
| Invitaciones | Tabla de códigos + validación al registrarse | Solo entra quien tenga código |
| Validación del JSON | Zod (esquema estricto) | Errores claros al pegar la respuesta de la IA |
| Gráficas | Recharts | Gráficas de fuerza, volumen, peso y adherencia |
| Check-in PDF/imagen | html-to-image + jsPDF | Reporte visual descargable |
| Notificaciones | Web Push + función programada en Supabase | Recordatorios aunque la app esté cerrada |
| Hosting | Netlify (gratis) | Despliegue automático desde GitHub |
| IA (opcional) | Función en servidor con la API de Claude (Opus 5.5) | La clave nunca queda expuesta en el navegador |

## 8. Modelo de datos (borrador)

- `perfiles`: usuario, nombre, unidades preferidas, ajustes de campos opcionales.
- `codigos_invitacion`: código, creado por, usado por, fecha.
- `rutinas`: versión, fecha de inicio y fin, activa (sí/no), origen (importada o manual).
  - `dias_rutina` (con `tipo_dia_dieta` vinculado) → `ejercicios_plan`: series, rango de reps, descanso, tempo, RIR objetivo, notas, unidad, incremento.
  - `cardio_plan`: máquina, tipo de meta (tiempo/calorías), parámetros.
- `sesiones`: fecha, día de rutina, notas.
  - `series_registradas`: peso, reps, RPE/RIR, tempo, descanso, sustituido por.
  - `cardio_registrado`.
- `dietas`: versión, fechas, activa.
  - `tipos_dia`: nombre libre (ej. tren superior, tren inferior, descanso), "es de descanso" (sí/no).
    - `comidas`: número, hora, alimentos con gramos y opciones.
    - `suplementos`: nombre, dosis, horario.
- `dieta_del_dia`: fecha y tipo de día usado (automático o cambiado a mano).
- `registro_comidas`, `registro_suplementos`, `registro_agua`.
- `metricas_corporales`: fecha, peso, medidas, % de grasa.
- `checkins`: semana, respuestas del 1 al 10, notas, PDF generado.

## 9. Pendientes por definir

- Incremento de peso por defecto (2.5 kg / 5 lb), configurable por ejercicio.
- Lista de grupos musculares para el volumen semanal (se puede asignar al importar).

## 10. Marca intercambiable

Por ahora el nombre, el logo y los colores (EvaSof Training) son **tentativos**. Para cambiarlos sin tocar el resto del código:

- **Un solo archivo de marca** (`src/config/brand.ts`) con el nombre, el nombre corto, la ruta del logo y los colores principales.
- **Colores solo por variables** (`tokens.css`). Los componentes nunca usan hex sueltos, así que cambiar la paleta es cambiar ese archivo.
- **Íconos de la PWA** (192, 512 y maskable) y favicon generados con un script a partir de un solo logo fuente.
- **Manifest de la PWA** (nombre en la pantalla de inicio, color de tema) generado desde `brand.ts`.

## 11. Estado (25-nov-2026)

**Hecho (v1.0):**
- App completa publicada en https://evasof-training.netlify.app.
- Funciona sin internet y se sincroniza con Supabase.
- Login con usuario y contraseña. Lo elegimos en lugar de Google porque el login de Google falla en apps instaladas en el iPhone.
- Invitaciones con código y panel de admin.
- Avisos push de descanso, comidas y agua.
- Check-in en PDF.
- Captura y edición manual de rutina y dieta (Planes → A mano, o "Editar" desde Entreno y Dieta).
- Estética premium (26-nov-2026): fondo negro OLED, vidrio en la barra inferior y el temporizador, tarjetas con sombra en lugar de borde, Progreso en mosaicos (bento) y dorado para los récords.
- Encabezado grande que se encoge al bajar y deja libre la franja que iOS 26 difumina; barra inferior flotante que se sube sola para no quedar tapada por la insignia de Netlify.
- Versión 1.1.0: modo claro "Pomelo" (Pomelo Pink 60 %, Spruce Night 30 %, Canary Volt 10 %) con selector Claro / Oscuro / Automático en Perfil, y la pantalla "Conoce la nueva imagen" después de actualizar.

**Por confirmar en un iPhone real:**
- Que lleguen las notificaciones push con la app instalada en la pantalla de inicio (iOS 16.4 o más reciente).

**Opcional después:**
- Importación con la API de Claude.
- Notificación de suplementos.
