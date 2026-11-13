# R6 — verificación (13/11/2026)

PostgreSQL 17.6 local. Host Node 22 / pnpm 11.16.0. Compose `feet-local`. No se tocaron recursos remotos.

## Comandos

| Comando | Resultado |
|---|---|
| `pnpm install` tras retirar `@neon/*` y regenerar el lockfile | Pasa. No instala `next`, `prisma`, `@prisma/client`, `@neon/*` ni `@vercel/postgres`. |
| `pnpm typecheck` | Pasa. |
| `pnpm --filter web lint` | Pasa, con ESLint recomendado, typescript-eslint y las reglas clásicas de hooks. |
| `pnpm test` | Dominio 81. Web 104. |
| `pnpm contracts:check` | Sin diferencias. |
| `pnpm build` | Pasa y el CSS de producción queda compilado. |
| `TEST_DATABASE_URL=postgresql://local_test:local_test_password@127.0.0.1:55439/feet_test pnpm test:db` | Pasa: migración desde cero, segunda aplicación, seed, 4 índices parciales, 6 checks, carreras de plaza/cupo/bono/solape/tarifa/baja/edición/materialización. |
| Misma URL, `pnpm --filter @78feet/api test` | Pasa. Matriz R0 cubierta, cron ausente, 89 denegaciones de rol. |
| Misma URL, `pnpm --filter @78feet/worker test` | Pasa. |
| `pnpm local:up` | Imagen sin Next/Prisma/Neon. Migración, API, worker y web saludables. |
| `pnpm local:seed` y `pnpm local:smoke` | Pasan. Shell SPA por rol, denegaciones de API, reserva real y cron 404. |
| `node infra/measure-local.mjs` | Cifras de abajo. |
| Navegador local | Login de admin, Equipo, redirección de `/calendario` a Hoy, Hoy vacío en 390 px, foco con anillo, tema claro/oscuro, diálogo «Nueva cuenta de staff» y Escape, logout y `/staff/hoy` sin sesión vuelve a login. |

`drizzle-kit check` imprime `Everything's fine`. La imagen `feet-local-runtime:dev` no contiene `node_modules/next`, `prisma`, `@prisma/client` ni `@neon`.

## Carga inicial de la SPA

El HTML de producción precarga el CSS y cuatro scripts. Ninguno de los 32 chunks de páginas, date picker, time picker o formulario de entrenamiento entra en esa precarga.

| Archivo | gzip |
|---|---|
| `index.html` | 571 B |
| `assets/index-Bjsts0Cz.js` | 119653 B |
| `assets/loading-state-Ct_T8_j5.js` | 104713 B |
| `assets/src-DRgINeBH.js` | 27664 B |
| `assets/check-BAQZnDqL.js` | 163 B |
| `assets/index-B3y98lIp.css` | 17604 B |
| Total inicial | 270363 B |

El chunk de carga incluye el paquete de iconos. Los editores quedan fuera del primer documento.

## API local

30 peticiones seguidas contra el Compose ya sembrado, desde el mismo host. La reserva es una sola alta con resultado 201.

| Lectura | p50 | p95 |
|---|---|---|
| Hoy | 20,9 ms | 29,5 ms |
| Socios, página 1 | 21,1 ms | 31,0 ms |
| Opciones de ficha | 16,8 ms | 25,1 ms |
| Sedes | 14,6 ms | 17,1 ms |
| Calendario | 17,3 ms | 20,5 ms |
| Reserva | 39,2 ms, n=1 | — |

Planes sobre el fixture temporal de 505 cuentas y 6011 reservas, revertido al terminar el test: calendario 0,252 ms (Sort, 11 filas), consumo 0,176 ms (Aggregate, 1 fila), impagos 7,747 ms (Limit, 25 filas). No hay contador de consultas en el proceso de la API.

## Materialización

El worker del Compose, al arrancar sobre el volumen ya existente, registró `{"event":"materialized","from":"2026-11-13","to":"2026-12-06","created":0}`. Un `start --once` adicional terminó con código 0 sin esa línea: el proceso del servicio ya tenía el liderazgo. La repetición y la carrera simultánea están en la batería de `feet_test`.

## Límites

R0 no dejó bytes ni latencias utilizables: el build de entonces se interrumpió. Estas cifras no se comparan con un antes inventado.

Better Auth 1.7.22 depende de sus adapters, incluido `@better-auth/prisma-adapter`, y de Kysely. El código de 78feet usa el adapter Drizzle. El cliente Prisma, Next y Neon no se instalan. El lockfile de Drizzle sigue declarando peers opcionales de otros drivers; no están instalados.

No hay CI. El aviso de Vite sobre cargar la config como CommonJS no rompe test ni build. En desarrollo, React Router avisa de `HydrateFallback`; las pantallas comprobadas se muestran igual. No se recorrió con teclado cada diálogo ni la sesión visual de socio y coach: esas cuentas sí pasaron el smoke HTTP, la reserva y la matriz de 89 denegaciones. Expo y el alojamiento siguen pendientes.
