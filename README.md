# 78feet

Gestión de boxes de CrossFit. [PRD](docs/prd.md), [TRD](docs/trd.md) y [plan de refactor](PLAN-REFACTOR.md).

## Entorno local

Requisitos: Docker con Compose v2+ (`watch` requiere 2.22+), Node 22+ y pnpm 11.16.0. No requiere Neon ni secretos remotos.

Copia `infra/local.env.example` a `infra/local.env` y completa sus variables. Está ignorado por Git y excluido de las imágenes. Usa la base `feet_dev`, puertos locales libres para DB/tests/web/API (referencia: 54329/54330/3000/3001) y credenciales exclusivas de desarrollo. `PUBLIC_ORIGIN` debe coincidir exactamente con la URL del navegador, por ejemplo `http://localhost:3000`. Genera dos secretos distintos de al menos 32 caracteres para `MEMBER_AUTH_SECRET` y `STAFF_AUTH_SECRET` (`openssl rand -hex 32`, dos veces). `ADMIN_EMAIL` es obligatorio. `NATIVE_ORIGINS` es una lista separada por comas de orígenes permitidos para el futuro cliente móvil; puede quedar vacía.

```bash
pnpm local:up       # construye; migra; espera DB/API; arranca worker y web
pnpm local:seed     # catálogo y admin; repetible, no resetea contraseñas
pnpm local:dev      # sincroniza apps/web para recarga de Vite
pnpm local:logs
pnpm local:migrate
pnpm local:test     # suite completa sobre feet_test aislada
pnpm local:smoke    # datos ficticios en feet_dev; shell SPA y API por rol
pnpm local:up && node infra/measure-local.mjs  # bytes del build y latencia local
pnpm local:down     # conserva datos de desarrollo
```

Abre `/login` en el puerto web configurado. Selecciona Equipo para el admin y usa `ADMIN_LOGIN_ID` / `ADMIN_PASSWORD`. Socio usa DNI y su contraseña independiente. No existe acceso por email ni recuperación por correo.

Compose contiene `db`, `migrate`, `api`, `worker`, `web`, `seed`, `db-test` y `test`. API/worker usan Drizzle/pg y los mismos casos de uso. La web es la SPA Vite: recibe únicamente `API_INTERNAL_URL`, el proxy de desarrollo reenvía `/api` a Fastify y el navegador envía la cookie. No tiene credenciales de base ni secretos de autenticación. El API publica `/api/v1/health` (proceso) y `/api/v1/ready` (DB, 503 si falla). El healthcheck web comprueba `/login`.

La DB de desarrollo persiste en `feet-local_dev-data`; `db-test` usa almacenamiento temporal y base `feet_test`. Los puertos PostgreSQL y API solo escuchan en loopback. Dentro de Docker los hosts DB son `db:5432` y `db-test:5432`. Los scripts usan exclusivamente `infra/local.env`; no cargan otros archivos privados. Tras cambios en API/worker/paquetes/dependencias ejecuta `pnpm local:up`; watch solo sincroniza la web.

Para borrar únicamente los datos de esta composición local:

```bash
pnpm local:reset --confirm-local-data-loss
pnpm local:up
pnpm local:seed
```

La autorización de reset no se extiende a otras bases. Los runners de integración exigen PostgreSQL local y nombre `feet_test`, recrean sus schemas y no omiten casos sin configuración válida. `local:test` proporciona esa configuración y no usa el seed de desarrollo.

## Contratos y comprobaciones

```bash
pnpm contracts:generate # Zod/Fastify → OpenAPI → tipos del cliente
pnpm contracts:check    # regenera y rechaza diferencias
pnpm typecheck
pnpm build             # SPA Vite y comprobación del CSS, sin migraciones
pnpm local:test
```

En host, `TEST_DATABASE_URL` debe apuntar al puerto publicado de `db-test` para ejecutar `pnpm verify:backend`. Incluye dominio, catálogo Drizzle, integración de aplicación, API real, worker y pruebas web. `pnpm test` es el subconjunto dominio/web. Evidencias y límites de verificación: [R4](docs/refactor-r4/verificacion.md); bloqueos/transacciones: [R3](docs/refactor-r3/bloqueos.md).

El cliente común usa cookies, errores tipados, AbortSignal y no reintenta mutaciones. El contrato versionado está en `packages/contracts/openapi.json`; el generador convierte campos binarios multipart a `Blob`. Los DTO públicos se validan al serializar; nunca incluyen filas de autenticación.

## Materialización

El worker arranca recuperando el horizonte y después ejecuta a las 03:15 de Europe/Madrid, incluidos cambios de horario. Una conexión PostgreSQL mantiene el liderazgo mediante advisory lock; las réplicas esperan. Cada ejecución tiene tres intentos acotados; tras agotarlos el proceso continuo espera 30 segundos y recupera. Compose reinicia el proceso si pierde la conexión de liderazgo. SIGTERM/SIGINT libera recursos. El heartbeat comprueba frescura en un máximo de 26 horas.

`DATABASE_URL=... pnpm --filter @78feet/worker start --once` ejecuta una pasada sin servidor HTTP; si hay otro líder no materializa. Unicidad y transacciones hacen segura la repetición y concurrencia. No existe ruta cron ni configuración Vercel Cron activa.

## Estado

R3–R6 completas. Better Auth es el único sistema de autenticación y el worker el único planificador. La web vigente es la SPA Vite y consulta solo la API. El esquema vive en Drizzle; no hay cliente Prisma, Next, Neon ni Vercel en el árbol activo. El alojamiento sigue pendiente. Ningún comando local modifica recursos remotos. Expo y su comprobación en dispositivo corresponden a R7. Evidencia del corte: [PLAN-REFACTOR §19](PLAN-REFACTOR.md).
