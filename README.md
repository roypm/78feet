# 78feet

Gestión de un box de CrossFit. [PRD](docs/prd.md), [TRD](docs/trd.md) y [plan de refactor](PLAN-REFACTOR.md).

## Entorno local (R2)

Requisitos: Docker Engine/Desktop con Compose v2+ (`develop.watch` requiere 2.22+), Node 22+ y pnpm 11.16.0 (`corepack enable`). No requiere Neon ni secretos remotos.

Copia `infra/local.env.example` a `infra/local.env` y completa sus variables antes del primer arranque. El archivo local está ignorado por Git; los ejemplos solo enumeran nombres. Usa `POSTGRES_USER=local`, `POSTGRES_DB=feet_dev`, puertos `54329`/`54330`/`3000` para DB/tests/web y credenciales elegidas exclusivamente para este entorno.

```bash
pnpm local:up       # construye, espera PostgreSQL, aplica migraciones y levanta Next
pnpm local:seed     # explícito; crea admin si no existe
pnpm local:dev      # sincroniza cambios de apps/web para la recarga de Next
pnpm local:logs     # Ctrl-C deja de seguir logs, no para servicios
pnpm local:migrate # aplicar migraciones manualmente
pnpm local:test    # migra y prueba contra db-test independiente
pnpm local:down    # para y retira contenedores; conserva datos de desarrollo
```

Abre http://localhost:3000/login. El acceso de admin usa `ADMIN_LOGIN_ID` y `ADMIN_PASSWORD` de tu configuración local. El seed no cambia la contraseña de una cuenta ya existente.

`infra/local.env` es la configuración explícita que usan los scripts de Compose; no leen otros `.env` privados. `db` persiste en `feet-local_dev-data`; `db-test` usa almacenamiento temporal, usuario propio, base `feet_test` y puerto distinto. Ambas escuchan solo en loopback: desarrollo `127.0.0.1:54329`, tests `127.0.0.1:54330`. Dentro de Docker los hosts son `db:5432` y `db-test:5432`; nunca usar allí localhost para PostgreSQL.

La configuración de Next/API actual se inyecta por servicio: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `ADMIN_LOGIN_ID`, `ADMIN_PASSWORD`, `CRON_SECRET`. `WEB_PORT` define el puerto publicado. `.env.example` enumera las opciones de Compose; `apps/web/.env.example` enumera las variables para ejecutar herramientas en el host; completa sus URLs con la configuración local. Las imágenes excluyen todos los `.env` y la configuración Neon. Para cambios de dependencias reconstruye con `pnpm local:up`; los cambios del dominio o de configuración fuera de apps/web también requieren reconstrucción. Watch no sincroniza secretos, dependencias ni artefactos.

Para borrar **solo los datos locales de esta composición**, con confirmación explícita:

```bash
pnpm local:reset --confirm-local-data-loss
pnpm local:up
pnpm local:seed
```

No ejecutar `prisma migrate reset` contra URLs de otros entornos. Reiniciar o parar no resetea desarrollo. La base de tests persiste mientras su contenedor exista; `local:down` la descarta. Los tests no cargan `.env`: sin `TEST_DATABASE_URL` omiten integración; con ella exigen un host local y la base `feet_test`. `local:test` la configura automáticamente y no ejecuta el seed de desarrollo.

## Estado y dependencias posteriores

Actualmente `apps/web` es Next.js con API integrada y Prisma; `packages/domain` contiene reglas puras. El healthcheck web comprueba `/login`; PostgreSQL tiene su propia comprobación. No equivale a readiness de la futura API.

La composición ejecuta únicamente implementaciones existentes: `db`, `migrate`, `web`, `seed`, `db-test` y `test`. R3 deja la persistencia de destino en `packages/db` y los casos de uso en `packages/application`; el corte de consumidores actualizará los servicios de migración y seed de Compose. R4 incorporará `api` con health/readiness y `worker` con materialización Madrid, coordinación y recuperación; entonces retirará el cron HTTP actual. R5 sustituirá Next por Vite y configurará el proxy `/api`. No hay servicios vacíos ni segundo planificador. Expo usará la dirección LAN del ordenador, nunca el localhost del teléfono; su configuración corresponde a R7. Alojamiento pendiente.

Las dependencias/configuración históricas de Neon y Vercel aún presentes pertenecen al runtime pendiente de sustituir; ningún comando Docker local las usa ni modifica recursos remotos.

Persistencia de destino **R3 completada**: `packages/db` contiene esquema Drizzle,
migración inicial y pool pg; `packages/application` contiene casos de uso,
consultas, seed y pruebas de integración. Cierre y evidencias en
[PLAN-REFACTOR §14](PLAN-REFACTOR.md#14-r3--cierre-de-persistencia-del-destino),
[log PostgreSQL](docs/refactor-r3/verificacion.md) y
[auditoría de bloqueos](docs/refactor-r3/bloqueos.md).

- `pnpm --filter @78feet/db generate`: generar migraciones.
- `DATABASE_URL=... pnpm --filter @78feet/db migrate`: aplicar migraciones.
- `DATABASE_URL=... ADMIN_LOGIN_ID=... ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm --filter @78feet/application seed`: catálogo y admin con credencial Better Auth; repetible sin duplicar ni resetear contraseñas.
- `TEST_DATABASE_URL=... pnpm test:db`: comprobar historial Drizzle e integración PostgreSQL. Exige base local `feet_test` y **recrea sus schemas**; usar solo el contenedor `db-test`.

No aplicar el esquema Drizzle sobre la base Prisma del runtime anterior. Compose
y `local:*` conservan el camino R2 hasta sustituir sus consumidores. R3 certifica
la persistencia del destino, no el corte de la aplicación.

**R4 detenida por petición del usuario.** Hay borradores de autenticación en
`apps/api/src/auth.ts` y DTO en `packages/contracts/src/index.ts`, además de sus
manifiestos y dependencias. No hay servidor Fastify montado ni API operativa,
OpenAPI generado, cliente generado o worker. Los borradores no están conectados
a Compose ni sustituyen la autenticación o el cron actuales. No empezar R5.
