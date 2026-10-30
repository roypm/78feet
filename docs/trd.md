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
| App móvil | Expo (React Native) + Expo Router, prevista; Android primero, iOS después; builds con EAS |
| Base de datos | PostgreSQL (Neon) + Prisma |
| Auth | DNI/usuario + contraseña (argon2) + JWT |
| Monorepo | pnpm workspaces |

Sin Docker, sin microservicios, sin GraphQL, sin Kubernetes. Un despliegue, una base.

## 2. Estructura del repo

```
apps/web        Next.js — interfaz del staff, del socio en web, y la API
apps/mobile     Expo — prevista para socios; todavía no existe en el repo (hoja de ruta, llesca 7)
packages/domain tipos, esquemas zod, reglas puras de cupo y cliente de API
```

`packages/domain` no importa nada de Next.js ni de React Native: es TypeScript puro y testeable.
La web usa las validaciones compartidas; la app Expo consumirá la misma API cuando se implemente.

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
| `dni` | text, nullable | obligatorio en altas nuevas de socios y staff; puede repetirse entre sus cuentas |
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
| `consumption_model` | enum | `weekly_quota` \| `monthly_quota` \| `pack` |
| `billing_period` | enum | `monthly` \| `quarterly` \| `semiannual` \| `annual` \| `none` \| `one_time` |
| `price_cents` | int | |
| `weekly_directed` | int | límites semanales de dirigidas para los modelos periódicos |
| `weekly_open` | int | límites semanales de opens para los modelos periódicos |
| `pack_classes` | int, nullable | tamaño por defecto del bono, solo `pack` |
| `active` | bool | las inactivas no se asignan pero se conservan |
| `created_at` | timestamptz | |

La "tarifa de prueba" es una fila más con `price_cents = 0`.

Aunque `monthly_quota` existe en el esquema y en el formulario de tarifas, hoy comparte los campos y el cálculo semanal de `weekly_quota`. No hay campos ni cálculo de saldo mensual; esa opción está pendiente de definición e implementación funcional.

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

### `weekly_quota_adjustment`

Ajustes puntuales por socio, semana y grilla, aplicados al cupo de la semana actual. Coach y admin pueden sumar o restar cupo; cada ajuste conserva autor, fecha y nota opcional.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | FK `user` (socio) |
| `week_start` | date | lunes de la semana local del box |
| `kind` | enum | `directed` \| `open` |
| `delta` | int | distinto de cero |
| `note` | text, nullable | |
| `created_by` | uuid | FK `user` (staff) |
| `created_at` | timestamptz | |

### `payment`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | |
| `billing_period` | enum | `monthly` \| `quarterly` \| `semiannual` \| `annual` \| `one_time` |
| `period_start` | date, nullable | inicio del periodo cubierto; null en `one_time` |
| `amount_cents` | int | |
| `method` | text, nullable | `cash` \| `bizum` \| `transfer` \| `card` \| otro |
| `recorded_by` | uuid | FK `user` (staff) |
| `created_at` | timestamptz | |

Invariante: único `(user_id, billing_period, period_start)` cuando el periodo no es `one_time`.
"Impago" = socio con tarifa de suscripción vigente sin fila de pago para el periodo en curso (según `billing_period` de la tarifa).

### `class_type`

Catálogo del admin. El panel de staff lo mantiene. Plantilla e instancia apuntan a `class_type_id`; la instancia copia `kind` para el cupo.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `name` | text | "Crossfit", "Endurance". Staff, detalle y Mis reservas. El bloque del calendario no lo pinta. |
| `kind` | enum | `directed` \| `open`. Se fija al crear el tipo y no se cambia. |
| `image_key` | text | clave del archivo obligatorio, ya encuadrado. Las imágenes subidas se guardan como binario compartido en Postgres para que funcionen en todos los despliegues y dispositivos. Sustituirlo no cancela reservas. |

Invariantes: sin `image_key` no hay tipo. El coach no inserta filas. No se borra un tipo con alguna instancia `scheduled` de hoy en adelante ni con algún entrenamiento (`CLASS_TYPE_IN_USE`); las pasadas siguen apuntándolo. `class_type_image` guarda el binario (JPEG, PNG o WebP, máximo 5 MB) en Neon; una ruta autenticada sirve las imágenes en web y móvil, sin un servicio externo de almacenamiento ni recorte. Las claves antiguas siguen usando la ruta estática mientras el archivo exista.

### `class_type_image`

Almacén compartido de imágenes subidas. El identificador lleva el prefijo `db_`; los binarios limitados a 5 MB quedan en Postgres para no depender del disco efímero de Vercel ni de una máquina concreta.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | text | Clave aleatoria guardada en `class_type.image_key`. |
| `mime_type` | text | JPEG, PNG o WebP. |
| `data` | bytea | Contenido de la imagen. |
| `created_at` | timestamptz | |

### `class_template`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `weekday` | int | 1 = lunes … 7 = domingo |
| `start_time`, `end_time` | time | hora local `Europe/Madrid` |
| `class_type_id` | uuid | FK `class_type`. La grilla sale del tipo. |
| `coach_id` | uuid, nullable | FK `user`. Es del hueco, no del tipo. |
| `default_capacity` | int | |
| `active` | bool | |

### `class_instance`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `template_id` | uuid, nullable | FK `class_template` |
| `date` | date | fecha local |
| `start_at`, `end_at` | timestamptz | |
| `class_type_id` | uuid | FK `class_type` |
| `kind` | enum | copia del tipo, para el cupo. No se edita aparte. |
| `coach_id` | uuid, nullable | |
| `capacity` | int | |
| `status` | enum | `scheduled` \| `cancelled` |
| `training_id` | uuid, nullable | FK `training`. Como máximo uno. El tipo del entrenamiento y el de la clase coinciden; si no, queda `null`. |
| `edited_at` | timestamptz, nullable | si no es `null`, la regeneración no la toca |
| `cancel_reason` | text, nullable | |

Invariante: único `(template_id, date)`. El nombre y la imagen se leen del tipo, no se copian. `training_id` no se copia al materializar: una instancia nueva nace sin entrenamiento.

### `training`

Ficha reutilizable de la biblioteca. Solo tipos `directed`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `name` | text | obligatorio. Puede repetirse. |
| `class_type_id` | uuid | FK `class_type` con `kind = directed`. |
| `created_at`, `updated_at` | timestamptz | la lista ordena por `updated_at` descendente. Cualquier guardado de nombre, tipo, fases o bloques lo actualiza. |

No hay autor, borrador ni versiones. Borrar pone `training_id` a `null` en las clases que lo señalaban. Cambiar `class_type_id` hace lo mismo en las clases cuyo tipo ya no coincide. Las reservas no se tocan. Si ese cambio soltaría alguna clase, el staff confirma antes y ve el número.

### `training_phase`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `training_id` | uuid | FK `training`, cascade |
| `name` | text | obligatorio. Puede repetirse dentro del entrenamiento. |
| `position` | int | orden de lectura, desde 0 |

### `training_block`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `phase_id` | uuid | FK `training_phase`, cascade |
| `body` | text | obligatorio, no vacío. Texto plano: se guardan los saltos de línea. Sin marcado. |
| `position` | int | orden dentro de la fase, desde 0 |

Invariante: un entrenamiento tiene al menos una fase y cada fase al menos un bloque. No se puede guardar a medias.

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
(`status = 'cancelled'`, `start_at`/`end_at`/`class_type_id`/`coach_id`/`capacity` distintos) con `edited_at` marcado.
`class_type_id` solo puede ser un tipo ya creado. Cambiarlo cancela las reservas activas con cupo devuelto.

## 4. Reglas de dominio

### 4.1 Materialización y cambios de plantilla

- Horizonte: desde hoy hasta el domingo de la cuarta semana (la semana en curso y las tres siguientes, lunes a domingo), en `Europe/Madrid`.
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
        successor = instancia con misma date, start_at, end_at y class_type_id,
                    status = 'scheduled', id != inst.id
        if successor and successor.capacity >= activeBookings(successor) + activeBookings(inst):
            moveBookings(inst, successor)        # cada reserva conserva su pool
        else:
            cancelBookings(inst, quota_returned = true)
        inst.status = 'cancelled'

    else if cambió date, start_at, end_at o class_type_id:
        successor = (mismo criterio, buscando el hueco nuevo)
        if successor and hay aforo:
            moveBookings(inst, successor)
        else:
            cancelBookings(inst, quota_returned = true)
        aplicar(inst, new)                       # hora, tipo, kind, coach, aforo

    else if new.capacity < activeBookings(inst):
        cancelBookings(inst, quota_returned = true)
        inst.capacity = new.capacity

    else:
        inst.coach_id = new.coach_id
        inst.capacity = new.capacity             # solo sube o se mantiene
```

- **"Idéntica"** = misma `date`, `start_at`, `end_at` y `class_type_id`. `coach_id` y `capacity`
  no forman parte de la identidad: cambiar el coach o subir el aforo no toca reservas.
  Cambiar `image_key` o `name` del tipo tampoco: no pasa por esta propagación.
- Toda reserva cancelada por estas reglas se cancela con `quota_returned = true`.
- La respuesta del endpoint incluye un resumen para el staff: clases canceladas, reservas canceladas
  y reservas mudadas, para que pueda avisar por WhatsApp.
- Si el cambio deja un aforo menor que las reservas y no hay sucesor con lugar, se cancelan **todas**
  las reservas de esa clase. No se elige a quién echar.
- Al mudarse las reservas a un sucesor, si ese sucesor no tiene `training_id` y el de origen sí, y los tipos coinciden, el sucesor señala el mismo entrenamiento. Si el sucesor ya tiene uno, se queda con el suyo. La instancia cancelada conserva el suyo. Si `aplicar` deja un tipo que no coincide con el entrenamiento, `training_id` pasa a `null`.

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

  if membership.consumption_model in ('weekly_quota', 'monthly_quota'):
      limit = kind == 'directed' ? tariff.weekly_directed : tariff.weekly_open
      if used(week(instance), kind) < limit:
          pool = kind == 'directed' ? 'weekly_directed' : 'weekly_open'
      else if pack_balance(u) > 0:
          pool = 'pack'
      else:
          409 QUOTA_EXHAUSTED
  else:  # consumption_model pack
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
  del mismo `weekday` **y el mismo `kind`** (dirigida vs open pueden coincidir en hora).
- Al editar una instancia: misma validación contra las instancias programadas del mismo día **y mismo `kind`**.
- Una instancia **no puede moverse a otro día**: la UI solo permite cambiar la hora dentro del
  mismo `date`. Mover de día es cancelar y crear una instancia nueva.
- `capacity` puede bajarse por debajo de las reservas activas: en ese caso se cancelan **todas** las
  reservas de esa instancia (con `quota_returned = true`) antes de aplicar el aforo nuevo. La UI exige
  confirmación explícita y muestra cuántas reservas se van a cancelar.
- `end_at` > `start_at`.

Además, el horario habitual del box se configura en `box_settings.weekly_hours` como siete días ISO (lunes = 1), cada uno con cero o más intervalos `[openTime, closeTime)`. Las excepciones por fecha viven en `box_settings.exceptions`; solo se guardan para hoy o una fecha futura. Si existe una fecha, sus intervalos sustituyen los del día semanal y una lista vacía significa cerrado todo el día.

- Plantillas, clases extra y ediciones de clase deben quedar enteras dentro de un único intervalo abierto de su fecha o día semanal. Dirigidas y Open comparten la disponibilidad del box.
- Los cambios del horario habitual y sus excepciones son inmediatos. Antes de persistirlos se comprueba que todas las plantillas activas y las clases programadas futuras sigan dentro de apertura. Si hay conflictos, se rechaza el cambio con el número de elementos afectados; el staff los ajusta o cancela manualmente. No se cancelan reservas automáticamente.
- La materialización omite las ocurrencias de plantilla cuya fecha tenga una excepción cerrada o cuyo horario efectivo no contenga la clase. Si después se elimina la excepción, la siguiente llamada idempotente puede materializar la ocurrencia.
- La migración inicial convierte el horario anterior (`07:00–21:00`) en ese mismo tramo para los siete días y no define excepciones.

### 4.7 Eje del calendario

- El eje parte de la apertura más temprana y el cierre más tardío del horario semanal o de las excepciones, en `Europe/Madrid`.
- El mismo eje para Dirigidas y Open y para las cuatro semanas. No se recalcula con la primera o la última clase de la vista.
- El admin persiste el horario semanal y las excepciones en `box_settings`. Si no hay fila, cada día abre `07:00–21:00`.
- Si una instancia empieza antes de la apertura o acaba después del cierre, el eje se extiende a la hora en punto que la cubre.

### 4.8 Biblioteca

- Un entrenamiento pertenece a un tipo `directed`. Open no tiene filas.
- La clase lo ve en vivo: el detalle lee las fases y los bloques actuales, no una copia.
- Asociar o quitar `training_id` no cancela reservas. Cambiar el `class_type_id` de la instancia sigue cancelándolas, y además suelta el entrenamiento si el tipo ya no coincide.
- Una clase `cancelled` sigue exponiendo su `training_id`.
- El socio lista y lee. El coach y el admin crean, editan y borran cualquiera. El miembro no escribe.

## 5. API

Los endpoints de datos devuelven JSON y validan entradas con los esquemas zod de `packages/domain`. La ruta de imágenes devuelve el binario con su tipo MIME.
Errores con `{ error: { code, message } }` y códigos estables (`FULL`, `QUOTA_EXHAUSTED`,
`OVERLAP`, `CANCELLATION_CLOSED`, `NO_MEMBERSHIP`, `FORBIDDEN`, `CLASS_TYPE_IN_USE`,
`CONFIRM_REQUIRED` y `SCHEDULE_CLOSED`).

**Público / sesión**

| Método | Ruta | Quién |
|---|---|---|
| POST | `/api/v1/auth/login` | todos |
| POST | `/api/v1/auth/logout` | todos |
| GET | `/api/v1/auth/me` | todos |

**Socio**

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/v1/calendar?from&to` | instancias con imagen del tipo, ocupación y si el socio está apuntado |
| GET | `/api/v1/instances/:id` | detalle (imagen, nombre, coach) + roster (`Nombre I.`) + entrenamiento asociado, si hay |
| GET | `/api/v1/trainings?classTypeId` | biblioteca de socio: nombre y tipo, del último editado al más antiguo. Sin `classTypeId`, todos |
| GET | `/api/v1/trainings/:id` | ficha: fases y bloques en orden |
| POST | `/api/v1/bookings` | reservar `{ instanceId }` |
| DELETE | `/api/v1/bookings/:id` | cancelar (regla de 2 h) |
| GET | `/api/v1/me/bookings` | próximas reservas |
| GET | `/api/v1/me/bookings/history` | reservas cuya clase ya empezó, de la más reciente a la más antigua |
| GET | `/api/v1/me/summary` | tarifa, cupos usados/límite, saldo de bono, estado del mes |

**Staff**

| Método | Ruta | Qué hace | Quién |
|---|---|---|---|
| GET | `/api/v1/admin/day?date` | clases del día con roster | coach, admin |
| GET | `/api/v1/admin/week?from` | ocupación `usadas/capacidad` | coach, admin |
| GET | `/api/v1/admin/templates` | ver plantilla semanal | coach, admin |
| GET | `/api/v1/admin/coaches` | opciones de coach para asignar a clases | coach, admin |
| GET/PATCH | `/api/v1/admin/hours` | horario semanal y excepciones; guardar valida la disponibilidad antes de aplicar | GET coach/admin, PATCH admin |
| GET | `/api/v1/admin/class-types` | ver catálogo para colocarlo en el plano | coach, admin |
| POST | `/api/v1/admin/class-types` | crear tipo con imagen obligatoria | admin |
| PATCH/DELETE | `/api/v1/admin/class-types/:id` | editar nombre/imagen o borrar si no está en uso | admin |
| GET | `/api/v1/class-type-images/:key` | servir una imagen compartida | sesión activa |
| DELETE | `/api/v1/admin/class-types/:id` | borrar solo si no tiene clases de hoy en adelante ni entrenamientos | admin |
| GET/POST | `/api/v1/admin/trainings` | listado staff con tipo y nombres ordenados de fases; alta eligiendo cualquier tipo dirigido | coach, admin |
| GET/PATCH/DELETE | `/api/v1/admin/trainings/:id` | ficha staff, edición o borrado. Borrar, o cambiar el tipo si suelta clases, exige `confirmDetach` cuando el número es mayor que cero y devuelve cuántas clases quedan sin plan | coach, admin |
| POST | `/api/v1/admin/templates` | crear plantilla semanal | admin |
| PATCH/DELETE | `/api/v1/admin/templates/:id` | editar o borrar plantilla; devuelve resumen de reservas canceladas y mudadas | admin |
| POST | `/api/v1/admin/instances` | crear clase extra | coach, admin |
| GET/PATCH | `/api/v1/admin/instances/:id` | leer o editar una instancia: cancelar, mover en el mismo día, cambiar tipo/aforo/coach, asociar o quitar `trainingId` del mismo tipo | coach, admin |
| GET/POST/PATCH | `/api/v1/admin/members` | alta, edición y listado de socios | coach, admin |
| GET | `/api/v1/admin/members/:id` | ficha: membresía, pagos, créditos, reservas | coach, admin |
| POST | `/api/v1/admin/members/:id/tariff` | cambiar tarifa | coach, admin |
| POST | `/api/v1/admin/members/:id/credits` | cargar saldo de bono | coach, admin |
| POST | `/api/v1/admin/members/:id/weekly-quota` | ajustar cupo de dirigidas u opens para la semana actual | coach, admin |
| POST | `/api/v1/admin/members/:id/reset-password` | resetear clave | coach, admin |
| POST | `/api/v1/admin/members/:id/deactivate` | dar de baja | admin |
| POST | `/api/v1/admin/members/:id/reactivate` | reactivar socio | admin |
| GET | `/api/v1/admin/tariffs` | ver catálogo | coach, admin |
| POST/PATCH | `/api/v1/admin/tariffs` | crear y editar tarifas | admin |
| GET/POST | `/api/v1/admin/staff` | listar y crear cuentas de staff con DNI obligatorio y teléfono/email opcionales | admin |
| GET/PATCH | `/api/v1/admin/staff/:id` | consultar perfil y editar nombre, teléfono y email | admin |
| GET | `/api/v1/admin/unpaid?date` | socios con periodo de facturación pendiente a esa fecha (por defecto hoy) | coach, admin |
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

- **Web** (`apps/web`, implementada): panel del staff (escritorio primero, responsive) y las pantallas del
  socio para quien entre desde el navegador. Server Components para lectura, route handlers para mutaciones.
  Reservas staff: detalle de instancia (`/staff/clases/:id`), enlazado desde Semana, Hoy o Excepciones; usa
  `POST/DELETE /api/v1/admin/bookings`. `/staff/reservas` redirige a Semana.
- **App móvil** (`apps/mobile`, pendiente): solo socios. La hoja de ruta reserva para esta llesca Expo Router
  con seis pestañas: Calendario, Mis reservas, Historial, Biblioteca, Mi tarifa y Cuenta; consumirá la misma API.
- Sin estado offline, sin push, sin cámara. La imagen del tipo es un archivo que sube el admin, ya encuadrado; nadie la saca desde la app.

## 8. Tiempo

- Las horas concretas de instancias se guardan en `timestamptz` (UTC). Las horas de plantillas usan `time` local; el horario del box conserva horas locales `HH:mm` en JSON.
- Los cálculos de semana, día y "2 horas antes" se hacen en `Europe/Madrid`.
- `date` de la instancia y `week_start` son fechas locales del box.
- Formato de moneda: EUR, `es-ES`.

## 9. Tests

- **Dominio** (`packages/domain`): obligatorio cubrir
  - consumo de cupo semanal contra la semana de la clase,
  - desborde a bono y saldo resultante,
  - cancelación con y sin devolución,
  - cancelación de instancia que devuelve todo,
  - solapamiento de reservas y de horarios,
  - generación idempotente de instancias,
  - cambiar el tipo de un hueco cancela las reservas; cambiar la imagen del tipo no.
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
- Pendiente antes de producción: publicar la página de privacidad web con finalidad, base legal, conservación y derechos.
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
