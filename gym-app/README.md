# EvaSof Training

App web instalable (PWA) para seguir rutina, dieta y progreso del gym.

- **En producción:** https://evasof-training.netlify.app
- Funciona sin internet: todo se guarda primero en el celular (IndexedDB) y se respalda solo en Supabase.
- Cada persona entra con usuario y contraseña. Solo se crean cuentas con un código de invitación.

- Especificación: [`ESPECIFICACION.md`](ESPECIFICACION.md)
- Sistema de diseño: [`design-system/evasof-training/MASTER.md`](design-system/evasof-training/MASTER.md) (colores en `tokens.css`)
- Formato de importación y prompt: [`importacion/`](importacion/README.md)

## Pantallas

| Pantalla | Qué hace |
|---|---|
| **Entreno** | Día que toca (rotación o día de la semana), registro de series por bloque (peso/reps; RIR, tempo y descanso opcionales), la vez pasada, sugerencia de progresión, biseries, temporizador de descanso con vibración, sustituir por alternativas, kg/lb por ejercicio, cardio y resumen con récords |
| **Dieta** | Tipo de día automático según el entreno (o manual), comidas para palomear, agua, suplementos por tipo de día, macros y lista del súper |
| **Progreso** | Mosaicos tipo bento: peso con promedio de 7 días, adherencia, récords (en dorado), series de la semana, medidas, 1RM estimado por ejercicio, series por grupo contra rangos, y check-in semanal exportable a PDF o imagen |
| **Planes** | *Con IA:* copiar el prompt, pegar la respuesta, validar con errores en español, vista previa, coincidencias con el catálogo y guardar (archiva el plan anterior). *A mano:* crear rutina o dieta desde cero o editar la actual (`src/pantallas/planes/`), con el mismo esquema de validación, borrador autoguardado y confirmación de ejercicios parecidos (al confirmar, el catálogo toma el nombre nuevo) |
| **Perfil** | Unidades, meta, campos opcionales, descanso e incrementos, rangos de series, historial de planes, catálogo (renombrar y unir) y respaldo |

## Nube (Supabase)

Proyecto: `evasof-training` (ref `xgjlkxlxrkemhngtazdj`, región us-west-2).

| Pieza | Dónde | Qué hace |
|---|---|---|
| Esquema | `supabase/migraciones/001_inicial.sql` | `perfiles`, `codigos_invitacion`, `registros` (datos sincronizados como JSON por tabla/id), `suscripciones_push`, `notificaciones`, con RLS: cada quien ve solo lo suyo |
| Cron | `supabase/migraciones/002_cron.sql` | Cada 5 s revisa si hay avisos pendientes y, solo entonces, llama a `enviar-notificaciones` |
| `registrar` | `supabase/functions/registrar` | Crea la cuenta (usuario + contraseña) con un código de invitación. El registro público está apagado |
| `admin` | `supabase/functions/admin` | Crear/borrar códigos, ver personas y restablecer contraseñas (solo admins) |
| `enviar-notificaciones` | `supabase/functions/enviar-notificaciones` | Web Push con VAPID (descanso, comidas y agua) |

- **Secretos:** VAPID privada, `CRON_SECRET` y `SITIO_URL` viven en los secretos de funciones de Supabase. `url_enviar` y `cron_secret` viven en Vault. Nunca en el repositorio.
- **Valores públicos:** van en `.env.production` (URL, clave publicable y VAPID pública).
- **Sincronización** (`src/nube/sync.ts`):
  - Compara cada fila local con el hash de su último estado subido. Sube cambios y borrados.
  - Baja lo nuevo del servidor desde un cursor.
  - Si una fila cambió en los dos lados, gana la local.
  - Corre al abrir la app, unos segundos después de cada cambio, al salir de la app, al volver la señal y cada minuto.
- **Cuentas:** por dentro, Supabase usa un correo ficticio `usuario@usuarios.evasof.app` que nunca recibe nada.
- **Cerrar sesión:** borra los datos del celular; siguen en la nube.

Desplegar cambios del servidor:

```bash
SUPABASE_ACCESS_TOKEN=… npx supabase@3.4.0 functions deploy <función> --remote=xgjlkxlxrkemhngtazdj --use-api [--no-verify-jwt] --yes
```

(`registrar` y `enviar-notificaciones` usan `--no-verify-jwt`; `admin` no.)

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

- Sitio: `evasof-training` (https://evasof-training.netlify.app).
- Configuración: `netlify.toml`. Compila con `npm run build`, publica `dist` y marca sin caché el service worker y el `index.html`.
- Para publicar, se sube la carpeta `gym-app` y Netlify compila con `.env.production`.
- La protección con login de equipo de Netlify solo aplica a las versiones de prueba. La de producción es pública.

## Estructura

```
src/
  config/brand.ts          marca (nombre, logo)
  db/                      base local (Dexie), catálogo, sesiones, respaldo
  lib/                     lógica pura: formato del plan, importación, entreno, dieta, progreso
  componentes/             UI compartida (encabezado, navegación, gráficas, temporizador)
  pantallas/               Entreno, Dieta, Progreso, Importar, Perfil
```
