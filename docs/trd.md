# TRD — gestión de los boxes de una empresa de CrossFit

Arquitectura, tecnologías, estructura del proyecto y cómo funciona la app por dentro.

Las decisiones técnicas salieron de la misma sesión de grilling que el producto (27/10/2026). El
registro original está en
[`grilling-results/convenciones-tecnicas.md`](./grilling-results/convenciones-tecnicas.md) y no se edita.
Este documento es la versión vigente: si algo no coincide, manda este.

Qué debe hacer el sistema está en [`prd.md`](./prd.md).

---

## 1. Arquitectura actual y destino acordado (R1)

Estado comprobado el 12/11/2026: sigue implementado Next.js App Router + React, RSC para lecturas, route handlers `/api/v1`, Prisma 6/Postgres y auth propia argon2id/JWT de 90 días con `tokenVersion`. La configuración depende de Neon/Vercel; esto no acredita un despliegue verificado. No existen Fastify, SPA Vite, Compose ni Expo. El inventario y los fallos de referencia están en [R0](refactor-r0-r1/referencia.md).

Destino pendiente R2–R6: web React + Vite + React Router → REST/JSON Fastify → servicios de aplicación → Drizzle/pg/PostgreSQL. Un worker comparte casos de uso y materializa diariamente en Madrid con recuperación al arrancar e idempotencia. Docker local; alojamiento pendiente. No GraphQL, Redis ni microservicios. Imágenes siguen en tablas Postgres con autorización.

## 2. Paquetes y contratos del destino

Se crean solo al extraer implementación real: `apps/web` (SPA), `apps/api` (HTTP/auth/permisos), `apps/worker` (planificación), `apps/mobile` (R7); `packages/domain` (reglas puras), `contracts` (Zod/DTO públicos), `api-client` (tipos OpenAPI y fetch común), `db` (Drizzle/migraciones/pool) y `application` (casos de uso/transacciones). Dependencias: clientes → contracts/api-client; API/worker → application → domain/db. Nunca DB, secretos ni tipos de tablas en clientes. El cliente actual de domain se extrae, no se duplica.

Cadena única: Zod 4 → fastify-type-provider-zod (validación y serialización) → @fastify/swagger OpenAPI 3.0.3 → openapi-typescript → transporte fetch tipado. DTO de salida explícito y validado, nunca serializar una fila auth. R4 genera contrato y tipos y CI rechaza diferencias. Errores conservan códigos de dominio y HTTP; listados `{ items, pageInfo: { page, pageSize, total, totalPages } }`, 25 filas, orden/filtro antes de página, UUID de desempate. Opciones completas tienen endpoints separados. Inventario de operaciones y huecos: [R0](refactor-r0-r1/referencia.md).

Web: Query posee datos remotos; claves incluyen cuenta, sede, semana, filtro/orden/página. Limpiar al cerrar/cambiar cuenta. React Hook Form + Zod, rutas divididas con imports dinámicos, filtros en URL y búsquedas locales conservadas. Reserva invalida calendario/detalle/reservas/consumo; tarifa también ficha e historial afectados; pago invalida pagos/impagos/resumen; plantilla invalida plantilla/calendarios/clases/reservas afectadas. No reintentar mutaciones automáticamente ni optimismo en reservas durante recuperación.

### 2.1 Identidad Better Auth: decisión validada R1, implementación R3/R4

Cada cuenta de producto mantiene un único rol, ID, contraseña, estado y preferencias. Una persona puede tener una cuenta socio y otra staff con el mismo DNI y el mismo correo real. No fusionar permisos, contraseñas ni sesiones. No fabricar emails ni exigir dos direcciones.

Se emplean **dos ámbitos Better Auth con la misma factoría/configuración**, member y staff, dentro de la única API. La dependencia externa comprobada que justifica los ámbitos es la unicidad de email en `user` de Better Auth y su único username por usuario. Cada ámbito usa sus propias tablas auth (`member_auth_*`, `staff_auth_*`), basePath y cookiePrefix; secretos separados. Las tablas de negocio conservan su cuenta/UUID con vínculo único `(authRealm, authUserId)`. No confundir la tabla `account` de Better Auth (credenciales/proveedores) con la cuenta del producto. No mantener auth JWT antigua tras R6.

Alta administrativa atómica: crear usuario auth y credencial en su ámbito y cuenta de negocio; rollback conjunto. Email obligatorio no nulo, validado y normalizado en servidor; único dentro del ámbito, repetible entre ámbitos. Se guarda en cada cuenta auth y el DTO de cuenta lo proyecta sin copia divergente. La vinculación humana se confirma por DNI desde administración; nunca asociar ni conceder permisos por coincidencia de email. Cambiar contacto en una cuenta no altera la otra. “Real” significa dirección de contacto facilitada por staff, sin direcciones sintéticas; sin verificación no se puede demostrar la propiedad del buzón.

Username representa DNI normalizado (trim, mayúsculas como forma canónica; adaptación uniforme del plugin al comparar) en socio y usuario normalizado en staff. Staff no admite formato email ni `@`; no hay resolución por email. Mantener ambos accesos de una persona aunque sus contraseñas sean diferentes. La pantalla conserva DNI/usuario; el servidor determina el ámbito a partir del tipo de acceso, nunca del rol solicitado en el body. La autorización obtiene cuenta y rol vigentes desde DB y comprueba que la sesión pertenece al ámbito de esa cuenta.

`emailAndPassword.enabled=true` es necesario para Username; eso **no** autoriza publicar el acceso por email. Bloquear con `disabledPaths` y allowlist del montaje HTTP: `/sign-in/email`, `/sign-up/email`, `/request-password-reset`, `/reset-password`, `/send-verification-email`, `/verify-email`, `/change-email`; cualquier ruta no autorizada no se monta. Solo login username, consulta de sesión y logout quedan expuestos; altas/resets/contacto exclusivamente mediante casos de uso staff autorizados, usando API interna de Better Auth. Sin autorregistro, OAuth, magic links ni plugins de correo. `requireEmailVerification=false`; sin callbacks de envío/verificación ni proveedor SMTP/recepción. `emailVerified=false`, nunca simular verificación.

Sesiones persistidas Better Auth: duración absoluta de 90 días, `disableSessionRefresh=true`, cookieCache desactivada; cookie HttpOnly/SameSite=Lax/Secure bajo HTTPS. En cada operación se consulta sesión y cuenta activa/rol actual. Reset o baja elimina todas las sesiones de **esa cuenta**, incluso en móvil; conserva la otra cuenta de la persona. Logout elimina sesión servidor y cookie. Login y baja/reset se coordinan bloqueando cuenta y releyendo estado antes de crear sesión; portar bloqueo de 10 intentos/15 min sin carreras y añadir límite por IP. No confiar solo en rate limit en memoria.

Mismo origen web/API por proxy; comprobación de Origin y CSRF en mutaciones con cookie. Expo usará `@better-auth/expo` y `expo-secure-store`, cookie propia del ámbito, esquema nativo y trustedOrigins explícitos; nunca localStorage ni devolver el token web al JS. Al salir borra SecureStore/caché. No existe todavía cliente Expo; R7 prueba Android real. Si se guardan ambos ámbitos en un dispositivo, el cliente envía solo el elegido y la API rechaza ambigüedad.

Evidencia: [probe reproducible](refactor-r0-r1/auth-probe.mjs) con Better Auth 1.7.22 y memory adapter: altas internas mismo email, acceso username, credenciales separadas, email no verificado y siete rutas HTTP bloqueadas. [Resultado](refactor-r0-r1/resultados.md#probe-de-identidad). No prueba Drizzle/Postgres, concurrencia, permisos de negocio, revocación ni dispositivo: aceptación obligatoria R3/R4/R7. Reproducir instalando `better-auth@1.7.22` en carpeta temporal y copiando allí el script; ejecutar `node auth-probe.mjs`. No instala dependencias en este repo.

Fuentes oficiales consultadas 12/11/2026: [Username](https://better-auth.com/docs/plugins/username), [Email/password](https://better-auth.com/docs/authentication/email-password), [sesiones](https://better-auth.com/docs/concepts/session-management), [opciones](https://better-auth.com/docs/reference/options), [esquema](https://better-auth.com/docs/concepts/database), [Drizzle](https://better-auth.com/docs/adapters/drizzle) y [Expo](https://better-auth.com/docs/integrations/expo). La separación en ámbitos es una decisión de este proyecto, comprobada por el probe, no una función que acumule roles.

### 2.2 Versiones objetivo

Selección exacta para iniciar R2–R4, verificada contra metadatos oficiales del registro npm (12/11/2026), sin instalarla aquí: Node 22.23.1, pnpm 11.16.0, React/DOM 19.3.0, Vite 8.3.8, React Router 8.5.1, Query 5.107.1; Fastify 5.12.8, Zod 4.6.7, fastify-type-provider-zod 7.0.0, openapi-typescript 7.13.0; Better Auth y plugin Expo 1.7.22, Drizzle ORM 0.45.4/Kit 0.31.11, pg 8.23.1. React Router exige Node >=22.22 y React >=19.2.7; Vite admite este Node; Better Auth acepta Drizzle ^0.45.2, pg ^8, React ^19; provider Zod exige Fastify ^5.5 y Zod >=4.1.5. @fastify/swagger 9.9.3 satisface >=9.5.1; adaptador @better-auth/drizzle-adapter 1.7.22. Formularios: react-hook-form 7.92.0 y @hookform/resolvers 7.0.6 (React ^19/Zod ^4 admitidos). Compatibilidad de rangos verificada; build conjunto aún pendiente. Versiones Expo/RN se fijarán juntas en R7 según SDK soportado entonces, sin crear móvil ahora.

## Lectura de las secciones siguientes

§§3–9 describen la implementación Next/Prisma actual y las reglas que hay que preservar, salvo destino explícito. Las tablas auth del destino se añaden a las 16 entidades actuales; R3 genera esquema Drizzle y revisa SQL/índices parciales, no convierte solo modelos. §8 es la operación actual configurada; no decide el alojamiento futuro. El cron HTTP actual se retira al activar el worker en R6. Los detalles de JWT no son el diseño de sesión Better Auth.

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
| `theme` | enum `UserTheme`, default `system` | Preferencia de apariencia: `system`, `light` o `dark`. |
| `payment_box_id` | uuid, nullable | FK `box`. Solo socios. El alta lo deja en el box elegido; si no viene, el primero. Cambiarlo no toca reservas ni pagos. |
| `preference_box_id` | uuid, nullable | FK `box`. Solo socios. El calendario abre ahí. Elegir otro box en el selector lo guarda. El staff no lo edita. |
| `failed_logins`, `locked_until` | int, timestamptz | límite de intentos |
| `token_version` | int, default 0 | se incrementa al resetear contraseña o desactivar; invalida JWTs previos |
| `created_at`, `updated_at` | timestamptz | |

Preferencia de apariencia: `user.theme` usa el enum `UserTheme` (`system` / `light` / `dark`), no nulo con valor inicial `system`. Se devuelve en el acceso y se lee desde la sesión al renderizar el documento. El HTML inicial declara la preferencia; CSS aplica el tema del sistema sin esperar a hidratar y un provider compartido resuelve cambios del dispositivo y actualiza los tokens, el color del navegador y Sonner. Claro y Oscuro son anulaciones explícitas. La preferencia pertenece a la cuenta y se consulta de nuevo al abrir desde otro dispositivo; Sistema sigue el sistema operativo local.

### `user_profile_image`

Una foto opcional por cuenta. El binario se guarda en Postgres para no depender del disco efímero de Vercel.

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | uuid, PK/FK | Una foto por usuario; borrado en cascada con la cuenta. |
| `mime_type` | text | JPEG, PNG o WebP; verificado junto con la firma binaria. |
| `data` | bytea | Archivo original, máximo 5 MB. |
| `updated_at` | timestamptz | Se usa como versión de la URL cacheable. |

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
| `quota_directed` | int, nullable | límite de dirigidas por el periodo de consumo. `null` = ilimitado. Cero = ese cupo no entra. Solo en cupo semanal o mensual; el bono va a 0. |
| `quota_open` | int, nullable | límite de opens por el periodo de consumo. `null` = ilimitado. Cero = ese cupo no entra. Solo en cupo semanal o mensual; el bono va a 0. |
| `pack_classes` | int, nullable | tamaño por defecto del bono, solo `pack` |
| `active` | bool | las inactivas no se asignan pero se conservan |
| `created_at` | timestamptz | |

La "tarifa de prueba" es una fila más con `price_cents = 0`. `weekly_quota` consume por semana natural de lunes a domingo; `monthly_quota`, por mes natural. Ambos periodos usan la fecha local de la clase (`Europe/Madrid`) y son independientes de `billing_period`.

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

### `quota_adjustment`

Ajustes puntuales por socio, periodo de consumo y grilla, aplicados a la semana o al mes actual según la tarifa. Coach y admin pueden sumar o restar cupo; cada ajuste conserva autor, fecha y nota opcional. Los registros semanales existentes se migran como `period = week`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | FK `user` (socio) |
| `period` | enum | `week` | `month` |
| `period_start` | date | lunes de la semana o día 1 del mes local del box |
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
| `payment_box_id` | uuid | FK `box`. Box de pago del socio **en el momento del alta** del cobro; no cambia si luego se mueve el socio de sede. |
| `billing_period` | enum | `monthly` \| `quarterly` \| `semiannual` \| `annual` \| `one_time` |
| `period_start` | date, nullable | inicio del periodo cubierto; null en `one_time` |
| `amount_cents` | int | |
| `method` | text, nullable | `cash` \| `bizum` \| `transfer` \| `card` \| otro |
| `recorded_by` | uuid | FK `user` (staff) |
| `created_at` | timestamptz | fecha y hora en que el staff registró el cobro en el sistema |

Invariante: único `(user_id, billing_period, period_start)` cuando el periodo no es `one_time`.
"Impago" = socio con tarifa de suscripción vigente sin fila de pago para el periodo en curso (según `billing_period` de la tarifa).

### `class_type`

Catálogo del admin. El panel de staff lo mantiene. Plantilla e instancia apuntan a `class_type_id`; la instancia copia `kind` para el cupo.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `slug` | text, único | Identificador legible de URL, inmutable al renombrar; colisiones con sufijo numérico. |
| `name` | text | "Crossfit", "Endurance". Staff, detalle y Mis reservas. En el bloque, con foto no se pinta; sin foto sí. |
| `kind` | enum | `directed` \| `open`. Se fija al crear el tipo y no se cambia. |
| `image_key` | text, nullable | clave del archivo, ya encuadrado. `null` = sin imagen. Las imágenes subidas se guardan como binario compartido en Postgres para que funcionen en todos los despliegues y dispositivos. Sustituirlo no cancela reservas. |

Invariantes: un tipo puede no tener `image_key`. El coach no inserta filas. No se borra un tipo con alguna instancia `scheduled` de hoy en adelante ni con algún entrenamiento (`CLASS_TYPE_IN_USE`); las pasadas siguen apuntándolo. `class_type_image` guarda el binario (JPEG, PNG o WebP, máximo 5 MB) en Neon; una ruta autenticada sirve las imágenes en web y móvil, sin un servicio externo de almacenamiento ni recorte.

### `class_type_image`

Almacén compartido de imágenes subidas. El identificador lleva el prefijo `db_`; los binarios limitados a 5 MB quedan en Postgres para no depender del disco efímero de Vercel ni de una máquina concreta.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | text | Clave aleatoria guardada en `class_type.image_key`. |
| `mime_type` | text | JPEG, PNG o WebP. |
| `data` | bytea | Contenido de la imagen. |
| `created_at` | timestamptz | |

### `box`

Una sede de la empresa. Puede haber más de una. En esta v1 no se borra.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `slug` | text, único | Identificador legible de URL, inmutable al renombrar; colisiones con sufijo numérico. |
| `name` | text, único | El dato que ya existía se llama Box 1. La unicidad es el texto guardado. |
| `weekly_hours` | jsonb | Siete días ISO (lunes = 1). Cada día tiene cero o más intervalos `[openTime, closeTime)`. |
| `exceptions` | jsonb | Excepciones por fecha. Si existe la fecha, sus intervalos sustituyen el día semanal. Una lista vacía cierra el día. Solo se guardan para hoy o una fecha futura. |
| `created_at` | timestamptz | El primer box es el de `created_at` más antiguo. |

La web staff y el socio eligen box por URL o selector; horario, plantilla, clases nuevas y borrador de plantilla son por box. La materialización recorre cada box con su propio horario.

Un box nuevo lo crea el admin desde **Sedes** (`/staff/boxes`): nace con plantilla vacía y abierto de `07:00` a `21:00` los siete días (`defaultBoxHours`). **Horario del box** solo edita apertura y excepciones por fecha de la sede elegida.

Tarifas, biblioteca, tipos de clase y equipo no tienen `box_id`.

### `class_template`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `box_id` | uuid | FK `box`. El hueco es de esa sede. |
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
| `box_id` | uuid | FK `box`. Una clase extra también es de un box. Si viene de plantilla, es el box de esa plantilla. |
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
| `name` | text | siempre hay uno guardado. Si el staff lo deja vacío, se asigna la fecha de ese guardado en Europe/Madrid (`3 nov 2026`), con ` · 2` si ya existe. Al guardar, el nombre queda único en la biblioteca sin distinguir mayúsculas ni espacios de más; los repetidos viejos se quedan hasta que se editen. |
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

Invariante: un entrenamiento guardado tiene al menos una fase y cada fase al menos un bloque. No se puede guardar a medias. En el formulario se pueden quitar todas las fases y volver a elegir cómo empezar; el guardado sigue exigiendo contenido.

### `booking`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `instance_id` | uuid | FK `class_instance` |
| `user_id` | uuid | FK `user` (siempre rol `member`) |
| `pool` | enum | `quota_directed` \| `quota_open` \| `pack` |
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
Una clase extra futura sin reservas puede borrarse; si tiene historial, quitarla la deja cancelada y conserva la fila.
Restaurar una instancia modificada desde una plantilla activa reescribe los campos de horario desde la plantilla y
pone `edited_at = null`. Si cambia el tipo o el aforo queda por debajo de las reservas activas, se cancelan todas y
se devuelve su cupo o saldo; una modificación solo de hora conserva las reservas. Las reservas ya canceladas no se
reactivan. No se restaura si la plantilla está inactiva, cambió al día de otra semana, el box está cerrado o hay solape.
Una clase cancelada solo vuelve a `scheduled` antes de empezar; su historial de reservas canceladas permanece intacto.

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

El periodo se deriva del consumo de la tarifa vigente. Se usa la fecha de la instancia, en `Europe/Madrid`:

```
weekPeriod(d)  = lunes a domingo de la semana de d
monthPeriod(d) = día 1 al último día del mes de d
```

Consumo del periodo `P` para un socio:

```
used(P, kind) = count(bookings b
                      join class_instance i on i.id = b.instance_id
                      where b.user_id = :u
                        and b.pool = (kind == 'directed' ? 'quota_directed' : 'quota_open')
                        and i.date between start(P) and end(P)
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
      period = week(instance) if weekly_quota else month(instance)
      limit = kind == 'directed' ? tariff.quota_directed : tariff.quota_open
      if limit is null or used(period, kind) < limit + adjustment(user, period, kind):
          pool = kind == 'directed' ? 'quota_directed' : 'quota_open'
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
- Después de bloquear la clase se bloquea el socio y se releen reservas/consumo. No se permite sobreconsumo de cupo/bono ni solape entre sedes. Cambios de tarifa coordinan el mismo bloqueo de cuenta. Los tests de concurrencia actuales fallan en la referencia R0: esta garantía requiere aceptación de nuevo contra Postgres aislado.

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
  del mismo box, mismo `weekday` **y el mismo `kind`** (dirigida vs open pueden coincidir en hora; otro box no).
- Al editar una instancia: misma validación contra las instancias programadas del mismo box, mismo día **y mismo `kind`**.
- Una instancia **no puede moverse a otro día**: la UI solo permite cambiar la hora dentro del
  mismo `date`. Mover de día es cancelar y crear una instancia nueva.
- `capacity` puede bajarse por debajo de las reservas activas: en ese caso se cancelan **todas** las
  reservas de esa instancia (con `quota_returned = true`) antes de aplicar el aforo nuevo. La UI exige
  confirmación explícita y muestra cuántas reservas se van a cancelar.
- `end_at` > `start_at`.

El horario habitual de cada box vive en `box.weekly_hours`: siete días ISO (lunes = 1), cada uno con cero o más intervalos `[openTime, closeTime)`. Las excepciones por fecha viven en `box.exceptions`; solo se guardan para hoy o una fecha futura. Si existe una fecha, sus intervalos sustituyen los del día semanal y una lista vacía significa cerrado todo el día.

- Plantillas, clases extra y ediciones de clase deben quedar enteras dentro de un único intervalo abierto de su fecha o día semanal, según el horario de su box. Dirigidas y Open comparten la disponibilidad de ese box.
- Los cambios del horario habitual y sus excepciones son inmediatos y solo de ese box. Antes de persistirlos se comprueba que las plantillas activas y las clases programadas futuras de ese box sigan dentro de apertura. Si hay conflictos, se rechaza el cambio con el número de elementos afectados; el staff los ajusta o cancela manualmente. No se cancelan reservas automáticamente. Otro box no entra en la comprobación.
- La materialización omite las ocurrencias de plantilla cuya fecha tenga una excepción cerrada en su box o cuyo horario efectivo no contenga la clase. Si después se elimina la excepción, la siguiente llamada idempotente puede materializar la ocurrencia.
- Mover reservas al publicar un cambio de plantilla solo encuentra sucesora en el mismo box. Un hueco idéntico de otro box no recibe esas reservas.
- La migración del horario semanal convirtió el tramo anterior (`07:00–21:00`) en ese horario para los siete días. La migración del box copia ese horario y sus excepciones al box Box 1 y le asigna la plantilla y las clases que ya existían.

### 4.7 Eje del calendario

- El eje parte de la apertura más temprana y el cierre más tardío del horario semanal o de las excepciones, en `Europe/Madrid`.
- El mismo eje para Dirigidas y Open y para las cuatro semanas. No se recalcula con la primera o la última clase de la vista.
- El admin persiste el horario semanal y las excepciones en el primer box. Si no hay fila, cada día abre `07:00–21:00`.
- Si una instancia empieza antes de la apertura o acaba después del cierre, el eje se extiende a la hora en punto que la cubre.

### 4.8 Biblioteca

- Un entrenamiento pertenece a un tipo `directed`. Open no tiene filas.
- El `name` guardado es único ignorando mayúsculas y espacios de más. Si llega vacío, se asigna la fecha de ese guardado en `Europe/Madrid` (`3 nov 2026`), con ` · 2` si hace falta. No hay índice único: los repetidos viejos se quedan hasta que se editen.
- La clase lo ve en vivo: el detalle lee las fases y los bloques actuales, no una copia.
- Asociar o quitar `training_id` no cancela reservas. Cambiar el `class_type_id` de la instancia sigue cancelándolas, y además suelta el entrenamiento si el tipo ya no coincide.
- Una clase `cancelled` sigue exponiendo su `training_id`.
- El socio lista y lee. El coach y el admin crean, editan y borran cualquiera. El miembro no escribe.

## 5. API

Los endpoints de datos devuelven JSON y validan entradas con los esquemas zod de `packages/domain`. La ruta de imágenes devuelve el binario con su tipo MIME.
Errores con `{ error: { code, message } }` y códigos estables (`FULL`, `QUOTA_EXHAUSTED`,
`OVERLAP`, `CANCELLATION_CLOSED`, `NO_MEMBERSHIP`, `FORBIDDEN`, `ACCOUNT_LOCKED`,
`CLASS_TYPE_IN_USE`, `CONFIRM_REQUIRED` y `SCHEDULE_CLOSED`).

**Público / sesión**

| Método | Ruta | Quién |
|---|---|---|
| POST | `/api/v1/auth/login` | todos; devuelve usuario y tema; la sesión va en cookie `httpOnly` (web). Credenciales incorrectas → `FORBIDDEN`; cuenta bloqueada → `ACCOUNT_LOCKED` |
| POST | `/api/v1/auth/logout` | todos |
| GET | `/api/v1/auth/me` | todos |

**Socio**

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/v1/calendar?from&to&box` | instancias del box (`box` opcional: si falta, el de preferencia) con imagen del tipo (`null` si no hay), ocupación y si el socio está apuntado |
| GET | `/api/v1/instances/:id` | detalle (imagen, nombre, coach) + roster (`Nombre I.`) + entrenamiento asociado, si hay |
| GET | `/api/v1/trainings?classTypeId` | biblioteca de socio: nombre y tipo, del último editado al más antiguo. Sin `classTypeId`, todos |
| GET | `/api/v1/trainings/:id` | ficha: fases y bloques en orden |
| POST | `/api/v1/bookings` | reservar `{ instanceId }` |
| DELETE | `/api/v1/bookings/:id` | cancelar (regla de 2 h) |
| GET | `/api/v1/me/bookings?pagina` | próximas reservas, paginadas (25 por página, `pagina` ≥ 1) |
| GET | `/api/v1/me/bookings/history?pagina` | reservas cuya clase ya empezó, paginadas (25 por página, `pagina` ≥ 1) |
| GET | `/api/v1/me/summary` | tarifa, cupos usados/límite (`null` = ilimitado), saldo de bono, estado del mes |
| GET/PATCH | `/api/v1/me/preferences` | consultar o guardar tema (`theme`) y sede por defecto (`preferenceBoxId`, uuid o null); todos los roles con sesión; rechaza campos extra; la sede solo cambia por este endpoint, no al navegar el selector |
| POST/DELETE | `/api/v1/me/profile-image` | subir/reemplazar o quitar la foto propia (multipart `image`) | sesión activa |

**Staff**

| Método | Ruta | Qué hace | Quién |
|---|---|---|---|
| GET | `/api/v1/admin/day?date` | clases del día con roster | coach, admin |
| GET | `/api/v1/admin/week?from` | ocupación `usadas/capacidad` | coach, admin |
| GET | `/api/v1/admin/templates` | ver plantilla semanal | coach, admin |
| GET | `/api/v1/admin/coaches` | opciones de coach para asignar a clases | coach, admin |
| GET/PATCH | `/api/v1/admin/hours?box` | horario semanal y excepciones de ese box; si falta `box`, el primero. Guardar valida solo ese box | GET coach/admin, PATCH admin |
| GET/POST | `/api/v1/admin/boxes` | listar boxes; el admin crea uno con nombre, plantilla vacía y horario 07:00–21:00 | GET coach/admin, POST admin |
| PATCH | `/api/v1/admin/boxes/:id` | renombrar. Dos boxes no pueden guardar el mismo texto | admin |
| POST | `/api/v1/admin/members/:id/payment-box` | cambiar el box de pago. No cancela reservas ni reescribe pagos | coach, admin |
| GET | `/api/v1/admin/class-types` | ver catálogo para colocarlo en el plano | coach, admin |
| POST | `/api/v1/admin/class-types` | crear tipo; la imagen es opcional | admin |
| PATCH/DELETE | `/api/v1/admin/class-types/:id` | editar nombre/imagen o borrar si no está en uso | admin |
| GET | `/api/v1/class-type-images/:key` | servir una imagen compartida | sesión activa |
| GET | `/api/v1/profile-images/:userId` | servir una foto con sesión; socio: fotos presentes en rosters y coaches asignados; staff: cuentas que puede consultar | sesión activa |
| DELETE | `/api/v1/admin/class-types/:id` | borrar solo si no tiene clases de hoy en adelante ni entrenamientos | admin |
| GET/POST | `/api/v1/admin/trainings` | listado staff con tipo y nombres ordenados de fases; alta eligiendo cualquier tipo dirigido | coach, admin |
| GET/PATCH/DELETE | `/api/v1/admin/trainings/:id` | ficha staff, edición o borrado. Borrar, o cambiar el tipo si suelta clases, exige `confirmDetach` cuando el número es mayor que cero y devuelve cuántas clases quedan sin plan | coach, admin |
| POST | `/api/v1/admin/templates` | crear plantilla semanal | admin |
| PATCH/DELETE | `/api/v1/admin/templates/:id` | editar o borrar plantilla; devuelve resumen de reservas canceladas y mudadas | admin |
| POST | `/api/v1/admin/instances` | crear clase extra | coach, admin |
| GET/PATCH/DELETE | `/api/v1/admin/instances/:id` | leer o editar una instancia: cancelar o recuperar antes del inicio, cambiar hora/tipo/aforo/coach y asociar o quitar `trainingId`; DELETE quita una clase extra futura, borrándola si nunca tuvo reservas o cancelándola para preservar historial | coach, admin |
| POST | `/api/v1/admin/instances/:id/restore-template` | restaurar una instancia modificada a los valores actuales de su plantilla activa; valida día, apertura y solapes, y aplica las reglas de reservas de tipo/aforo | coach, admin |
| GET/POST/PATCH | `/api/v1/admin/members` | alta, edición y listado de socios | coach, admin |
| GET | `/api/v1/admin/members/:id` | ficha: membresía, pagos, créditos, reservas | coach, admin |
| POST | `/api/v1/admin/members/:id/tariff` | cambiar tarifa | coach, admin |
| POST | `/api/v1/admin/members/:id/credits` | cargar saldo de bono | coach, admin |
| POST | `/api/v1/admin/members/:id/quota-adjustments` | ajustar dirigidas u opens del periodo de consumo en curso (semana o mes natural); rechaza un cupo ilimitado | coach, admin |
| POST | `/api/v1/admin/members/:id/reset-password` | resetear clave | coach, admin |
| POST | `/api/v1/admin/members/:id/deactivate` | dar de baja | admin |
| POST | `/api/v1/admin/members/:id/reactivate` | reactivar socio | admin |
| GET | `/api/v1/admin/tariffs` | ver catálogo (`quotaDirected`/`quotaOpen` `null` = ilimitado) | coach, admin |
| POST/PATCH | `/api/v1/admin/tariffs` | crear y editar tarifas | admin |
| GET/POST | `/api/v1/admin/staff` | listar y crear cuentas de staff con DNI obligatorio y teléfono/email opcionales | admin |
| GET/PATCH | `/api/v1/admin/staff/:id` | consultar perfil y editar nombre, teléfono y email | admin |
| GET | `/api/v1/admin/unpaid?date` | socios con periodo de facturación pendiente a esa fecha (por defecto hoy) | coach, admin |
| POST | `/api/v1/admin/payments` | registrar pago | coach, admin |
| PATCH/DELETE | `/api/v1/admin/payments/:id` | corregir importe o método, o eliminar un pago mal registrado | coach, admin |
| POST | `/api/v1/admin/bookings` | reservar a nombre de un socio | coach, admin |
| DELETE | `/api/v1/admin/bookings/:id?returnQuota=` | cancelar a nombre de un socio | coach, admin |
| POST | `/api/v1/cron/materialize` | cron diario (protegido por secreto) | sistema |

## 6. Auth y sesión

**Destino acordado del refactor:** Better Auth con correo real obligatorio guardado en la cuenta y plugin Username para DNI de socio/usuario de staff. Sin acceso por correo ni flujos de envío, recepción, verificación o recuperación por email. Las decisiones de sesiones, revocación y correo de personas con dos cuentas están cerradas en §2.1 y R1 del [plan de refactor](../PLAN-REFACTOR.md). Los puntos siguientes describen la implementación actual, todavía sin migrar a Better Auth.

- `argon2id` para las contraseñas. Nunca se devuelven ni se registran.
- Login por `login_id` (DNI del socio, usuario del staff) + contraseña.
- JWT firmado, `exp` 90 días, claims mínimos: `sub`, `role`, `tv`.
- `tv` (token version) se compara con `user.token_version` en cada request autenticado; si no coincide, 401.
  Se incrementa al resetear la contraseña de un socio y al desactivar un usuario. El `logout` solo borra el token en el cliente.
- **Web**: cookie `httpOnly`, `Secure`, `SameSite=Lax`. El JSON de login no incluye el JWT.
- **App** (futuro): el cliente móvil obtendrá el token por un canal acordado (p. ej. header dedicado o endpoint aparte); hoy la API web prioriza cookie.
- Límite de intentos: 10 fallos por `login_id` en 15 minutos → `locked_until`; la API responde `ACCOUNT_LOCKED` (403). Se libera con reset del staff.
- Usuario o contraseña incorrectos (incluido login inexistente o socio de baja) → mismo mensaje genérico (`FORBIDDEN`, 403) para no filtrar cuentas.
- El staff puede resetear la contraseña de un socio; el socio no puede cambiarla.
- Sin emails: no hay "olvidé mi contraseña" automático.

## 7. Web y app

- **Web** (`apps/web`, implementada): panel del staff (escritorio primero, responsive) y las pantallas del
  socio para quien entre desde el navegador. Server Components para lectura, route handlers para mutaciones.
  Reservas staff: detalle de instancia (`/staff/clases/:id`), enlazado desde Semana, Hoy o Excepciones; usa
  `POST/DELETE /api/v1/admin/bookings`. `/staff/reservas` redirige a Semana.
- **App móvil** (`apps/mobile`, pendiente, llesca 21): todos los roles tras R6. Para socio, referencia de seis secciones:
  Calendario, Mis reservas, Historial, Biblioteca, Mi tarifa y Cuenta; consumirá la misma API y las reglas de
  `@78feet/domain` ya validadas en web (incluido multi-box).
- Sin estado offline, sin push, sin cámara. La imagen del tipo, si hay, es un archivo que sube el admin, ya encuadrado; nadie la saca desde la app.

## 8. Tiempo

- Las horas concretas de instancias se guardan en `timestamptz` (UTC). Las horas de plantillas usan `time` local; el horario de cada box conserva horas locales `HH:mm` en JSON.
- Los cálculos de semana, día y "2 horas antes" se hacen en `Europe/Madrid`.
- `date` de la instancia y `period_start` son fechas locales del box; el ajuste indica si es `week` o `month`.
- Formato de moneda: EUR, `es-ES`.

## 9. Tests

- **Dominio** (`packages/domain`): obligatorio cubrir
  - consumo semanal y mensual contra el periodo de la clase,
  - desborde a bono y saldo resultante,
  - cancelación con y sin devolución,
  - cancelación de instancia que devuelve todo,
  - solapamiento de reservas de una persona aunque las clases sean de boxes distintos,
  - solapamiento de plantilla y de clases dentro del mismo box, y que dos boxes puedan coincidir en hora,
  - que un cambio de plantilla no mueva reservas a un hueco idéntico de otro box,
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
- `apps/web/vercel.json` ejecuta `pnpm run build:deploy`: aplica las migraciones con `DIRECT_URL`, regenera Prisma y después compila y comprueba el CSS. `pnpm build` sigue siendo una compilación local sin migraciones.
- Dominio propio (~10–15 €/año); Apple Developer 99 €/año solo cuando se publique iOS.

## 11. Privacidad y RGPD

- Datos guardados: nombre, apellidos, DNI, teléfono y email opcionales, reservas, pagos y foto de perfil opcional.
- El roster expone a otros socios **foto (si existe) + nombre + inicial del apellido**, nunca DNI ni contacto. La ruta de imágenes requiere sesión y no publica archivos sin autorización; staff puede ver los perfiles que ya consulta en su trabajo.
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
multi-tenant, i18n, exportaciones, panel de métricas, offline. Docker local y app de staff pertenecen al destino R2/R7.

## Paginación de listados

Las pantallas de Socios, Impagos y Biblioteca consultan páginas de 25 filas con `skip`/`take` y un recuento filtrado. El orden añade `id` como desempate estable. El servidor normaliza páginas inválidas a 1 y ajusta las que exceden el total.

El historial de pagos de cada socio también pagina de 25 en 25 mediante `?pagina=N`, con orden por fecha de registro e ID. Reservar y consultar el resumen calculan el consumo periódico con recuentos por periodo y el saldo de bono con sumas y recuentos SQL; no cargan el historial completo. La comprobación de solapes de una reserva solo consulta reservas activas que coinciden con el intervalo solicitado. El dominio recibe los totales calculados y conserva la decisión sobre el cupo o bono a consumir.

### Coordinación de escrituras y límites

El acceso bloquea la fila de la cuenta antes de leer y actualizar los intentos de contraseña. Cambiar la tarifa bloquea al socio antes de leer su membresía y cancelar sus reservas futuras. Reservar y cancelar una reserva toman los bloqueos en orden clase → socio; la cancelación vuelve a leer el estado tras bloquear y solo actualiza reservas activas. Las modificaciones puntuales del horario, incluida la restauración o retirada de una clase extra, toman sede → clase y leen los valores actuales después de adquirir esos bloqueos.

Los esquemas de enteros persistidos respetan el rango `Int` de PostgreSQL. Importes y cantidades de los formularios comparten el máximo `2_147_483_647`; los importes se expresan en céntimos. Una cookie de sesión con codificación inválida se trata como ausencia de sesión.

La comprobación de migraciones recorre todos los archivos SQL en orden cronológico y cubre la asignación de sede a pagos existentes, además de los casos históricos específicos. Las regresiones de concurrencia se ejecutan contra PostgreSQL aislado y verifican acceso paralelo, solapes, conservación de cambios puntuales, cancelaciones y cambio de tarifa durante una reserva.

El filtrado de texto de Socios, Impagos y Biblioteca staff se aplica en el cliente a la página cargada; Equipo filtra la lista de cuentas cargada. Comparten la normalización de mayúsculas y acentos en `lib/ui/search.ts`, sin parámetros ni peticiones adicionales de búsqueda. Biblioteca staff solo indexa nombre y tipo, no el contenido del entrenamiento.

Los GET de `/api/v1/admin/members`, `/api/v1/admin/unpaid`, `/api/v1/admin/trainings` y `/api/v1/trainings` devuelven siempre `{ items, pageInfo: { page, pageSize, total, totalPages } }`. `page=N` es opcional y por defecto vale 1. Impagos añade `asOf` y Biblioteca de socio añade `types`. Los selectores internos usan las funciones de servidor que necesitan listas completas.

El saldo de bonos del listado se calcula con agregaciones `SUM(quantity)` de créditos y recuento de reservas consumidas para los IDs cargados: `pool=pack` y (`status=active` o `quotaReturned=false`). Impagos filtra en SQL por tarifa vigente y ausencia del pago de su periodo, antes de contar y paginar; no carga el historial de pagos.

### Organización de componentes web

`apps/web/components` se organiza por responsabilidad: `ui` conserva los primitives locales de shadcn/Base UI; `common` reúne composiciones transversales en `layout`, `navigation`, `forms`, `dialogs`, `feedback`, `lists`, `filters` y `media`; `providers` contiene los proveedores de contexto.

Los componentes de negocio se agrupan en `account`, `calendar`, `bookings`, `classes`, `class-types`, `members`, `team`, `payments`, `tariffs`, `trainings` y `boxes`. Compartir una pieza entre socio y staff no la convierte en genérica: el calendario sigue en `calendar` y el selector de sede en `boxes`. Los shells específicos de rol permanecen junto a la navegación común. Cada módulo puede consumir componentes de otro módulo manteniendo la propiedad original, como los pagos que aparecen en la ficha de un socio.

Los hooks y tipos específicos permanecen junto a sus componentes. Las subcarpetas se crean para conjuntos reales de piezas, como `calendar/calendar-board`, `boxes/hours` y `boxes/template-schedule`. Los helpers sin UI pertenecen a `lib` y las reglas de negocio a `packages/domain`. Se usan imports directos, sin archivos de reexportación generales.

`common/layout/module-page.tsx` centraliza la composición visual de los dashboards de staff y socio: `ModulePage` enmarca el módulo dentro del shell, `ModuleHeader` agrupa título y descripción, y `ModuleBody` contiene el contenido. Las rutas normales, sus fallbacks de carga y los estados de error usan la misma jerarquía; los cuerpos de altura completa conservan el scroll interno de calendarios y formularios.

`FormActions` compone Cancelar y el envío con espera para formularios; `ConfirmDialog` centraliza las confirmaciones, incluido su trigger opcional. Los formularios de registro y corrección de pagos comparten `PaymentFields` y el catálogo de métodos de `payments-view.ts`. `BoxTabs` prepara las opciones de sede y delega su presentación en `QueryFilter`, contando solo las sedes reales para decidir entre chips y desplegable.

La ficha de socio compone operaciones locales de edición personal, contraseña, tarifa, box de pago y estado de cuenta. Los diálogos conservan su propio estado de apertura y comparten el bloqueo de envío de la ficha. El alta de socio tiene un único propietario del estado de envío. Ficha y gestión de cupo comparten `formatAvailableQuota`; el editor de entrenamiento delega los cambios de cada fase en `TrainingPhaseEditor`, manteniendo el guardado y las confirmaciones en `TrainingEditor`.

La ruta `/dev/component-composition` permite comprobar estas composiciones con datos demo, largos, vacíos, uno y envío pendiente, además de claro/oscuro. Solo está disponible en desarrollo; los formularios de muestra no envían peticiones y la ficha se presenta en lectura.

### Organización de la edición de plantilla web

`TemplateSchedule` compone la cuadrícula, el editor de huecos y el diálogo de aplicación. El hook `useTemplateDraft` gestiona borrador, validaciones locales, descarte y estado de guardado; el borrador sin aplicar de cada box se conserva en `sessionStorage` por sesión del navegador. La función `applyTemplateDraft` concentra las peticiones DELETE, PATCH y POST, en ese orden y de forma secuencial. Si una petición falla, detiene las siguientes y propaga el error al hook. Este flujo mantiene las transacciones individuales de cada endpoint: el lote completo de edición no es una transacción única.

### Listado de Excepciones (staff)

`/staff/excepciones?pagina` pagina el listado (25 por página). `ExceptionsList` renderiza las instancias anómalas desde hoy (`listExceptionsPage`). La etiqueta corta del estado (`Extra`, `Modificada`, `Cancelada`) la expone `exceptionCardStatusLabel` en `lib/box/exceptions.ts`, con prioridad Cancelada sobre Extra y Modificada cuando varios `kinds` aplican.

### Organización de las acciones sobre clases puntuales

El detalle de clase compone `InstanceDetailActions`, que presenta edición y cancelación o recuperación. `InstanceForm` presenta los campos y delega el estado y la confirmación de aforo a `useInstanceEdit`; la confirmación conserva el cuerpo que produjo `CONFIRM_REQUIRED` y solo lo reenvía con `confirmCapacity=true` al confirmar. `ExtraClassForm` gestiona el alta independiente. Las peticiones y la conversión de datos del formulario se concentran en `instance-mutations.ts`, tipadas con `PatchInstance` y `CreateInstance` del dominio.

### Organización del calendario web

`CalendarBoard` conserva la entrada común y delega en las vistas explícitas de socio y staff. Ambas componen `WeekNav` y `CalendarGrid`, con `ClassBlock` compartido para las clases y las bandas de cierre dentro de la cuadrícula. `useCalendarScale` concentra las suscripciones a media queries y localStorage para el tamaño de la vista de socio; el staff conserva su escala fija. `calendarHref` centraliza los enlaces que mantienen la semana y la grilla elegidas.

La navegación web comparte `AppShell` para staff y socios. Las secciones se filtran por rol. El estado de plegado se guarda en la cookie `sidebar_state` y se lee en los layouts del servidor; los datos de sesión se deduplican dentro de cada render mediante React `cache`.

### Filtros legibles en la web

`box=<slug>` identifica sedes en Hoy, Semana, Plantilla, Horario, Calendario, Impagos y Cobros. `tipo=<slug>` identifica tipos de clase en ambas Bibliotecas; `grilla=open` selecciona Open en calendarios, Hoy y Plantilla (Dirigidas por defecto). La web resuelve estos valores a UUID antes de consultar el dominio. La web solo interpreta slugs y `grilla`; un filtro desconocido no selecciona ningún registro y se aplica el valor por defecto. Los endpoints API y las rutas de fichas conservan sus UUID.

`Box.slug` y `ClassType.slug` son obligatorios y únicos. La migración rellena los registros existentes; las altas normalizan el nombre, reservan «todos» y resuelven colisiones mediante el índice único y sufijos numéricos. Las ediciones de nombre no actualizan el slug.

### Implementación vigente en desarrollo

La aplicación no conserva contratos ni rutas retiradas. Las imágenes de tipos de clase se almacenan únicamente en `class_type_image`; las referencias locales de prueba se eliminan con la migración correspondiente. `evaluateBooking` recibe siempre el consumo agregado por SQL y usa las reservas consultadas para aforo y solapes. La ficha de socio carga datos personales y membresía vigente; el resumen de consumo y los pagos se consultan por sus funciones específicas. El cliente Prisma se comparte durante desarrollo; después de regenerarlo se reinicia el servidor.

### Panel de filtros y ordenación

`ListOptions` compone Popover, controles Select etiquetados y botones de aplicar/restablecer. El borrador vive solo mientras el panel está abierto; la selección aplicada procede de los parámetros del servidor. `orden` identifica opciones de una lista permitida por módulo; un valor desconocido usa el orden inicial. Los valores iniciales se omiten de la URL. Aplicar/restablecer construye una URL sin `pagina`; la paginación conserva filtros y orden. `list-sorting.ts` comparte etiquetas, normalización y criterios `orderBy` tipados. Las consultas ordenan en SQL antes de `skip`/`take`, siempre con ID como desempate. Equipo aplica rol y estado en la consulta de usuarios, restringida a coach/admin.

### Vacíos de listados

`ListEmptyBlock` centraliza la presentación de resultados vacíos con los primitives `Empty`, `EmptyHeader` y `EmptyContent`. Las tablas cliente reciben del servidor un `emptyState` contextual y lo renderizan antes de construir una tabla; `SearchEmptyState` reutiliza el mismo bloque para el filtrado de texto local. Las rutas generan enlaces de restablecimiento con `listOptionsHref` sin filtros ni página, conservando `orden`. No hay variantes visuales por módulo.

### Persistencia de destino R3 completada; R4 detenida

`packages/db` contiene esquema Drizzle, migración inicial y pool pg.
`packages/application` contiene consultas, transacciones, seed de catálogo/admin
e integración PostgreSQL. El vínculo de negocio `(auth_realm, auth_user_id)`
conserva roles excluyentes mediante FK condicionales y check de rol; correo,
username y credencial viven en las tablas Better Auth de cada ámbito.

Se ha probado el adapter real Better Auth/Drizzle: alta atómica, correo compartido
entre ámbitos, credenciales independientes y revocación al reset. También pasan
la comparación de catálogos contra las 19 migraciones originales, reglas y
carreras de reservas/tarifa/baja/edición, propagación de plantilla, biblioteca,
pagos, imágenes privadas y materialización repetida/concurrente. Cierre y límites:
[PLAN-REFACTOR §14](../PLAN-REFACTOR.md#14-r3--cierre-de-persistencia-del-destino),
[evidencia](refactor-r3/verificacion.md) y [bloqueos](refactor-r3/bloqueos.md).

El runtime web y Compose siguen usando Prisma. El usuario ha detenido R4 tras
el cierre R3: existen borradores de auth y contratos, sin servidor HTTP montado,
OpenAPI/cliente generados ni worker operativo. No se ha sustituido JWT ni el cron,
ni se han comprobado sus reemplazos por HTTP. R4 debe completarlos y efectuar su
corte antes de iniciar R5; no hay dos autenticaciones o planificadores activados.
