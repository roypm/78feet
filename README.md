# 78feet

Gestión de un box de CrossFit. Producto y arquitectura en [`docs/prd.md`](docs/prd.md) y [`docs/trd.md`](docs/trd.md).

```
apps/web          Next.js — web, API
packages/domain   @78feet/domain — reglas de cupo, calendario y esquemas zod
```

## Local

```bash
pnpm install
pnpm test
pnpm --filter web dev
```

La base es Neon (`neon.ts` + `.neon`). `neon deploy` escribe `.env.local`. La app usa `apps/web/.env` (`DATABASE_URL` pooled, `DIRECT_URL` para migraciones, `JWT_SECRET`, `ADMIN_PASSWORD`).

```bash
pnpm --filter web db:migrate
pnpm --filter web db:seed
```
