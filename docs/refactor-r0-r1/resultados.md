# Evidencias R0 y R1 — 12/11/2026

Corte histórico anterior a R2/R3. Estos resultados no representan el estado de las suites tras el portado.

## Tests

`pnpm test`: dominio 81 pasan; web 25 fallan, 142 pasan, 2 omitidos. Fallos de timeout/hooks, limpieza RESTRICT y unicidad de membresía. No se atribuye una causa única sin diagnóstico. Los tests de integración cargaron variables; no hubo omisión global por falta de DB.

## Tipos

`pnpm typecheck`: dominio y web pasan.

## Lint

`pnpm --filter web lint`: 21 errores y 1 warning; no pasa.

## Build

`pnpm build`: interrumpido por SIGTERM; sin resultado de compilación ni CSS, no se considera correcto.

## Probe de identidad

`auth-probe.mjs`, Better Auth 1.7.22, adapter en memoria: acceso username en ambos ámbitos, correo compartido real no verificado, contraseñas independientes y siete rutas HTTP de email/autoregistro bloqueadas. Email rechazado como identificador de acceso. Sin callbacks ni transporte de correo. Este probe no valida PostgreSQL; esa evidencia posterior está en [R3](../refactor-r3/verificacion.md).

El inventario, límites de la referencia y escenarios pendientes están en [referencia.md](referencia.md). Los logs originales se conservan localmente e ignorados por Git, conforme a docs/git-flow.md.
