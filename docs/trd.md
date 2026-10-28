# TRD — gestión de un box de CrossFit

Arquitectura, tecnologías, estructura del proyecto y cómo funciona la app por dentro.

Las decisiones técnicas salieron de la misma sesión de grilling que el producto (27/10/2026). El
registro original está en
[`grilling-results/convenciones-tecnicas.md`](./grilling-results/convenciones-tecnicas.md) y no se edita.
Este documento es la versión vigente: si algo no coincide, manda este.

Qué debe hacer el sistema está en [`prd.md`](./prd.md).

---

## 1. Stack

| Capa | Elección |
|---|---|
| Lenguaje | TypeScript de punta a punta |
| Web (y API) | Next.js, App Router, desplegado en Vercel |
| API | Route handlers del propio Next.js (una sola URL para web y app, sin CORS) |
| App móvil | Expo (React Native) + Expo Router; Android primero, iOS después; builds con EAS |
| Base de datos | PostgreSQL (Neon) + Prisma |
| Auth | DNI/usuario + contraseña (argon2) + JWT |
| Monorepo | pnpm workspaces |

Sin Docker, sin microservicios, sin GraphQL, sin Kubernetes. Un despliegue, una base.

## 2. Estructura del repo

```
apps/web        Next.js — interfaz del staff, del socio en web, y la API
apps/mobile     Expo — app de socios
packages/domain tipos, esquemas zod, reglas puras de cupo y cliente de API
```

`packages/domain` no importa nada de Next.js ni de React Native: es TypeScript puro y testeable.
La web y la app consumen el mismo cliente de API y las mismas validaciones.

## 3. Modelo de datos

### `user`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `login_id` | text, único | DNI para socios; usuario elegido por el admin para staff |
| `password_hash` | text | argon2id |
| `role` | enum | `member` \| `coach` \| `admin` |
| `status` | enum | `active` \| `inactive` |
| `first_name`, `last_name` | text | |
| `dni` | text, nullable | se repite entre las dos cuentas de un coach que entrena |
| `phone`, `email` | text, nullable | opcionales |
| `failed_logins`, `locked_until` | int, timestamptz | límite de intentos |
| `token_version` | int, default 0 | se incrementa al resetear contraseña o desactivar; invalida JWTs previos |
| `created_at`, `updated_at` | timestamptz | |

Un coach que entrena tiene **dos filas** con el mismo `dni` y distinto `login_id`; por eso el
identificador de login es `login_id` y no el DNI.

### `tariff`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `name` | text | |
| `kind` | enum | `monthly` \| `pack` |
| `price_cents` | int | |
| `weekly_directed` | int | solo `monthly` |
| `weekly_open` | int | solo `monthly` |
| `pack_classes` | int, nullable | tamaño por defecto del bono, solo `pack` |
| `active` | bool | las inactivas no se asignan pero se conservan |
| `created_at` | timestamptz | |

La "tarifa de prueba" es una fila más con `price_cents = 0`.

### `membership`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | FK `user` |
| `tariff_id` | uuid | FK `tariff` |
| `started_at` | timestamptz | |
| `ended_at` | timestamptz, nullable | `null` = vigente |
| `ended_reason` | text, nullable | `change` \| `cancelled` |

Invariante: **como máximo una membresía con `ended_at IS NULL` por `user_id`**
(índice único parcial). Cambiar de tarifa cierra la vigente y crea otra; el historial se conserva.

### `credit_grant`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | FK `user` |
| `quantity` | int | siempre positivo |
| `payment_id` | uuid, nullable | FK `payment` |
| `note` | text, nullable | |
| `created_by` | uuid | FK `user` (staff) |
| `created_at` | timestamptz | |

El saldo de bono **no se guarda como contador**. Se calcula:

```
pack_balance = sum(credit_grant.quantity) - reservas que consumieron bono y cuentan
```

Sin contadores mutables no hay deriva, y cancelar una reserva devuelve el saldo solo.

### `payment`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | |
| `kind` | enum | `monthly` \| `pack` |
| `month` | date, nullable | primer día del mes cubierto; solo `monthly` |
| `amount_cents` | int | |
| `method` | text, nullable | `cash` \| `bizum` \| `transfer` \| `card` \| otro |
| `recorded_by` | uuid | FK `user` (staff) |
| `created_at` | timestamptz | |

Invariante: único `(user_id, month)` cuando `kind = 'monthly'`.
"Impago del mes" = socio con membresía `monthly` vigente sin fila de pago para el mes en curso.

### `class_template`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `weekday` | int | 1 = lunes … 7 = domingo |
| `start_time`, `end_time` | time | hora local `Europe/Madrid` |
| `title` | text | ej. "WOD", "Open" |
| `kind` | enum | `directed` \| `open` |
| `coach_id` | uuid, nullable | FK `user` (informativo, solo se muestra) |
| `default_capacity` | int | |
| `active` | bool | |

### `class_instance`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `template_id` | uuid, nullable | FK `class_template` |
| `date` | date | fecha local |
| `start_at`, `end_at` | timestamptz | |
| `title`, `kind` | | copiados de la plantilla |
| `coach_id` | uuid, nullable | |
| `capacity` | int | |
| `status` | enum | `scheduled` \| `cancelled` |
| `edited_at` | timestamptz, nullable | si no es `null`, la regeneración no la toca |
| `cancel_reason` | text, nullable | |

Invariante: único `(template_id, date)`.

### `booking`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `instance_id` | uuid | FK `class_instance` |
| `user_id` | uuid | FK `user` (siempre rol `member`) |
| `pool` | enum | `weekly_directed` \| `weekly_open` \| `pack` |
| `status` | enum | `active` \| `cancelled` |
| `created_by` | uuid | el propio socio o un staff |
| `created_at` | timestamptz | |
| `cancelled_at`, `cancelled_by` | nullable | |
| `quota_returned` | bool, nullable | decisión del staff al cancelar; `null` mientras está activa |

Invariantes:

- Índice único parcial `(instance_id, user_id)` donde `status = 'active'`: nadie reserva dos veces la misma clase.
- **Una reserva que cuenta** es: `status = 'active'` **o** (`status = 'cancelled'` y `quota_returned = false`).
  El staff que cancela sin devolver el cupo deja la reserva contando.
- `pool` se fija al crear la reserva y no se recalcula después. Si el socio cancela con devolución,
  el cupo o el saldo vuelven a su pool original; si no, quedan consumidos.

### `class_exception`

No hace falta una tabla: una excepción es una edición sobre la fila de `class_instance`
(`status = 'cancelled'`, `start_at`/`end_at`/`coach_id`/`capacity` distintos) con `edited_at` marcado.

## 4. Reglas de dominio

### 4.1 Materialización y cambios de plantilla

- Horizonte: **hoy → hoy + 28 días** (4 semanas), en `Europe/Madrid`.
- Un **cron diario** de Vercel (`/api/v1/cron/materialize`) genera las instancias que falten
  desde las plantillas activas. Idempotente gracias a `(template_id, date)`.
- Además, la lectura del calendario llama a la misma función `ensureInstances(from, to)` antes de
  responder: si el cron falla, la app no se rompe.
- **Crear** una plantilla genera sus instancias desde hoy (permite arrancar el box a mitad de semana).
- **Editar o borrar** una plantilla rige **desde el lunes siguiente**. Las instancias de la semana en
  curso no se tocan ni se regeneran con los valores nuevos.
- Las instancias con `edited_at` no nulo (excepción) **nunca** se sobrescriben.

**Propagación de un cambio de plantilla** (editar o borrar):

```
nextMonday = lunes siguiente a hoy (Europe/Madrid)
affected   = instancias de la plantilla con date >= nextMonday y edited_at is null

for each inst in affected:
    new = valores nuevos de la plantilla (o "eliminada")

    if inst fue eliminada:
        successor = instancia con misma date, start_at, end_at, kind y title,
                    status = 'scheduled', id != inst.id
        if successor and successor.capacity >= activeBookings(successor) + activeBookings(inst):
            moveBookings(inst, successor)        # cada reserva conserva su pool
        else:
            cancelBookings(inst, quota_returned = true)
        inst.status = 'cancelled'

    else if cambió date, start_at, end_at, kind o title:
        successor = (mismo criterio, buscando el hueco nuevo)
        if successor and hay aforo:
            moveBookings(inst, successor)
        else:
            cancelBookings(inst, quota_returned = true)
        aplicar(inst, new)                       # hora, título, tipo, coach, aforo

    else if new.capacity < activeBookings(inst):
        cancelBookings(inst, quota_returned = true)
        inst.capacity = new.capacity

    else:
        inst.coach_id = new.coach_id
        inst.capacity = new.capacity             # solo sube o se mantiene
```

- **"Idéntica"** = misma `date`, `start_at`, `end_at`, `kind` y `title`. `coach_id` y `capacity`
  no forman parte de la identidad: cambiar el coach o subir el aforo no toca reservas.
- Toda reserva cancelada por estas reglas se cancela con `quota_returned = true`.
- La respuesta del endpoint incluye un resumen para el staff: clases canceladas, reservas canceladas
  y reservas mudadas, para que pueda avisar por WhatsApp.
- Si el cambio deja un aforo menor que las reservas y no hay sucesor con lugar, se cancelan **todas**
  las reservas de esa clase. No se elige a quién echar.

### 4.2 Cálculo de cupo

Semana natural de la instancia, en `Europe/Madrid`:

```
weekStart(d) = lunes 00:00 de la semana de d
weekEnd(d)   = domingo 23:59:59.999 de la semana de d
```

Consumo de la semana `W` para un socio:

```
used(W, kind) = count(bookings b
                      join class_instance i on i.id = b.instance_id
                      where b.user_id = :u
                        and b.pool = (kind == 'directed' ? 'weekly_directed' : 'weekly_open')
                        and i.date between weekStart(W) and weekEnd(W)
                        and (b.status = 'active' or b.quota_returned = false))
```

Saldo de bono:

```
pack_balance(u) = sum(credit_grant.quantity)
                - count(bookings b where b.user_id = :u and b.pool = 'pack'
                        and (b.status = 'active' or b.quota_returned = false))
```

### 4.3 Asignación de pool al reservar

```
reservar(u, instance):
  require instance.status == 'scheduled'
  require instance.start_at > now()
  require instance.kind in ('directed', 'open')
  require membership(u) vigente, sino 409 NO_MEMBERSHIP
  require no solape con otra reserva activa de u, sino 409 OVERLAP
  require plazas libres (ver 4.4), sino 409 FULL

  if membership.kind == 'monthly':
      limit = kind == 'directed' ? tariff.weekly_directed : tariff.weekly_open
      if used(week(instance), kind) < limit:
          pool = kind == 'directed' ? 'weekly_directed' : 'weekly_open'
      else if pack_balance(u) > 0:
          pool = 'pack'
      else:
          409 QUOTA_EXHAUSTED
  else:  # tarifa pack
      require pack_balance(u) > 0, sino 409 QUOTA_EXHAUSTED
      pool = 'pack'
```

### 4.4 Concurrencia

- Reservar corre en una transacción con `SELECT … FOR UPDATE` sobre la fila de `class_instance`,
  y cuenta las reservas activas de esa instancia dentro de la transacción. Sin eso, dos socios
  pueden quedarse con la última plaza.
- El índice único parcial `(instance_id, user_id) WHERE status = 'active'` evita el doble clic.
- El cupo semanal no necesita bloqueo de fila: dos reservas simultáneas del mismo socio en la misma
  semana pueden pasarse del límite por uno. Se acepta (riesgo real nulo) y se documenta.

### 4.5 Cancelación

```
cancelar(booking, actor):
  if actor es el socio:
      require now() <= instance.start_at - 2h, sino 403 CANCELLATION_CLOSED
      quota_returned = true
  if actor es staff:
      quota_returned = parámetro (true por defecto)
  booking.status = 'cancelled'
  booking.quota_returned = quota_returned
```

- Cancelar una instancia (`status = 'cancelled'`) cancela en cascada todas sus reservas con
  `quota_returned = true`.
- Dar de baja a un socio cancela sus reservas futuras con `quota_returned = true`.

### 4.6 Validaciones de horario

- Al crear o editar una plantilla: rechazar si se solapa en el tiempo con otra plantilla activa
  del mismo `weekday` (dirigidas y opens comparten el espacio del box).
- Al editar una instancia: misma validación contra las instancias del mismo día.
- Una instancia **no puede moverse a otro día**: la UI solo permite cambiar la hora dentro del
  mismo `date`. Mover de día es cancelar y crear una instancia nueva.
- `capacity` puede bajarse por debajo de las reservas activas: en ese caso se cancelan **todas** las
  reservas de esa instancia (con `quota_returned = true`) antes de aplicar el aforo nuevo. La UI exige
  confirmación explícita y muestra cuántas reservas se van a cancelar.
- `end_at` > `start_at`.

## 5. API

Todos los endpoints devuelven JSON y usan los esquemas zod de `packages/domain`.
Errores con `{ error: { code, message } }` y códigos estables (`FULL`, `QUOTA_EXHAUSTED`,
`OVERLAP`, `CANCELLATION_CLOSED`, `NO_MEMBERSHIP`, `FORBIDDEN`).

**Público / sesión**

| Método | Ruta | Quién |
|---|---|---|
| POST | `/api/v1/auth/login` | todos |
| POST | `/api/v1/auth/logout` | todos |
| GET | `/api/v1/auth/me` | todos |

**Socio**

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/v1/calendar?from&to` | instancias con plazas libres y si el socio está apuntado |
| GET | `/api/v1/instances/:id` | detalle + roster (`Nombre I.`) |
| POST | `/api/v1/bookings` | reservar `{ instanceId }` |
| DELETE | `/api/v1/bookings/:id` | cancelar (regla de 2 h) |
| GET | `/api/v1/me/bookings` | próximas reservas |
| GET | `/api/v1/me/summary` | tarifa, cupos usados/límite, saldo de bono, estado del mes |

**Staff**

| Método | Ruta | Qué hace | Quién |
|---|---|---|---|
| GET | `/api/v1/admin/day?date` | clases del día con roster | coach, admin |
| GET | `/api/v1/admin/week?from` | ocupación `usadas/capacidad` | coach, admin |
| GET | `/api/v1/admin/templates` | ver plantilla semanal | coach, admin |
| POST/PATCH/DELETE | `/api/v1/admin/templates` | editar plantilla semanal; devuelve resumen de reservas canceladas y mudadas | admin |
| PATCH | `/api/v1/admin/instances/:id` | excepción: cancelar, mover, cambiar aforo/coach | coach, admin |
| GET/POST/PATCH | `/api/v1/admin/members` | alta, edición y listado de socios | coach, admin |
| GET | `/api/v1/admin/members/:id` | ficha: membresía, pagos, créditos, reservas | coach, admin |
| POST | `/api/v1/admin/members/:id/tariff` | cambiar tarifa | coach, admin |
| POST | `/api/v1/admin/members/:id/credits` | cargar saldo de bono | coach, admin |
| POST | `/api/v1/admin/members/:id/reset-password` | resetear clave | coach, admin |
| POST | `/api/v1/admin/members/:id/deactivate` | dar de baja | admin |
| GET | `/api/v1/admin/tariffs` | ver catálogo | coach, admin |
| POST/PATCH | `/api/v1/admin/tariffs` | crear y editar tarifas | admin |
| POST/PATCH | `/api/v1/admin/staff` | crear y desactivar cuentas de staff | admin |
| GET | `/api/v1/admin/unpaid?month` | impagos del mes | coach, admin |
| POST | `/api/v1/admin/payments` | registrar pago | coach, admin |
| POST | `/api/v1/admin/bookings` | reservar a nombre de un socio | coach, admin |
| DELETE | `/api/v1/admin/bookings/:id?returnQuota=` | cancelar a nombre de un socio | coach, admin |
| POST | `/api/v1/cron/materialize` | cron diario (protegido por secreto) | sistema |

## 6. Auth y sesión

- `argon2id` para las contraseñas. Nunca se devuelven ni se registran.
- Login por `login_id` (DNI del socio, usuario del staff) + contraseña.
- JWT firmado, `exp` 90 días, claims mínimos: `sub`, `role`, `tv`.
- `tv` (token version) se compara con `user.token_version` en cada request autenticado; si no coincide, 401.
  Se incrementa al resetear la contraseña de un socio y al desactivar un usuario. El `logout` solo borra el token en el cliente.
- **Web**: cookie `httpOnly`, `Secure`, `SameSite=Lax`.
- **App**: el token se guarda en `expo-secure-store` y se envía como `Authorization: Bearer`.
- Límite de intentos: 10 fallos por `login_id` en 15 minutos → `locked_until`; se libera con reset del staff.
- El staff puede resetear la contraseña de un socio; el socio no puede cambiarla.
- Sin emails: no hay "olvidé mi contraseña" automático.

## 7. Web y app

- **Web** (`apps/web`): panel del staff (escritorio primero, responsive) y las mismas pantallas del
  socio para quien entre desde el navegador. Server Components para lectura, route handlers para mutaciones.
- **App** (`apps/mobile`): solo socios. Expo Router con cuatro pestañas: Calendario, Mis reservas,
  Mi tarifa, Cuenta. Consume la misma API con `packages/domain`.
- Sin estado offline, sin push, sin cámara.

## 8. Tiempo

- Toda hora se guarda en `timestamptz` (UTC).
- Los cálculos de semana, día y "2 horas antes" se hacen en `Europe/Madrid`.
- `date` de la instancia es la fecha local del box.
- Formato de moneda: EUR, `es-ES`.

## 9. Tests

- **Dominio** (`packages/domain`): obligatorio cubrir
  - consumo de cupo semanal contra la semana de la clase,
  - desborde a bono y saldo resultante,
  - cancelación con y sin devolución,
  - cancelación de instancia que devuelve todo,
  - solapamiento de reservas y de horarios,
  - generación idempotente de instancias.
- **API**: integración contra Postgres real (Neon branch o local), sin mocks de base.
- **UI**: sin suite E2E en v1; smoke manual por flujo antes de cada release.
- Un test que no puede fallar cuando la regla se rompe no cuenta como test.

## 10. Despliegue y operación

| Pieza | Dónde |
|---|---|
| Web + API | Vercel (plan gratuito alcanza) |
| Base de datos | Neon, Postgres; respaldos diarios incluidos |
| App | EAS Build; Android en Play Store primero, iOS después |
| Cron | Vercel Cron diario → `/api/v1/cron/materialize` |

- Entornos: `local` y `production`. Sin staging en v1.
- Secretos solo en variables de entorno de Vercel; nunca en el repo.
- Migraciones con Prisma (`prisma migrate deploy`) en el deploy.
- Dominio propio (~10–15 €/año); Apple Developer 99 €/año solo cuando se publique iOS.

## 11. Privacidad y RGPD

- Datos guardados: nombre, apellidos, DNI, teléfono y email opcionales, reservas y pagos. Nada más.
- El roster expone a otros socios **nombre + inicial del apellido**, nunca DNI ni contacto.
- Página de privacidad en la web con finalidad, base legal, conservación y derechos.
- Sin analítica, sin cookies de terceros, sin trackers.
- Baja = `status = inactive` (se conserva el historial). Borrado definitivo solo a pedido explícito
  del socio, ejecutado por el admin, con cascada sobre sus reservas, pagos y créditos.

## 12. Convenciones de código

- Identificadores, tablas y rutas en **ingles**; textos de interfaz y documentación en **español**.
- Lógica de negocio en `packages/domain`, no en componentes ni en route handlers.
- Validación de entrada con zod en el borde de la API; tipos derivados de los esquemas.
- Nombres de error estables y en mayúsculas (`QUOTA_EXHAUSTED`), nunca mensajes como contrato.
- Sin `any`. Sin abstracciones para casos que no existen.
- Commits convencionales; nunca commit ni push sin pedido explícito.

## 13. Fuera de alcance técnico (v1)

Pasarela de pago, emails transaccionales, push, websockets, cache distribuida, Redis, búsqueda,
multi-tenant, i18n, exportaciones, panel de métricas, app de staff, offline, Docker.
