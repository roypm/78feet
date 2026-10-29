# 78feet

Gestión de un box de CrossFit. Producto y arquitectura en [`docs/prd.md`](docs/prd.md) y [`docs/trd.md`](docs/trd.md).

```
apps/web          Next.js — web, API
packages/domain   @78feet/domain — reglas de cupo, calendario y esquemas zod
```

## Local

```bash
pnpm install
pnpm --filter web dev
```

La base es Neon (`neon.ts` + `.neon`). `neon deploy` escribe `.env.local`.
