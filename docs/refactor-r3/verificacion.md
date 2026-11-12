# Verificación R3 — 12/11/2026

Comando: `TEST_DATABASE_URL=<URL de PostgreSQL local feet_test> pnpm test:db`.

PostgreSQL 17.6 del servicio `db-test`, puerto 55439 en esta ejecución. El runner exige una base local llamada feet_test y recrea sus schemas; no apunta al desarrollo ni a recursos remotos. Resultado: código de salida 0, sin omisiones. `drizzle-kit check` también pasa.

Resultados de aceptación y medidas de esta ejecución:

```text
PASS: all legacy migrations rebuilt in rollback-only schema; business catalog comparison
PASS: normalized training race, ordered phases/blocks, detach confirmation, date naming, template next-Monday scope, refund and cross-box denial
PASS: payment normalization/uniqueness/history/corrections/unpaid, slug races/stability, private images, preferences, public projections and calendar queries
PASS: real Better Auth Drizzle adapter, atomic provisioning, shared email/independent credentials, disabled HTTP paths, reset/session revocation
PLAN calendar: dataset={"people":"505","bookings":"6011"}, executionMs=0.072, root=Sort, rows=11
PLAN consumption: dataset={"people":"505","bookings":"6011"}, executionMs=0.096, root=Aggregate, rows=1
PLAN unpaid: dataset={"people":"505","bookings":"6011"}, executionMs=3.056, root=Limit, rows=25
PASS: capacity confirmation/rollback/refund, recovery, extra history/deletion, repeated/concurrent materialization, template restore, opening rollback/closure
PASS: credit and adjustment races, tariff/reservation race, tariff rollback, deactivation/reservation race, realm-scoped revocation, reactivation without resurrection
PASS: cross-box overlap race, foreign cancellation denied, late cancellation rollback, staff cancellation without refund
PASS: last seat, last quota, last pack credit, double cancellation, auth FK
PASS: empty database, migration replay, deterministic catalog seed, 4 partial indexes, 6 checks, independent auth realms, current membership race, aggregate consumption, rollback
```

Dominio: 9 archivos y 81 tests pasan. Typecheck de DB/aplicación pasa. Las medidas EXPLAIN corresponden a un fixture temporal revertido, no a percentiles ni a rendimiento de producción. No se ejecutó suite completa web/build/smoke en este cierre. Matriz HTTP y corte de runtime pendientes de R4.

El log original permanece local e ignorado por Git. SHA-256 del archivo de evidencia original: `9e8a9195b9255c60f6dcaa5cb96f8ea121b30d2dbf21a6de7cdbdbf7bc82666a`.
