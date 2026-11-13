# R0 — referencia verificable (12/11/2026)

Inventario del árbol anterior al corte. Las rutas de archivo de esta página describen ese corte y se retiraron en R6. La matriz de comportamiento sigue siendo el criterio de la web recuperada; la API vigente la cubre salvo `/api/v1/cron/materialize`, sustituido por el worker.

Referencia: `fb8c5e4ccf83c0e6aeb2cc15d7e0cf72f1933ab7`. Árbol inicial limpio: `git status --porcelain=v1` y `git diff --stat` sin salida. No existen las mejoras locales sin commit que presumía el plan; están en la referencia actual. Node 22.23.1; pnpm 11.16.0. No se hicieron resets ni migraciones.

## API actual

Prefijo `/api/v1`. Una fila por método exportado; la ruta de archivo es la referencia de entrada, validación, DTO y servicio. M=member, C=coach, A=admin. Las comprobaciones de permisos del servidor siguen siendo obligatorias al portar.

| Método | Ruta | Acceso | Fuente |
|---|---|---|---|
| DELETE | `/api/v1/admin/bookings/[id]` | coach, admin | [handler](../../apps/web/app/api/v1/admin/bookings/[id]/route.ts) |
| POST | `/api/v1/admin/bookings` | coach, admin | [handler](../../apps/web/app/api/v1/admin/bookings/route.ts) |
| PATCH | `/api/v1/admin/boxes/[id]` | admin | [handler](../../apps/web/app/api/v1/admin/boxes/[id]/route.ts) |
| GET | `/api/v1/admin/boxes` | coach, admin | [handler](../../apps/web/app/api/v1/admin/boxes/route.ts) |
| POST | `/api/v1/admin/boxes` | admin | [handler](../../apps/web/app/api/v1/admin/boxes/route.ts) |
| PATCH | `/api/v1/admin/class-types/[id]` | admin | [handler](../../apps/web/app/api/v1/admin/class-types/[id]/route.ts) |
| DELETE | `/api/v1/admin/class-types/[id]` | admin | [handler](../../apps/web/app/api/v1/admin/class-types/[id]/route.ts) |
| GET | `/api/v1/admin/class-types` | coach, admin | [handler](../../apps/web/app/api/v1/admin/class-types/route.ts) |
| POST | `/api/v1/admin/class-types` | admin | [handler](../../apps/web/app/api/v1/admin/class-types/route.ts) |
| GET | `/api/v1/admin/coaches` | coach, admin | [handler](../../apps/web/app/api/v1/admin/coaches/route.ts) |
| GET | `/api/v1/admin/day` | coach, admin | [handler](../../apps/web/app/api/v1/admin/day/route.ts) |
| GET | `/api/v1/admin/hours` | coach, admin | [handler](../../apps/web/app/api/v1/admin/hours/route.ts) |
| PATCH | `/api/v1/admin/hours` | admin | [handler](../../apps/web/app/api/v1/admin/hours/route.ts) |
| POST | `/api/v1/admin/instances/[id]/restore-template` | coach, admin | [handler](../../apps/web/app/api/v1/admin/instances/[id]/restore-template/route.ts) |
| GET | `/api/v1/admin/instances/[id]` | coach, admin | [handler](../../apps/web/app/api/v1/admin/instances/[id]/route.ts) |
| PATCH | `/api/v1/admin/instances/[id]` | coach, admin | [handler](../../apps/web/app/api/v1/admin/instances/[id]/route.ts) |
| DELETE | `/api/v1/admin/instances/[id]` | coach, admin | [handler](../../apps/web/app/api/v1/admin/instances/[id]/route.ts) |
| POST | `/api/v1/admin/instances` | coach, admin | [handler](../../apps/web/app/api/v1/admin/instances/route.ts) |
| POST | `/api/v1/admin/members/[id]/credits` | coach, admin | [handler](../../apps/web/app/api/v1/admin/members/[id]/credits/route.ts) |
| POST | `/api/v1/admin/members/[id]/deactivate` | admin | [handler](../../apps/web/app/api/v1/admin/members/[id]/deactivate/route.ts) |
| POST | `/api/v1/admin/members/[id]/payment-box` | coach, admin | [handler](../../apps/web/app/api/v1/admin/members/[id]/payment-box/route.ts) |
| POST | `/api/v1/admin/members/[id]/quota-adjustments` | coach, admin | [handler](../../apps/web/app/api/v1/admin/members/[id]/quota-adjustments/route.ts) |
| POST | `/api/v1/admin/members/[id]/reactivate` | admin | [handler](../../apps/web/app/api/v1/admin/members/[id]/reactivate/route.ts) |
| POST | `/api/v1/admin/members/[id]/reset-password` | coach, admin | [handler](../../apps/web/app/api/v1/admin/members/[id]/reset-password/route.ts) |
| GET | `/api/v1/admin/members/[id]` | coach, admin | [handler](../../apps/web/app/api/v1/admin/members/[id]/route.ts) |
| PATCH | `/api/v1/admin/members/[id]` | coach, admin | [handler](../../apps/web/app/api/v1/admin/members/[id]/route.ts) |
| POST | `/api/v1/admin/members/[id]/tariff` | coach, admin | [handler](../../apps/web/app/api/v1/admin/members/[id]/tariff/route.ts) |
| GET | `/api/v1/admin/members` | coach, admin | [handler](../../apps/web/app/api/v1/admin/members/route.ts) |
| POST | `/api/v1/admin/members` | coach, admin | [handler](../../apps/web/app/api/v1/admin/members/route.ts) |
| PATCH | `/api/v1/admin/payments/[id]` | coach, admin | [handler](../../apps/web/app/api/v1/admin/payments/[id]/route.ts) |
| DELETE | `/api/v1/admin/payments/[id]` | coach, admin | [handler](../../apps/web/app/api/v1/admin/payments/[id]/route.ts) |
| POST | `/api/v1/admin/payments` | coach, admin | [handler](../../apps/web/app/api/v1/admin/payments/route.ts) |
| GET | `/api/v1/admin/staff/[id]` | admin | [handler](../../apps/web/app/api/v1/admin/staff/[id]/route.ts) |
| PATCH | `/api/v1/admin/staff/[id]` | admin | [handler](../../apps/web/app/api/v1/admin/staff/[id]/route.ts) |
| GET | `/api/v1/admin/staff` | admin | [handler](../../apps/web/app/api/v1/admin/staff/route.ts) |
| POST | `/api/v1/admin/staff` | admin | [handler](../../apps/web/app/api/v1/admin/staff/route.ts) |
| PATCH | `/api/v1/admin/tariffs/[id]` | admin | [handler](../../apps/web/app/api/v1/admin/tariffs/[id]/route.ts) |
| GET | `/api/v1/admin/tariffs` | coach, admin | [handler](../../apps/web/app/api/v1/admin/tariffs/route.ts) |
| POST | `/api/v1/admin/tariffs` | admin | [handler](../../apps/web/app/api/v1/admin/tariffs/route.ts) |
| PATCH | `/api/v1/admin/templates/[id]` | admin | [handler](../../apps/web/app/api/v1/admin/templates/[id]/route.ts) |
| DELETE | `/api/v1/admin/templates/[id]` | admin | [handler](../../apps/web/app/api/v1/admin/templates/[id]/route.ts) |
| POST | `/api/v1/admin/templates/apply-draft` | admin | [handler](../../apps/web/app/api/v1/admin/templates/apply-draft/route.ts) |
| GET | `/api/v1/admin/templates` | coach, admin | [handler](../../apps/web/app/api/v1/admin/templates/route.ts) |
| POST | `/api/v1/admin/templates` | admin | [handler](../../apps/web/app/api/v1/admin/templates/route.ts) |
| GET | `/api/v1/admin/trainings/[id]` | coach, admin | [handler](../../apps/web/app/api/v1/admin/trainings/[id]/route.ts) |
| PATCH | `/api/v1/admin/trainings/[id]` | coach, admin | [handler](../../apps/web/app/api/v1/admin/trainings/[id]/route.ts) |
| DELETE | `/api/v1/admin/trainings/[id]` | coach, admin | [handler](../../apps/web/app/api/v1/admin/trainings/[id]/route.ts) |
| GET | `/api/v1/admin/trainings` | coach, admin | [handler](../../apps/web/app/api/v1/admin/trainings/route.ts) |
| POST | `/api/v1/admin/trainings` | coach, admin | [handler](../../apps/web/app/api/v1/admin/trainings/route.ts) |
| GET | `/api/v1/admin/unpaid` | coach, admin | [handler](../../apps/web/app/api/v1/admin/unpaid/route.ts) |
| GET | `/api/v1/admin/week` | coach, admin | [handler](../../apps/web/app/api/v1/admin/week/route.ts) |
| POST | `/api/v1/auth/login` | público | [handler](../../apps/web/app/api/v1/auth/login/route.ts) |
| POST | `/api/v1/auth/logout` | público | [handler](../../apps/web/app/api/v1/auth/logout/route.ts) |
| GET | `/api/v1/auth/me` | sesión activa; reglas de imagen/me en handler | [handler](../../apps/web/app/api/v1/auth/me/route.ts) |
| DELETE | `/api/v1/bookings/[id]` | member | [handler](../../apps/web/app/api/v1/bookings/[id]/route.ts) |
| POST | `/api/v1/bookings` | member | [handler](../../apps/web/app/api/v1/bookings/route.ts) |
| GET | `/api/v1/calendar` | member | [handler](../../apps/web/app/api/v1/calendar/route.ts) |
| GET | `/api/v1/class-type-images/[key]` | sesión activa; reglas de imagen/me en handler | [handler](../../apps/web/app/api/v1/class-type-images/[key]/route.ts) |
| GET | `/api/v1/cron/materialize` | CRON_SECRET | [handler](../../apps/web/app/api/v1/cron/materialize/route.ts) |
| POST | `/api/v1/cron/materialize` | CRON_SECRET | [handler](../../apps/web/app/api/v1/cron/materialize/route.ts) |
| GET | `/api/v1/health` | público | [handler](../../apps/web/app/api/v1/health/route.ts) |
| GET | `/api/v1/instances/[id]` | member | [handler](../../apps/web/app/api/v1/instances/[id]/route.ts) |
| GET | `/api/v1/me/bookings/history` | member | [handler](../../apps/web/app/api/v1/me/bookings/history/route.ts) |
| GET | `/api/v1/me/bookings` | member | [handler](../../apps/web/app/api/v1/me/bookings/route.ts) |
| GET | `/api/v1/me/preferences` | M,C,A | [handler](../../apps/web/app/api/v1/me/preferences/route.ts) |
| PATCH | `/api/v1/me/preferences` | M,C,A | [handler](../../apps/web/app/api/v1/me/preferences/route.ts) |
| POST | `/api/v1/me/profile-image` | M,C,A | [handler](../../apps/web/app/api/v1/me/profile-image/route.ts) |
| DELETE | `/api/v1/me/profile-image` | M,C,A | [handler](../../apps/web/app/api/v1/me/profile-image/route.ts) |
| GET | `/api/v1/me/summary` | member | [handler](../../apps/web/app/api/v1/me/summary/route.ts) |
| GET | `/api/v1/profile-images/[userId]` | sesión activa; reglas de imagen/me en handler | [handler](../../apps/web/app/api/v1/profile-images/[userId]/route.ts) |
| GET | `/api/v1/trainings/[id]` | member, coach, admin | [handler](../../apps/web/app/api/v1/trainings/[id]/route.ts) |
| GET | `/api/v1/trainings` | member, coach, admin | [handler](../../apps/web/app/api/v1/trainings/route.ts) |

## Lecturas de servidor y pantallas

Todas estas páginas leen servicios directamente aunque exista un GET equivalente. Portarlas implica sustituir cada lectura por API y Query. Los imports de formato/URL no son consultas. Layouts añaden sesión, foto y cookie del menú; `/` y `/login` deciden destino por sesión.

| Pantalla/entrada | Servicios importados directamente |
|---|---|
| [(member)/biblioteca/[id]/page.tsx](<../../apps/web/app/(member)/biblioteca/[id]/page.tsx>) | `{ requireMember }` de `@/lib/auth/current`; `{ getTraining }` de `@/lib/box/trainings`; `{ BoxError }` de `@/lib/box/errors` |
| [(member)/biblioteca/page.tsx](<../../apps/web/app/(member)/biblioteca/page.tsx>) | `{ resolveFilter }` de `@/lib/box/filter-url`; `{ pageNumber }` de `@/lib/box/pagination`; `{ requireMember }` de `@/lib/auth/current`; `{ listTrainingFilterTypes, listTrainingsPage }` de `@/lib/box/trainings`; `{ TRAINING_SORTS, selectedSort, listOptionsHref }` de `@/lib/box/list-sorting` |
| [(member)/calendario/page.tsx](<../../apps/web/app/(member)/calendario/page.tsx>) | `{ resolveFilter }` de `@/lib/box/filter-url`; `{ requireMember }` de `@/lib/auth/current`; `{ listCalendar }` de `@/lib/box/calendar`; `{ listBoxes, orderBoxes, pickBox }` de `@/lib/box/boxes`; `{ calendarAxisRange, getBoxHours }` de `@/lib/box/hours`; `{ memberWeek }` de `@/lib/box/week` |
| [(member)/clases/[id]/page.tsx](<../../apps/web/app/(member)/clases/[id]/page.tsx>) | `{ requireMember }` de `@/lib/auth/current`; `{ getInstanceDetail }` de `@/lib/box/calendar`; `{ BoxError }` de `@/lib/box/errors`; `{ formatDay, formatTime, freeSpotLabel, kindLabel }` de `@/lib/box/format` |
| [(member)/cuenta/page.tsx](<../../apps/web/app/(member)/cuenta/page.tsx>) | `{ requireMember }` de `@/lib/auth/current`; `{ listBoxes }` de `@/lib/box/boxes`; `{ emptyField, displayPhone }` de `@/lib/box/format`; `{ getOwnProfile }` de `@/lib/box/summary` |
| [(member)/historial/page.tsx](<../../apps/web/app/(member)/historial/page.tsx>) | `{ requireMember }` de `@/lib/auth/current`; `{ listBookingHistoryPage, type HistoryBookingView }` de `@/lib/box/bookings`; `{ formatDay, formatMonth, formatTime, kindLabel }` de `@/lib/box/format`; `{ groupHistoryByMonth }` de `@/lib/box/history`; `{ pageNumber }` de `@/lib/box/pagination` |
| [(member)/layout.tsx](<../../apps/web/app/(member)/layout.tsx>) | `{ requireMember }` de `@/lib/auth/current`; `{ getProfileImageUrlForUser }` de `@/lib/box/profile-images` |
| [(member)/reservas/page.tsx](<../../apps/web/app/(member)/reservas/page.tsx>) | `{ pageNumber }` de `@/lib/box/pagination`; `{ requireMember }` de `@/lib/auth/current`; `{ listUpcomingBookingsPage }` de `@/lib/box/bookings`; `{ formatDay, formatTime, kindLabel }` de `@/lib/box/format` |
| [(member)/tarifa/page.tsx](<../../apps/web/app/(member)/tarifa/page.tsx>) | `{ requireMember }` de `@/lib/auth/current`; `{ formatPrice }` de `@/lib/box/format`; `{ getMemberSummary }` de `@/lib/box/summary` |
| [dev/component-composition/page.tsx](<../../apps/web/app/dev/component-composition/page.tsx>) | `{ pageNumber }` de `@/lib/box/pagination` |
| [layout.tsx](<../../apps/web/app/layout.tsx>) | `{ getCurrentUser }` de `@/lib/auth/current` |
| [login/page.tsx](<../../apps/web/app/login/page.tsx>) | `{ getCurrentUser }` de `@/lib/auth/current` |
| [page.tsx](<../../apps/web/app/page.tsx>) | `{ getCurrentUser }` de `@/lib/auth/current` |
| [staff/biblioteca/[id]/editar/page.tsx](<../../apps/web/app/staff/biblioteca/[id]/editar/page.tsx>) | `{ requireStaff }` de `@/lib/auth/current`; `{ listClassTypes }` de `@/lib/box/class-types`; `{ getTraining }` de `@/lib/box/trainings`; `{ BoxError }` de `@/lib/box/errors` |
| [staff/biblioteca/[id]/page.tsx](<../../apps/web/app/staff/biblioteca/[id]/page.tsx>) | `{ requireStaff }` de `@/lib/auth/current`; `{ getTraining }` de `@/lib/box/trainings`; `{ BoxError }` de `@/lib/box/errors` |
| [staff/biblioteca/nuevo/page.tsx](<../../apps/web/app/staff/biblioteca/nuevo/page.tsx>) | `{ requireStaff }` de `@/lib/auth/current`; `{ listClassTypes }` de `@/lib/box/class-types` |
| [staff/biblioteca/page.tsx](<../../apps/web/app/staff/biblioteca/page.tsx>) | `{ resolveFilter }` de `@/lib/box/filter-url`; `{ pageNumber }` de `@/lib/box/pagination`; `{ requireStaff }` de `@/lib/auth/current`; `{ listStaffTrainingsPage, listTrainingFilterTypes }` de `@/lib/box/trainings`; `{ TRAINING_SORTS, selectedSort, listOptionsHref }` de `@/lib/box/list-sorting` |
| [staff/boxes/page.tsx](<../../apps/web/app/staff/boxes/page.tsx>) | `{ requireAdmin }` de `@/lib/auth/current`; `{ listBoxes }` de `@/lib/box/boxes` |
| [staff/clases/[id]/page.tsx](<../../apps/web/app/staff/clases/[id]/page.tsx>) | `{ requireStaff }` de `@/lib/auth/current`; `{ getStaffInstance }` de `@/lib/box/staff-calendar`; `{ listMembers }` de `@/lib/box/members`; `{ parseStaffClassOrigin, staffClassOriginBack }` de `@/lib/box/staff-nav`; `{ listClassTypes }` de `@/lib/box/class-types`; `{ listTrainings }` de `@/lib/box/trainings`; `{ listCoaches }` de `@/lib/box/staff-users`; `{ BoxError }` de `@/lib/box/errors`; `{ formatDay, formatTime, freeSpotLabel, kindLabel }` de `@/lib/box/format` |
| [staff/cobros/page.tsx](<../../apps/web/app/staff/cobros/page.tsx>) | `{ PAYMENT_SORTS, selectedSort, listOptionsHref }` de `@/lib/box/list-sorting`; `{ resolveFilter }` de `@/lib/box/filter-url`; `{ pageNumber }` de `@/lib/box/pagination`; `{ requireStaff }` de `@/lib/auth/current`; `{ listRegisteredPaymentsPage }` de `@/lib/box/registered-payments`; `{ listBoxes }` de `@/lib/box/boxes`; `{ formatPrice }` de `@/lib/box/format` |
| [staff/equipo/[id]/page.tsx](<../../apps/web/app/staff/equipo/[id]/page.tsx>) | `{ requireAdmin }` de `@/lib/auth/current`; `{ getStaff }` de `@/lib/box/staff-users`; `{ BoxError }` de `@/lib/box/errors` |
| [staff/equipo/page.tsx](<../../apps/web/app/staff/equipo/page.tsx>) | `{ TEAM_SORTS, selectedSort, listOptionsHref }` de `@/lib/box/list-sorting`; `{ requireAdmin }` de `@/lib/auth/current`; `{ listStaff }` de `@/lib/box/staff-users` |
| [staff/excepciones/page.tsx](<../../apps/web/app/staff/excepciones/page.tsx>) | `{ pageNumber }` de `@/lib/box/pagination`; `{ requireStaff }` de `@/lib/auth/current`; `{ listExceptionsPage }` de `@/lib/box/exceptions`; `{ listBoxes }` de `@/lib/box/boxes`; `{ listClassTypes }` de `@/lib/box/class-types`; `{ listCoaches }` de `@/lib/box/staff-users` |
| [staff/horario/page.tsx](<../../apps/web/app/staff/horario/page.tsx>) | `{ resolveFilter }` de `@/lib/box/filter-url`; `{ requireAdmin }` de `@/lib/auth/current`; `{ listBoxes, orderBoxes, pickBox }` de `@/lib/box/boxes`; `{ getBoxHours }` de `@/lib/box/hours` |
| [staff/hoy/page.tsx](<../../apps/web/app/staff/hoy/page.tsx>) | `{ resolveFilter }` de `@/lib/box/filter-url`; `{ requireStaff }` de `@/lib/auth/current`; `{ listDay }` de `@/lib/box/staff-calendar`; `{ groupDayByKind, kindViewFromParam, viewKind }` de `@/lib/box/day-groups`; `{ listBoxes, orderBoxes, pickBox }` de `@/lib/box/boxes`; `{ formatDay, formatTime, kindGroupLabel }` de `@/lib/box/format` |
| [staff/impagos/page.tsx](<../../apps/web/app/staff/impagos/page.tsx>) | `{ PERSON_SORTS, selectedSort, listOptionsHref }` de `@/lib/box/list-sorting`; `{ resolveFilter }` de `@/lib/box/filter-url`; `{ pageNumber }` de `@/lib/box/pagination`; `{ requireStaff }` de `@/lib/auth/current`; `{ listUnpaidPage }` de `@/lib/box/unpaid`; `{ listBoxes }` de `@/lib/box/boxes` |
| [staff/layout.tsx](<../../apps/web/app/staff/layout.tsx>) | `{ requireStaff }` de `@/lib/auth/current`; `{ getProfileImageUrlForUser }` de `@/lib/box/profile-images` |
| [staff/perfil/page.tsx](<../../apps/web/app/staff/perfil/page.tsx>) | `{ requireStaff }` de `@/lib/auth/current`; `{ listBoxes }` de `@/lib/box/boxes`; `{ emptyField, displayPhone }` de `@/lib/box/format`; `{ getProfileImageUrlForUser }` de `@/lib/box/profile-images` |
| [staff/plantilla/page.tsx](<../../apps/web/app/staff/plantilla/page.tsx>) | `{ resolveFilter }` de `@/lib/box/filter-url`; `{ requireStaff }` de `@/lib/auth/current`; `{ kindViewFromParam }` de `@/lib/box/day-groups`; `{ listClassTypes }` de `@/lib/box/class-types`; `{ listTemplates }` de `@/lib/box/templates`; `{ calendarHref }` de `@/lib/box/calendar-navigation`; `{ listBoxes, orderBoxes, pickBox }` de `@/lib/box/boxes`; `{ listCoaches }` de `@/lib/box/staff-users`; `{ calendarAxisRange, getBoxHours }` de `@/lib/box/hours` |
| [staff/semana/page.tsx](<../../apps/web/app/staff/semana/page.tsx>) | `{ resolveFilter }` de `@/lib/box/filter-url`; `{ requireStaff }` de `@/lib/auth/current`; `{ listWeek }` de `@/lib/box/staff-calendar`; `{ listBoxes, orderBoxes, pickBox }` de `@/lib/box/boxes`; `{ calendarAxisRange, getBoxHours }` de `@/lib/box/hours`; `{ memberWeek }` de `@/lib/box/week` |
| [staff/socios/[id]/page.tsx](<../../apps/web/app/staff/socios/[id]/page.tsx>) | `{ requireStaff }` de `@/lib/auth/current`; `{ getMember }` de `@/lib/box/members`; `{ listBoxes }` de `@/lib/box/boxes`; `{ listTariffs }` de `@/lib/box/tariffs`; `{ BoxError }` de `@/lib/box/errors`; `{ memberFullName }` de `@/lib/box/format`; `{ getMemberSummary }` de `@/lib/box/summary` |
| [staff/socios/[id]/pagos/page.tsx](<../../apps/web/app/staff/socios/[id]/pagos/page.tsx>) | `{ pageNumber }` de `@/lib/box/pagination`; `{ requireStaff }` de `@/lib/auth/current`; `{ listMemberPayments }` de `@/lib/box/payments`; `{ BoxError }` de `@/lib/box/errors`; `{ memberFullName }` de `@/lib/box/format` |
| [staff/socios/page.tsx](<../../apps/web/app/staff/socios/page.tsx>) | `{ pageNumber }` de `@/lib/box/pagination`; `{ requireStaff }` de `@/lib/auth/current`; `{ listMembersPage }` de `@/lib/box/members`; `{ listBoxes }` de `@/lib/box/boxes`; `{ listTariffs }` de `@/lib/box/tariffs`; `{ PERSON_SORTS, selectedSort, listOptionsHref }` de `@/lib/box/list-sorting` |
| [staff/tarifas/page.tsx](<../../apps/web/app/staff/tarifas/page.tsx>) | `{ requireAdmin }` de `@/lib/auth/current`; `{ listTariffs }` de `@/lib/box/tariffs` |
| [staff/tipos/page.tsx](<../../apps/web/app/staff/tipos/page.tsx>) | `{ requireAdmin }` de `@/lib/auth/current`; `{ listClassTypes }` de `@/lib/box/class-types` |

## Huecos HTTP que R4 debe cubrir

- `getOwnProfile`, foto y preferencias del shell: componer un GET `/me/profile` con DTO según rol; `/auth/me` actual no contiene el perfil completo.
- `listBoxes` es solo staff hoy: GET `/boxes` autenticado para socio y staff; horarios públicos a cuentas mediante GET `/boxes/{id}/hours`.
- `getMemberSummary(id)` staff: GET `/admin/members/{id}/summary`; no reutilizar `/me/summary` con un ID ajeno.
- `listMemberPayments` y `listRegisteredPaymentsPage`: GET `/admin/members/{id}/payments` y `/admin/payments` con paginación/orden/sede.
- `listTrainingFilterTypes`: GET `/trainings/filter-types` con opciones completas para ambas bibliotecas.
- Selectores de socios activos, tipos dirigidos, coaches y entrenamientos vinculables necesitan opciones completas explícitas. GET paginado de tablas no sustituye estas lecturas.
- `listStaff` actual GET ignora filtros/orden de la pantalla RSC: ampliar contrato. Calendarios/plantilla incluyen sedes, horarios y ejes; preservar sus consultas auxiliares.

## Escenarios de comparación y fixtures

Fixtures existentes: `apps/web/prisma/seed.ts`, factorías de `lib/box/*.int.test.ts`, `lib/auth/*.int.test.ts`, y datasets de `app/dev`/componentes de demostración. Son referencia, no una prueba de aceptación aprobada. No sembrar ni resetear una base remota para compararlos. R3 creará equivalentes deterministas en DB local aislada.

| Área / roles | Dataset de comparación | Aceptación R4–R6 |
|---|---|---|
| Acceso / M,C,A | Una persona con DNI socio y usuario staff, mismo email; contraseñas distintas; cuenta inactiva y bloqueada | Cada acceso conserva rol; email no autentica; reset revoca solo cuenta elegida; sin mensajes |
| Perfil / M,C,A | Foto propia/ajena, sin foto, temas y dos sedes | Autorización de imágenes; tema y sede persisten; selector no cambia preferencia |
| Calendario y reservas / M,C,A | Dos sedes, dirigida/open, última plaza/cupo/bono, solape entre sedes | 4 semanas Madrid; no sobreaforo ni doble consumo; cancelación a 2h; staff decide devolución |
| Hoy/Semana/Excepciones / C,A | Extra, modificada, cancelada; cambio tipo/aforo y recuperación | Origen de navegación; confirmar impacto; devolver consumo; recuperar sin recuperar reservas |
| Plantilla / A (C lectura) | Dos sedes, borrador, duplicado, publicación y reservas futuras | Solo sede elegida y desde lunes siguiente; aplicar/cancelar sin perder semántica |
| Sedes/horario/tipos/tarifas / A | Sin imágenes, ilimitado/cero, cierre incompatible, copiar días | Unicidad/slugs estables; bloquear conflictos; imagen opcional; importes en céntimos |
| Socios / C,A; baja / A | Alta, ficha, tarifa, bono, ajuste, pago, baja/reactivación | Cambio tarifa cancela futuras; pago informativo; permisos; box pago distinto preferencia |
| Equipo / A; propio / C,A | Coach y admin activos/baja, contacto vacío, misma persona socio | Sin permisos acumulados ni contraseñas visibles; filtros y orden |
| Cobros/impagos / C,A | Pagado/impagado, sin cobro, ciclos, dos sedes, >25 filas | Editar/borrar pago; histórico sede conservado; orden antes de paginar |
| Biblioteca / M,C,A; edición / C,A | >25, nombre vacío/duplicado, sin fases, vinculada, open | Fecha Madrid y nombre único; fases/bloques ordenados; confirmar desvincular; filtros completos |
| Operación / sistema | Materialización repetida/concurrente y reinicio | Idempotencia, unicidad parcial, rollback, sin doble planificador |
| UI / todos | Vacío, nombres largos, tema claro/oscuro, móvil y teclado | Marca y tokens existentes; errores distintos de vacíos; foco y valores conservados |

## Comprobaciones ejecutadas

| Comando | Resultado |
|---|---|
| `pnpm test` | FALLA. Dominio: 9 archivos, 81 tests pasan. Web: 11 archivos fallan, 35 pasan; 25 tests fallan, 142 pasan, 2 omitidos. |
| `pnpm typecheck` | PASA en dominio y web. |
| `pnpm --filter web lint` | FALLA: 21 errores y 1 warning. |
| `pnpm build` | INTERRUMPIDO por SIGTERM durante compilación; no acredita build ni comprobación CSS. |

Tests cargaron variables desde `.env`; las integraciones se ejecutaron, no se omitieron globalmente por falta de variables. Dos tests de fotos quedaron omitidos tras fallo del beforeAll. Hay timeouts (incluido argon2), fallos de hooks, RESTRICT de reservas al limpiar instancias y unicidad de membresía. La causa de los timeouts no está aislada; ejecutar checks simultáneamente puede añadir contención. No concluir que todo es un fallo de entorno ni que la concurrencia funciona. Lint afecta preferencia/foto, borradores de plantilla, controles, sidebar y new-training-visit; warning en class-roster-panel. Evidencia completa adjunta, sin valores de entorno.

No ejecutados: smoke autenticado/visual por rol, dispositivo Expo (no existe), integración Better Auth con Drizzle/Postgres, mediciones de latencia p50/p95 y red. Build interrumpido impide referencia fiable de bytes. Presupuesto de R6: ninguna regresión frente a medición reproducible del mismo commit/dataset/entorno; captura obligatoria antes del corte, nunca inventar números. Login no descarga editores; cero N+1/historial completo y caché aislada por cuenta son criterios estructurales desde ahora.
