# 78feet

Gestión de un box de CrossFit. Producto y arquitectura en [`docs/prd.md`](docs/prd.md) y [`docs/trd.md`](docs/trd.md). Orden de construcción: [`docs/hoja-de-ruta.md`](docs/hoja-de-ruta.md).

```
apps/web          Next.js — web, API y panel de staff
packages/domain   @78feet/domain — cupo, calendario, biblioteca y esquemas zod
```

## Local

Hace falta **Node 22+** y **pnpm 11** (`corepack enable`).

```bash
pnpm install
```

Los secretos **no están en git**. En un PC nuevo copiá `apps/web/.env` del otro, o:

```bash
cp apps/web/.env.example apps/web/.env
```

y pegá `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `ADMIN_PASSWORD` y `CRON_SECRET`. Es la misma Neon (`.neon` ya apunta al proyecto). Alternativa si tenés el CLI logueado: `neon deploy` (escribe `.env.local`).

Si la rama trae migraciones:

```bash
pnpm --filter web db:migrate
pnpm --filter web db:seed
```

El seed solo crea el admin si no existe, con `ADMIN_LOGIN_ID` (por defecto `admin`) y `ADMIN_PASSWORD`.

```bash
pnpm test
pnpm dev
```

Abrí [http://localhost:3000/login](http://localhost:3000/login). Staff → `/staff/hoy`. Socio → `/calendario`.
