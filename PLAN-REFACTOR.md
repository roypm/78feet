# Plan de refactor de 78feet

Estado actualizado: 13 de noviembre de 2026. R0–R6 completadas; cierre R3 en §14, R4 en §17, R5 en §18 y R6 en §19. Los cortes anteriores se conservan como historial; §19 describe el runtime vigente.

## 1. Encargo y decisiones recuperadas

Este documento continúa el hilo «Lenguaje backend y Prisma», interrumpido mientras se preparaba el plan. El encargo es definir con profundidad cómo sustituir el stack, recuperar el punto funcional actual y después continuar lo que falta. No presupone que el nuevo stack ya exista.

Decisiones acordadas:

- Web SPA en React + TypeScript + Vite + React Router, para socio, coach y admin, responsive en escritorio y móvil.
- App nativa React Native + Expo + Expo Router para **todos los roles**, con presentación propia. Primero se recupera la web; después se construye Expo.
- Un único backend Node.js + TypeScript + Fastify, consumido por ambos clientes mediante REST/JSON y OpenAPI.
- PostgreSQL + Drizzle + Drizzle Kit. Se sustituye Prisma; la propuesta anterior de Kysely + dbmate queda descartada.
- TanStack Query para datos remotos; `fetch` mediante un cliente común; React Hook Form + Zod para formularios web; Tailwind + shadcn/ui y el diseño actual para la web.
- Desarrollo local compuesto con Docker. Se retira la dependencia del proyecto respecto a Neon y se pospone la elección de alojamiento hasta que toque desplegar.
- Better Auth es la autenticación elegida para el refactor. Cada cuenta tendrá correo real obligatorio, conservado como dato de cuenta. El socio seguirá entrando con DNI y contraseña y el staff con usuario y contraseña. No habrá envío ni recepción de correos, verificación por email, enlaces mágicos ni recuperación por correo.
- El coste del refactor no limita la elección técnica. Sí deben preservarse reglas, permisos, datos estructurales y comportamiento del producto.

El objetivo no es prometer velocidad por cambiar de framework. Es una web estática ligera, una API con responsabilidades claras, consultas controladas y una sola implementación mantenida.

## 2. Punto de partida comprobado

Fuentes: `docs/prd.md`, `docs/trd.md`, `docs/app-flow.md`, `docs/design-system.md`, `docs/hoja-de-ruta.md`, manifiestos del monorepo, esquema y migraciones Prisma, rutas API y servicios actuales. El vídeo que motivó parte del stack aporta herramientas; no sustituye las reglas del proyecto.

### 2.1 Estado real del repositorio

- Monorepo pnpm; raíz con scripts para desarrollar, compilar, comprobar tipos y ejecutar tests.
- `apps/web`: Next.js App Router, React, componentes de servidor para lecturas y route handlers para API. La API ya existe; no hay un servicio Fastify independiente.
- `packages/domain`: reglas y esquemas TypeScript, tests y cliente API. Debe conservarse lo útil sin dependencias de servidor o UI.
- `apps/mobile` todavía no existe.
- Prisma 6 define el esquema, genera el cliente, ejecuta migraciones y seed. Hay SQL explícito para bloqueos y agregaciones.
- La raíz depende de `@neon/config` y `@neon/env`; el TRD describe Neon y Vercel, y hay configuración de despliegue y cron ligada al stack actual.
- No hay todavía una composición Docker que represente el destino.
- La hoja de ruta marca hechas las llescas 0–20, incluida la auditoría web 7–20; la 21, Expo, está pendiente. Esto es estado documental y no certifica que todos los tests pasen hoy.

Corte R0 comprobado: HEAD `fb8c5e4ccf83c0e6aeb2cc15d7e0cf72f1933ab7`; `git status --porcelain=v1` y `git diff --stat` sin salida antes de esta tarea. La suposición anterior de numerosos cambios locales no se confirma en este corte. Se inventaría el árbol actual completo, sin descartar mejoras ya incorporadas. Node 22.23.1 y pnpm 11.16.0. No se hicieron commit, push, reset ni migraciones.

### 2.2 Inventario funcional que debe recuperarse

| Área | Comportamiento que debe conservarse | Referencia actual |
|---|---|---|
| Acceso | DNI de socio, usuario de staff, contraseña, bloqueo de intentos, reset por staff, baja y permisos | `apps/web/lib/auth`, rutas `auth` |
| Perfil | Datos según rol, foto privada, apariencia y sede por defecto persistidas | rutas `me`, `profile-images` |
| Calendario | Cuatro semanas completas, dirigida/open, sedes, ocupación, horarios, cierres y detalle | rutas `calendar`, `instances`, componentes `calendar` |
| Reservas | Alta/cancelación propia y por staff, cupo, bono, solapes, roster e historial | servicios `lib/box`, rutas `bookings` |
| Hoy y Semana | Sesiones por sede, navegación al detalle y contexto de origen | rutas `admin/day`, `admin/week` |
| Clases puntuales | Extra, modificar, cancelar, recuperar, restaurar plantilla, confirmar impacto de aforo | rutas `admin/instances` |
| Plantilla | Borradores por sede, duplicar, aplicar desde lunes siguiente, propagación y reservas afectadas | rutas `admin/templates`, componentes `boxes/template-schedule` |
| Sedes y apertura | Alta/renombre, horario semanal, copia de días, cierres por fecha, validación de conflictos | rutas `admin/boxes`, `admin/hours` |
| Tipos | Dirigida/open, aforo, imagen opcional, restricciones de borrado | rutas `admin/class-types`, `class-type-images` |
| Socios | Alta, ficha, edición, tarifa, cupos, bonos, box de pago, reset, baja/reactivación | rutas `admin/members` |
| Equipo | Cuentas coach/admin, contacto, estado y permisos | rutas `admin/staff` |
| Tarifas y cobros | Semanal/mensual/bono, ilimitado, ciclos de facturación, impagos y pagos corregibles | rutas `admin/tariffs`, `payments`, `unpaid` |
| Biblioteca | Listados socio/staff, nombre único o fecha Madrid, fases y bloques, confirmación al desvincular | rutas `trainings`, `admin/trainings` |
| Operación | Materialización idempotente, seed, migraciones, imágenes autenticadas, errores estables | cron actual, Prisma, tests |

Cada fila tiene referencia por endpoint, lectura/pantalla y escenario en [el inventario R0](docs/refactor-r0-r1/referencia.md). Las rutas API actuales no cubren necesariamente todas las lecturas usadas por los componentes de servidor: hay que inventariar ambos caminos.

### 2.3 Invariantes que no se negocian en el portado

Una empresa con varias sedes; catálogo, biblioteca, equipo y cupo compartidos. Apertura, plantillas y clases pertenecen a una sede. La sede preferida y la de pago son conceptos distintos; cambiar un selector no modifica preferencias ni pagos históricos.

El consumo depende de la fecha de la clase, en `Europe/Madrid`: semana natural o mes natural. Dirigidas y open son contadores separados; cero y sin límite tienen significado propio. El cupo se consume antes que el bono y este no caduca. El pago es informativo, no un bloqueo de reserva.

Un socio no puede reservar dos clases solapadas, tampoco entre sedes. No se supera el aforo ni se consume dos veces el último cupo o bono. La cancelación propia respeta el límite temporal vigente; staff decide devolución. El cambio de tarifa cancela las reservas futuras y conserva el saldo según las reglas actuales. Cancelar una clase devuelve consumos; recuperarla no recupera automáticamente reservas.

Publicar plantilla afecta solo a la sede correspondiente y desde el lunes siguiente. Cambiar tipo y bajar aforo tienen consecuencias explícitas sobre reservas y confirmaciones; cambiar imagen no. Se conserva la semántica vigente de modificaciones puntuales y entrenamientos vinculados.

Roles excluyentes, sin autorregistro, sin recuperación por email ni contraseñas visibles. Coach y admin no adquieren permisos de socio por usar móvil. El roster conserva el nombre abreviado y las fotos respetan autorización.

## 3. Arquitectura de destino

```text
Web React/Vite ────┐
                   ├── REST /api/v1 + contrato OpenAPI ── Fastify ── Drizzle/pg ── PostgreSQL
Expo Android/iOS ──┘                                         │
                                            servicios de aplicación + dominio
                                                             │
                                                proceso de materialización
```

### 3.1 Organización propuesta

```text
apps/web                 SPA Vite; rutas, pantallas, componentes y proveedores web
apps/api                 Fastify; HTTP, autenticación, permisos, límites y composición
apps/worker              Proceso programado de materialización
apps/mobile              Expo; se crea después del hito de recuperación web
packages/domain          Reglas puras; sin React, Fastify ni Drizzle
packages/contracts       DTO, validación de entrada/salida y contrato HTTP
packages/api-client      Cliente generado desde OpenAPI + transporte común
packages/db              Esquema Drizzle, migraciones SQL revisadas y conexión pg
packages/application     Casos de uso compartidos por API y worker
infra/                   Dockerfiles, proxy y configuración local
compose.yaml             Composición local
```

Son responsabilidades propuestas, no autorización para crear paquetes vacíos. Se crean al extraer código real. `application` evita que el worker importe un servidor HTTP; los repositorios y consultas pueden vivir junto a cada caso de uso. No crear capas genéricas de CRUD ni microservicios por módulo.

El cliente solo comparte contratos públicos. Los tipos de tablas, hashes, token version, datos privados y detalles del driver no se exportan a web ni Expo. La API aplica las decisiones de dominio; validar en un formulario ayuda a la persona, pero no sustituye la validación del servidor.

### 3.2 Web

- React Router para navegación y división por secciones mediante imports dinámicos. Acceso, shell y sección abierta no deben descargar todos los editores.
- TanStack Query como propietario de datos remotos: claves con cuenta, sede, semana, filtros y página; limpiar caché al salir o cambiar cuenta.
- `fetch` común con cancelación, credenciales web, traducción consistente de errores y transporte móvil separado. No reintentar automáticamente mutaciones con efectos.
- Tras una reserva, invalidar detalle, calendario, próximas reservas y resumen de consumo afectados. Cambios de tarifa, pagos y plantilla tienen sus mapas de invalidación explícitos.
- URL como fuente de filtros, orden y página. Mantener `box=<slug>`, `tipo=<slug>`, `grilla=open`, `estado`, `orden` y `pagina` donde correspondan. Fichas y API conservan UUID.
- Búsquedas locales conservan su alcance actual sobre la página cargada; no convertirlas silenciosamente en búsquedas globales.
- React Hook Form + Zod se incorporan al portar formularios. Mantener mensajes bajo campo, valores ante error y bloqueo de doble envío.
- Migrar `next/link`, `next/navigation`, `next/image`, `next/headers`, layouts, metadata y fallbacks a sus responsabilidades SPA. No reemplazar imports mecánicamente sin revisar comportamiento.
- La web solicita datos exclusivamente a la API. No contiene secretos ni importa servicios o conexión de base de datos.

### 3.3 API y contrato

Fastify agrupa rutas por funcionalidad, con autenticación y permisos explícitos. Los handlers convierten HTTP a casos de uso y estos resuelven transacciones y dominio. Mantener errores con códigos estables; Zod o la integración elegida debe validar en ejecución y producir un OpenAPI coherente. Fijar una única cadena de generación comprobada al iniciar la fase de contratos.

Inventariar para cada operación método, ruta, rol, entrada, salida, errores, transacción y pantallas consumidoras. Añadir endpoints para lecturas que hoy solo existen en RSC: shells y preferencias, listados/configuración, detalle y resúmenes específicos que falten. Generar cliente desde el contrato y comprobar que no queda desfasado.

Las páginas de listados conservan `{ items, pageInfo: { page, pageSize, total, totalPages } }` y sus campos adicionales. Orden y filtro se aplican antes de paginar; ID desempata. Los selectores que necesitan listas completas tendrán una consulta explícita y acotada, sin reutilizar accidentalmente una página de tabla.

### 3.4 Base de datos y transacciones

Portar las 16 entidades actuales: usuario, tarifa, membresía, crédito, ajuste de cupo, pago, tipo e imagen de tipo, imagen de perfil, sede, plantilla, instancia, entrenamiento, fase, bloque y reserva. Revisar el esquema Prisma **y todos sus SQL**, porque índices parciales, restricciones y datos transformados no se deducen solo de los modelos.

Conservar UUID, claves foráneas, unicidad, índices relevantes, `timestamptz`, fechas locales, céntimos enteros y límites de cantidades. Los slugs son obligatorios, únicos y estables al renombrar; las imágenes actuales viven en PostgreSQL. No introducir S3 o almacenamiento externo por este refactor.

Como no hay usuarios de producción y los datos son prescindibles, se propone una migración inicial Drizzle que represente el esquema final y un seed determinista nuevo. No hace falta mantener dos historiales ejecutables ni migrar datos de prueba. Primero comparar la nueva base con el esquema final y sus restricciones; después retirar Prisma y su historial del árbol activo. Git conserva el historial. Un reset solo apunta a la base local de desarrollo identificada.

Portar consultas con proyecciones, agregaciones SQL y paginación; no cargar historiales completos para calcular consumo. Revisar planes de consultas de calendario, impagos y consumo con datos representativos. Configurar pool limitado y cierre ordenado.

La migración debe preservar bloqueos y su orden por operación. El código actual usa clase → socio al reservar/cancelar y sede → clase en cambios puntuales; acceso y cambio de tarifa también bloquean la cuenta. Releer después de bloquear. Auditar el conjunto completo de operaciones, incluidas las que afectan varias clases, para evitar ciclos de bloqueo. Mantener el índice único parcial de reserva activa y comprobar rollback sin efectos parciales. No sustituir estas garantías por comprobaciones en el cliente.

### 3.5 Autenticación: Better Auth con correo de cuenta y acceso por DNI/usuario

Decisión actualizada: pedir correo real en el alta y guardarlo en la cuenta. Better Auth queda elegido; se elimina el requisito anterior de admitir cuentas sin email y la alternativa planificada de construir auth propia. El alta sigue siendo administrativa, sin autorregistro.

La integración usará el plugin Username para representar el identificador de acceso: DNI normalizado para socio y usuario para staff. El correo no será una credencial de acceso expuesta por 78feet. La API deberá impedir el acceso por email también por petición directa, no solo ocultarlo en la pantalla.

No se configurará transporte de correo ni callbacks de envío. Desactivar verificación obligatoria, verificación al alta o al entrar, enlaces mágicos y recuperación por email; no marcar un correo como verificado sin haberlo verificado. No habrá recepción de mensajes ni proveedor de correo. El reset seguirá a cargo del staff y deberá revocar las sesiones correspondientes.

Referencias oficiales para implementar y fijar versiones: [Username](https://better-auth.com/docs/plugins/username) y [Email & Password](https://better-auth.com/docs/authentication/email-password). El plugin permite iniciar sesión con username aunque el alta conserve un email. La configuración concreta y el bloqueo de rutas no utilizadas deben probarse al integrar.

R1 valida el diseño y un probe aislado de estas reglas; R3/R4 deben probar la implementación real, sin reabrir la elección de biblioteca:

1. Alta administrativa con correo real obligatorio; DNI de socio y usuario de staff como identificadores; acceso por email rechazado.
2. Roles excluyentes, sin autorregistro; el staff controla altas y resets.
3. Resolución R1: dos ámbitos Better Auth (member/staff), misma configuración, tablas y sesiones separadas; mismo correo real permitido entre ámbitos. Cuenta de negocio con vínculo único `(authRealm, authUserId)`, rol excluyente y contraseña independiente. No fusionar por correo. Justificado por unicidad externa de email; ver TRD §2.1 y probe.
4. Desactivar/resetear revoca el acceso existente; intentos limitados sin carreras.
5. Sesión web segura y canal móvil soportado, con permisos consultados en el servidor.
6. Ningún flujo genera correo ni exige verificarlo para acceder; la cuenta conserva el correo sin usarlo para recuperar credenciales.

Las sesiones del destino serán las de Better Auth. No trasladar mecánicamente el JWT de 90 días y `tokenVersion` del sistema actual: preservar sus garantías de expiración, revocación y bloqueo con mecanismos de Better Auth, documentando la política final. El soporte bearer actual tampoco demuestra que esté resuelta la emisión móvil. Definir la integración Expo, almacenamiento seguro y limpieza al salir; la sesión web no se devuelve como token legible por JavaScript.

Preferir mismo origen web/API mediante proxy local; verificar origen en mutaciones con cookie y política CSRF. Si se habilitan orígenes separados, lista explícita de CORS y credenciales, nunca comodín. Los permisos no dependen de ocultar enlaces. No registrar contraseñas, tokens ni datos personales innecesarios.

### 3.6 Docker y operación local

Servicios previstos:

| Servicio | Función | Persistencia y disponibilidad |
|---|---|---|
| `db` | PostgreSQL | Volumen local; healthcheck; versión fijada |
| `migrate` | Aplicar migraciones | Tarea única tras DB disponible; fallo impide arranque normal |
| `api` | Fastify | Arranca con esquema preparado; health y readiness diferenciados |
| `web` | Vite en desarrollo | Proxy `/api` al servicio API; build estático comprobable |
| `worker` | Materialización diaria | Usa mismos casos de uso y DB; reintentos acotados |

Dockerfiles de desarrollo con recarga y una construcción reproducible; la web de producción se compilará como estáticos cuando corresponda. Expo se desarrolla con las herramientas del dispositivo, no se fuerza dentro de un contenedor.

`.env.example` documentará variables por servicio sin valores reales. Separar URL interna Docker y URL accesible desde emulador/teléfono; el `localhost` de un móvil no es el ordenador. DB no se expone públicamente. Seed manual o tarea explícita: reiniciar contenedores no resetea datos. Documentar arranque, parada, logs, migración, seed y reset local con nombre de volumen claro.

El worker ejecuta materialización idempotente diaria en zona Madrid y recupera ejecuciones perdidas al arrancar. Probar solapamiento de ejecuciones y evitar duplicados con transacción/constraints y coordinación en Postgres. No añadir Redis. El cron HTTP de Vercel se retira al sustituirlo; no mantener dos planificadores activos.

Retirar imports, dependencias, scripts y documentación que obligan a Neon/Vercel cuando el camino local funcione. No borrar proyectos remotos, bases ni cuentas. Alojamiento, dominio, TLS, backups gestionados y publicación de apps se deciden más adelante con el producto validado.

## 4. Secuencia de ejecución y criterios de cierre

Cada fase deja evidencia reproducible y una implementación vigente. Durante el portado puede existir código antiguo como referencia temporal, pero no dos productos publicados ni adaptadores de compatibilidad. El corte definitivo elimina el anterior y actualiza todos sus consumidores.

| Fase | Trabajo concreto | Se cierra cuando |
|---|---|---|
| R0 — Congelar referencia | Inventario de cambios locales, matriz funcional por rol, rutas/API/RSC y resultados de checks; fixtures y escenarios de comparación | Cada función de la web tiene referencia y criterio de aceptación; fallos previos quedan identificados |
| R1 — Decisiones y documentación | Verificar la integración Better Auth y el modelo de cuentas; fijar versiones compatibles, contratos y límites de paquetes; actualizar documentos de destino | No quedan decisiones de identidad o transporte que obliguen a rehacer el esquema |
| R2 — Entorno local | Compose, Postgres, configuración, salud, scripts y DB aislada de tests | Un clon limpio levanta el entorno documentado sin Neon y sin secretos remotos |
| R3 — Persistencia y dominio | Drizzle, migración inicial, seed, consultas y bloqueos; conservar reglas puras; tests reales de DB | Crear DB vacía, migrar, sembrar y probar reglas/concurrencia funciona reproduciblemente |
| R4 — API completa | Portar auth y todos los casos de uso, añadir lecturas RSC faltantes, OpenAPI/cliente y worker | Matriz HTTP completa por rol, validación y permisos; cero dependencias Next en API/worker |
| R5 — SPA y recuperación | Shell, login y perfil; socio; staff diario; socios/pagos; configuración/plantilla/biblioteca, en ese orden | Matriz funcional y visual completa contra la nueva API; ningún acceso directo desde web a DB |
| R6 — Corte y limpieza | Sustituir web antigua, retirar Next/Prisma/Neon/Vercel, revisar imports, scripts, docs y mediciones | Hito «web recuperada» superado y una sola implementación operativa |
| R7 — Expo | Cliente nativo y navegación de todos los roles; Android primero | Paridad funcional por rol en Android, sesión e imágenes privadas verificadas en dispositivo |
| R8 — Preparar publicación | Decidir alojamiento, backups, privacidad y operación; luego iOS/publicación según prioridad | Entorno elegido y ensayo de despliegue/restauración antes de publicar |

No comenzar R7 antes de R6. Dentro de R5, cada módulo se entrega con consultas, mutaciones, invalidación, estados y pruebas de flujo; no una colección de pantallas sin backend. No se da por hecha Expo al reutilizar el cliente HTTP.

### Hito obligatorio: web recuperada

- [x] Socio, coach y admin realizan todos sus flujos actuales y rechazan acciones ajenas a su rol.
- [x] Calendarios, sedes, preferencia, horario, excepciones y borradores mantienen su semántica.
- [x] Reservas, cambios de tarifa, cupos, bonos y concurrencia pasan con Postgres real.
- [x] Socios, Equipo, Impagos, Cobros y Bibliotecas conservan filtros, orden, búsqueda local y páginas.
- [x] Imágenes privadas y opcionales, tema, vacíos, errores, foco, diálogos y navegación funcionan.
- [x] URLs actuales de producto siguen teniendo una ruta SPA directa válida; no se crean alias de legado.
- [x] Materialización funciona al reiniciar y ejecutar dos veces; no depende de Vercel Cron.
- [x] Instalación, migración, seed, tests, typecheck y build funcionan con instrucciones locales.
- [x] No quedan imports ni comandos activos de Next, Prisma o Neon; tampoco mocks usados como backend real.
- [x] Documentos vigentes describen el sistema implementado y distinguen Expo pendiente.

## 5. Cómo actualizar la documentación sin perder el contexto

Este plan no reescribe hoy los documentos vigentes para fingir que el refactor está terminado. R1 debe actualizar el destino acordado, marcando explícitamente qué sigue implementado con Next/Prisma durante la transición. Cada fase cerrada retira las notas temporales que ya no correspondan. No editar `docs/grilling-results/*`.

| Documento | Cambios concretos | Momento |
|---|---|---|
| `docs/prd.md` | Cambiar regla dura 15: web y app para todos los roles, permisos idénticos por cuenta; correo obligatorio como dato de cuenta, acceso por DNI/usuario y ningún flujo de correo; separar producto móvil pendiente de web existente | R1; estado de cumplimiento en R6/R7 |
| `docs/trd.md` | Sustituir §§1–2 por SPA/API/worker/paquetes; modelo Drizzle, contrato OpenAPI, auth elegida, transacciones, Docker y operación; retirar acoplamiento RSC/Vercel/Neon | R1 como destino; completar detalles verificados R3–R6 |
| `docs/app-flow.md` | Mantener todos los flujos web; añadir recuperación de sesión SPA, estados de carga/error; navegación Expo por rol y acceso a funciones admin/coach sin suponer seis pestañas para todo el mundo | R1 alcance; R5/R7 flujos implementados |
| `docs/design-system.md` | Conservar tokens, marca, componentes y accesibilidad; sustituir referencias Next/webpack cuando se porten; separar equivalencia visual nativa de componentes web | R5 y R7 |
| `docs/hoja-de-ruta.md` | Insertar R0–R6 antes de Expo, conservar 0–20 como historial; ampliar 21 o dividir nuevas llescas móviles por rol; retirar Docker de excluidos | R1 |
| `README.md` | Arranque Docker, paquetes, comandos, variables, tests y estado de migración | R2; limpieza R6 |
| `AGENTS.md` y guías operativas | Ajustar solo referencias técnicas que dejan de aplicar; preservar dominio, documentación, diseño y política de commits | R6 |

Contradicciones ya localizadas que deben resolverse al consolidar, sin arrastrarlas al nuevo stack:

1. PRD §5.5 habla de Biblioteca «sin páginas»; su sección vigente de paginación y las consultas ya establecen páginas de 25. Consolidar la descripción paginada.
2. TRD §4.4 acepta sobreconsumo simultáneo; el código y la sección posterior de coordinación ya bloquean al socio. Reescribir desde las garantías reales y sus tests, no desde esa excepción antigua.
3. PRD regla 15, TRD §7 y hoja de ruta describen móvil solo para socios. El alcance acordado incluye coach/admin y debe propagarse a los tres.
4. TRD y hoja de ruta excluyen Docker y fijan Neon/Vercel. Se sustituye por operación local y despliegue pendiente, sin elegir otro proveedor ahora.
5. TRD tiene detalles de imagen subida como archivo y referencias de almacenamiento antiguas; conservar el almacenamiento actual en tablas y rutas autenticadas.
6. Design system describe Next Link, fallbacks de servidor y PostCSS/webpack; conservar sus efectos para la persona con React Router, Query y el pipeline Vite elegido.

El diseño no se rehace por cambiar runtime. Mantener sistema visual, marca y assets existentes; la diferencia entre nombre del repositorio y marca visible no autoriza un rebranding. No instalar packs de diseño adicionales.

## 6. Validación y rendimiento

### 6.1 Línea base y comprobaciones

En R0 ejecutar los comandos existentes `pnpm test`, `pnpm typecheck`, lint web y build; registrar fallos y pruebas omitidas, sin declarar verde una suite que saltó integración por falta de variables. Los tests de concurrencia actuales dependen de `DATABASE_URL` y `JWT_SECRET` y pueden omitirse: la nueva ejecución de aceptación debe exigir una base aislada disponible.

Portar los tests de dominio que expresan reglas. Sustituir tests acoplados a Prisma/Next por verificaciones del nuevo comportamiento, sin conservar comprobaciones de una implementación retirada. Las pruebas de migraciones históricas Prisma se reemplazan por creación desde cero y evolución del nuevo historial; sus invariantes de datos/restricciones sí se recuperan.

Integración con PostgreSQL real aislado: última plaza, último cupo y bono en paralelo, reservas del mismo socio entre sedes, doble cancelación, cambio de tarifa durante reserva, login concurrente, edición/restauración de clase y generación repetida. Verificar estado final y rollback, no solo códigos HTTP.

La matriz de auth cubre sin sesión, socio, coach, admin, cuenta inactiva, token revocado, cookie malformada y acceso a foto ajena. Los contratos comprueban que no se devuelven hashes ni campos privados, y que DTO/OpenAPI/cliente concuerdan.

Smoke web por rol con datos vacíos y representativos, escritorio y pantalla estrecha, tema sistema/claro/oscuro y teclado. Incluir rutas directas, recarga, atrás/adelante, error API, sesión caducada y guardado fallido sin perder formulario. Antes de cerrar Expo repetir los flujos en dispositivo Android real; una web responsive no verifica la app nativa.

### 6.2 Medir la rapidez buscada

Registrar antes/después en el mismo entorno y dataset: bytes comprimidos de entrada y por ruta, peticiones iniciales, cadenas de espera, tiempo hasta pantalla utilizable, latencia API p50/p95 y número/duración de consultas de calendario, ficha, listado y reserva. Fijar presupuestos a partir de esa referencia en R0/R1, no inventar cifras de rendimiento.

Comprobar que editores no se descargan al abrir login, que navegar reutiliza caché sin mezclar cuentas, y que ninguna lectura deriva en N+1 o carga de historial completo. Mantener un procedimiento reproducible y resultados junto al cierre R6. No añadir realtime, Redis ni prefetch indiscriminado para ocultar consultas lentas.

## 7. Pendientes posteriores al refactor

Expo es trabajo nuevo, no una función ya completada: socio necesita calendario, detalle, reservas, historial, biblioteca, tarifa y cuenta; coach necesita operación diaria, clases, socios, pagos y biblioteca según sus permisos; admin añade equipo, tarifas, sedes, tipos, horario y plantilla. Definir navegación nativa por rol antes de construirla; compartir API y reglas no obliga a portar tablas web tal cual.

Android es el primer objetivo de validación. iOS queda en fase posterior, sin dar por hecha su publicación. El despliegue se decide cuando proceda; Docker local no equivale a una operación de producción preparada.

Antes de producción siguen pendientes privacidad publicada, gestión de secretos, TLS, backups y ensayo de restauración, logs operativos y estrategia de actualización. Mantener fuera de alcance pagos online, push, asistencia, lista de espera, offline, multiempresa e integraciones no solicitadas.

## 8. Riesgos y decisiones que cierran trabajo

| Riesgo | Resolución prevista |
|---|---|
| Perder mejoras locales al partir de un commit anterior | R0 incorpora el árbol actual y todas las migraciones locales al inventario |
| Olvidar lecturas que solo hacía el servidor Next | Matriz de páginas y funciones de lectura antes de definir API completa |
| Cambiar reglas al reescribir SQL | Tests de dominio + integración de transacciones y comparación de escenarios |
| Integrar Better Auth sin conservar los accesos y permisos actuales | Verificar identificadores, sesiones, rutas deshabilitadas y unicidad de correo en R1 |
| Llevar tipos internos al cliente | DTO públicos, validación de salida y cliente generado |
| Dar una reserva por completada con datos de caché antiguos | Invalidación definida por mutación; no optimismo en reservas durante recuperación |
| Hacer Expo antes de recuperar el producto | R6 es requisito de entrada a R7 |
| Confundir retirada de Neon con borrado remoto | Solo retirar dependencia/configuración local; recursos remotos fuera de ejecución |
| Documentación que describe dos arquitecturas como actuales | Destino y estado señalados durante transición; consolidación obligatoria en R6 |

R0 y R1 cerradas en esta sesión con el alcance documental y experimental siguiente. Este cierre corresponde a R0/R1; R2 se registra al final. Fastify, Drizzle y SPA siguen pendientes.


## 9. Cierre de R0 y R1 — 12/11/2026

Workflow aplicado: `docs/setup-roy/workflows/01-feature-sdd-ponytail.md`, SDD auto. Anchor: AGENTS, plan, documentos vigentes y código. Specify: recuperar referencia y cerrar decisiones sin portar runtime. Clarify: mantener dos cuentas independientes y correo compartible; sin verificar propiedad del buzón. Plan/tasks: inventario → checks → probe de identidad → consolidación de cinco documentos → cross-check. Checklist/analyze: alcance limitado a R0/R1, sin decisión pendiente de identidad/esquema/transporte. Implement: inventario y documentación, Ponytail full. Converge: revisión cruzada, probe y diff; Ponytail off. Break UI omitido porque no se modifica interfaz.

### R0 — completada como referencia, producto con fallos previos

- [Inventario](docs/refactor-r0-r1/referencia.md): todos los métodos/rutas API con acceso y fuente; páginas/layouts con servicios importados; huecos HTTP de lecturas RSC, matriz funcional por rol y fixtures/escenarios de aceptación.
- `pnpm test`: dominio **81 pasan** (9 archivos). Web **25 fallan, 142 pasan y 2 omitidos** (11 archivos fallan, 35 pasan). Fallos de timeouts, hooks, RESTRICT al limpiar y unicidad de membresía; no atribuirlos sin diagnóstico a una sola causa. Las integraciones sí cargaron variables; los dos omitidos son de foto tras fallo de preparación. [Log](docs/refactor-r0-r1/resultados.md#tests).
- `pnpm typecheck`: **pasa** dominio/web. [Log](docs/refactor-r0-r1/resultados.md#tipos).
- `pnpm --filter web lint`: **falla**, 21 errores y 1 warning. [Log](docs/refactor-r0-r1/resultados.md#lint).
- `pnpm build`: **interrumpido por SIGTERM**, sin resultado de compilación ni CSS; no verde. [Log](docs/refactor-r0-r1/resultados.md#build).
- No se ejecutó smoke visual/autenticado ni dispositivo. No hay medidas fiables de bytes/latencia por el build interrumpido y ausencia de captura de red. Se fija presupuesto relativo de no regresión en mismo entorno/dataset; medición reproducible obligatoria antes del corte R6. No inventar valores p50/p95. Los checks se lanzaron en paralelo; posible contención, causa no aislada.

### R1 — completada como decisión y validación aislada

- [TRD §2](docs/trd.md) fija responsabilidades, contrato Zod → Fastify/OpenAPI → tipos generados/fetch, DTO públicos, caché/invalidación, versiones compatibles por metadatos, auth y transporte web/móvil. Compatibilidad de rangos no acredita build conjunto.
- [Probe](docs/refactor-r0-r1/auth-probe.mjs) ejecutado con Better Auth **1.7.22** fuera del monorepo: dos ámbitos admiten mismo email real no verificado; DNI/usuario y contraseñas independientes; siete rutas de correo/autoregistro bloqueadas por HTTP (404). [Resultado](docs/refactor-r0-r1/resultados.md#probe-de-identidad). Sin callback/transporte de correo. Esto valida encaje de biblioteca, no su integración de producción.
- Identidad resuelta: socio y staff conservan cuentas de negocio y permisos excluyentes, con ámbitos/tablas/cookies distintos. Correo obligatorio por cuenta; sin email sintético, acceso por correo, envío/recepción/verificación/recuperación. Staff no admite identificador con `@`. Email no prueba propiedad ni enlaza permisos. Reset/baja revoca sesiones de la cuenta afectada sin alterar su otra cuenta.
- PRD, TRD, app-flow, design-system y hoja de ruta coordinados: actual Next/Prisma/JWT separado del destino; biblioteca paginada y concurrencia sin excepción de sobreconsumo; móvil todos los roles tras R6; Docker local incluido y alojamiento pendiente. Grilling intacto.
- No se instalaron dependencias del destino en el repo ni se crearon paquetes/infraestructura de R2. Aceptación posterior obligatoria: adapter Drizzle/Postgres, atomicidad del alta, revocación, concurrencia de intentos, CSRF y aislamiento de ámbitos en R3/R4; Expo/SecureStore en dispositivo en R7. Estos tests no se presentan como superados por el probe de memoria.

Próximas entregas y criterios: [secuencia vigente](docs/hoja-de-ruta.md#refactor-previo-a-expo--secuencia-vigente). R2 debe dejar clon limpio operativo local y DB de tests aislada; R3 debe migrar/sembrar y probar invariantes; R4 debe completar API/auth/worker y contratos. No comenzar R5 sin las anteriores ni Expo sin R6. **R2 implementada según el cierre siguiente; sin commit ni push.**

## 11. Cierre R2 — entorno local Docker

Alcance SDD auto: clon limpio operativo sin Neon, datos de desarrollo persistentes, PostgreSQL de tests independiente, migración antes del arranque y seed/reset explícitos. Supuesto resuelto con R0/R1: se ejecuta Next/Prisma vigente hasta sustituirlo en R3–R5; no se crean API, worker ni paquetes vacíos. Revisión de requisitos y cruce especificación/plan/tareas: sin conflictos con las decisiones previas. Ponytail full aplicado solo a implementación; break-ui omitido porque no hay cambios de UI.

Tareas implementadas:

- Compose con PostgreSQL 17.6, volumen `feet-local_dev-data`, puertos loopback, healthcheck SQL, migración de una ejecución y Next con comprobación HTTP de `/login`.
- Dockerfile Node 22.23.1/pnpm 11.16.0, instalación frozen, generación Prisma y recarga con Compose watch. El contexto excluye secretos y archivos Neon.
- Configuración explícita por servicio desde `infra/local.env.example`; ejemplos para Compose y herramientas de host; comandos `local:up/dev/down/logs/migrate/seed/test/reset` en la raíz y README.
- PostgreSQL de tests en otro contenedor, usuario, base, puerto y almacenamiento temporal. Vitest deja de cargar `.env` de desarrollo y exige `TEST_DATABASE_URL` local a `feet_test`; sin ella omite integración. El servicio test migra únicamente esa base.
- Reset limitado al proyecto Compose `feet-local`, con argumento obligatorio `--confirm-local-data-loss`; parada normal conserva desarrollo. No se han leído secretos, ejecutado servicios Neon, borrado recursos remotos ni alterado el trabajo previo.

Dependencias pendientes: R3 cambia migrate/seed a Drizzle y prueba el modelo destino; R4 añade Fastify con health/readiness diferenciados y el worker real, retirando el cron al sustituirlo; R5 añade Vite y proxy `/api`; R6 retira las dependencias/configuración históricas de Neon/Vercel. La comprobación HTTP actual no certifica readiness de la futura API. No se inicia R3, no se hace commit ni push.

Verificación R2 (convergencia, Ponytail desactivado):

- `docker compose --env-file infra/local.env.example config --quiet` y `git diff --check`: correctos.
- `pnpm local:up`: imagen construida desde instalación frozen, 19 migraciones aplicadas, PostgreSQL y Next saludables; HTTP `/login` devuelve 200. Imagen inspeccionada sin `.env` privados ni `neon.ts`.
- `pnpm local:seed`: correcto, un admin creado. `local:down` y nuevo arranque sin reconstrucción conservan ese admin; migrate vuelve a terminar correctamente sin reaplicar migraciones.
- `pnpm local:test`: 81 tests de dominio y 169 web pasan, incluyendo 37 de integración sobre `db-test`; sin omisiones. `pnpm test` sin URL: 213 pasan y 37 de integración se omiten, sin cargar credenciales de desarrollo. URL remota ficticia rechazada por configuración antes de ejecutar tests.
- `pnpm typecheck`: correcto. Reset sin confirmación rechazado; `pnpm local:reset --confirm-local-data-loss` correcto y volumen local ausente después. La composición queda parada y sin datos de esta verificación.
- Recarga watch configurada; no se realizó interacción manual de edición ni revisión visual (sin cambios de UI). API/worker/Drizzle/Vite pendientes explícitamente de sus fases, no certificados por estos checks.

R2 cerrada para las implementaciones existentes. Detención antes de R3; sin commit ni push. stop ponytail / normal mode.

## 12. R3 — avance de persistencia, abierta en ese corte (superado por §14)

Workflow 01 aplicado con SDD auto: anclaje en PRD/TRD, decisiones R1, esquema y las 19 migraciones Prisma; aceptación: nueva DB, migración inicial, seed, consultas acotadas y concurrencia real. Plan/tareas: reconstruir esquema final → añadir identidad R1 → migración/seed → portar persistencia → verificar y retirar consumidores sustituidos. Cross-check: no cambiar reglas puras ni empezar HTTP/worker R4. Ponytail full durante implementación; sin UI, break-ui no aplica. Convergencia parcial con Ponytail desactivado: **no se cierra R3**.

Implementado en `packages/db`: Drizzle ORM 0.45.4, Kit 0.31.11 y pg 8.23.1; pool limitado/cierre, migrador con bloqueo asesor entre procesos, 16 tablas de negocio y ocho de Better Auth. Migración inicial generada con snapshot para evolución. El vínculo `(auth_realm, auth_user_id)` es único; dos columnas generadas y FK garantizan existencia en el ámbito correspondiente y un check exige rol coherente. Email/username solo viven en auth; se eliminan del nuevo modelo hash, JWT/tokenVersion y duplicación de contacto. No se ha integrado aún el adapter Better Auth.

Se reconstruyeron las 19 migraciones Prisma sobre **feet_test local**, y se introspectó el resultado antes de escribir el destino. Se conservan cuatro índices únicos parciales, relaciones y sus acciones de borrado/actualización, cinco checks de negocio, bytea, fechas locales y timestamps con zona. La introspección de Kit produjo opclasses incorrectas en algunos índices compuestos; se retiraron las declaraciones explícitas para que PostgreSQL elija las correctas. Crédito negativo sigue permitido (`quantity <> 0`); no aplicar el antiguo check positivo. Las transformaciones históricas de títulos, sedes, slugs y ejes de tarifa ya están representadas por el modelo final, sin ejecutar esos backfills en la nueva inicial.

Portado: consumo agregado SQL (sin historial en memoria), reserva con bloqueo clase → socio/relectura, ocupación agregada, solape acotado, cupo/bono y ajustes del periodo usando dominio puro; cancelación con relectura y devolución. Seed determinista e idempotente **de catálogo** (sede, tipo y tarifa); todavía falta provisionar cuentas/credenciales y fixtures completos.

Verificación ejecutada con PostgreSQL **17.6** del servicio aislado `db-test`, puerto host **55439** (54330 no disponible). El runner exige URL local con nombre **feet_test** antes de recrear únicamente sus schemas `public`/`drizzle`; no se reseteó feet_dev ni otra base. Comando:

```sh
TEST_DB_PORT=55439 docker compose --env-file infra/local.env.example --profile test up -d --wait db-test
TEST_DATABASE_URL=postgresql://local_test:local_test_password@127.0.0.1:55439/feet_test pnpm --filter @78feet/db test
```

- Pasa creación desde cero, segunda ejecución de migraciones, seed repetido, cuatro índices parciales, seis checks (incluido ámbito/rol), correo compartido entre ámbitos, FK de identidad, correcciones negativas de crédito y rollback.
- Pasan carreras reales de membresía vigente, última plaza, último cupo entre clases, último bono y doble cancelación. Se comprueba un único ganador y saldo final en cupo/bono.
- `pnpm --filter @78feet/db typecheck`, `drizzle-kit check`, `git diff --check`: pasan. Dominio: **81 tests pasan**, sin cambios en sus reglas.
- **No ejecutados/cubiertos:** cambio de tarifa durante reserva, login concurrente/revocación/alta atómica con adapter Better Auth, solapes entre sedes, edición/restauración de clase, generación repetida, planes EXPLAIN con datos representativos, suite completa web/build. No se consideran correctos por las pruebas anteriores.

Pendiente para cerrar R3: resto de consultas/proyecciones/listados/agregaciones y transacciones de persistencia, auditoría completa del orden de bloqueos (incluidas operaciones multiclase), seed con cuentas usando formato Better Auth real, integración del adapter para validar modelo y atomicidad, comparación automatizada completa del catálogo PostgreSQL y matriz restante de concurrencia/rendimiento. No comenzar R4 con esta fase abierta.

**Restos temporales identificados para R6:** `apps/web/prisma` (esquema, 19 migraciones y seed), cliente Prisma/imports en `apps/web/lib` y consumidores RSC/rutas, generación Prisma del Dockerfile, comandos migrate/seed/test de Compose y scripts web, JWT/argon2 propios y configuración Neon/Vercel. Siguen teniendo consumidores; retirarlos ahora rompería la web. Compose conserva el runtime R2; no apunta la aplicación Prisma a la nueva DB Drizzle. Al migrar cada consumidor se retira su persistencia anterior; R6 elimina el conjunto restante. No hay commit ni push, ni implementación HTTP R4. stop ponytail / normal mode.

## 13. Preparación R4 y ampliación autorizada de R3 — avance parcial (superado por §14)

El encargo pide completar R4 mediante workflow 01. Al contrastar el árbol se confirma que R3 sigue abierta: `packages/db` contiene esquema/auth-schema, conexión, migrador, seed de catálogo, consumo y reserva/cancelación; no los demás casos de uso. El usuario autoriza completar primero R3 y después R4. No se interpreta esa autorización como cierre de R3.

[Entregas funcionales y aceptación](docs/refactor-r4/entregas.md): E0 persistencia R3 → E1 identidad → E2 perfil/calendario/reservas → E3 socios/cobros/equipo → E4 operación/configuración/biblioteca → E5 cierre de contratos/cliente → E6 worker → E7 convergencia. El contrato se construye desde E1 junto a cada operación. Se incluyen lecturas RSC, sustitución de consumidores de auth antes de retirar JWT y retirada del cron al activar worker. R5 permanece fuera de alcance.

Implementación de este corte: se amplía `packages/db/src/integration.test.ts` con carrera de clases solapadas entre sedes, comprobación del error OVERLAP y consumo final, cancelación ajena rechazada sin cambio de estado, cancelación propia tardía con rollback y cancelación staff sin devolución que mantiene el consumo. No cambia la lógica de negocio ni incorpora otro runtime.

Evidencia ejecutada:

- `TEST_DB_PORT=55439 docker compose --env-file infra/local.env.example --profile test up -d --wait db-test`: saludable; únicamente PostgreSQL aislado local.
- `TEST_DATABASE_URL=postgresql://local_test:local_test_password@127.0.0.1:55439/feet_test pnpm --filter @78feet/db test`: pasa, incluida creación desde cero/replay/seed, restricciones y carreras previas, más los cuatro escenarios nuevos. El runner recrea solo `feet_test`.
- `pnpm --filter @78feet/db typecheck`: pasa.

**Trabajo incompleto:** no se cierra R3 ni R4. Siguen pendientes los casos de uso y consultas restantes de R3, auditoría de bloqueos y pruebas de tarifa concurrente/edición/restauración/EXPLAIN; después Better Auth real y revocación, Fastify y permisos por operación, validación/DTO/OpenAPI, cliente generado, worker y sustitución de auth/cron. Estas piezas no están implementadas ni verificadas por las pruebas anteriores. No se ejecutó suite completa/build ni smoke web; no hay cambios de UI. No se inició R5 ni se hizo commit/push. stop ponytail / normal mode.

## 14. R3 — cierre de persistencia del destino

Se retoma la autorización R3 → R4. Los casos de uso extraídos viven ahora en `packages/application`; `packages/db` conserva esquema, conexión y migraciones. La API y el futuro worker pueden consumir los mismos casos sin importar Next. El runtime Next/Prisma anterior sigue sin mezclarse con la base Drizzle: sus consumidores se sustituyen durante el corte de runtime, y no se certifican como migrados por este cierre.

Implementado: reserva/cancelación/consumo; tarifa, créditos, ajustes, baja/reactivación; identidad y credencial Better Auth atómicas, reset/revocación por ámbito y seed de admin; extra/edición/cancelación/recuperación/restauración; horario/cierres y materialización; publicación de plantilla con propagación del dominio; biblioteca/fases/bloques y confirmaciones; catálogos/slugs; pagos/sede histórica; perfil/contacto/preferencias e imágenes privadas; proyecciones, opciones y listados paginados/ordenados, calendario/detalle/historial/resumen/impagos. La validación HTTP, DTO de salida y permisos por ruta se verifican en R4, no por existir estas funciones.

[Auditoría de bloqueos](docs/refactor-r3/bloqueos.md): sede → clases ordenadas → socios ordenados en operaciones multiclase; clase → socio en reserva/cancelación; tarifa/baja solo modifican reservas tras bloquear socio, sin adquirir clases. Sede usa NO KEY UPDATE para permitir el KEY SHARE de las FK de preferencias/sede de pago y evitar el ciclo sede/socio. Biblioteca coordina nombres y sedes antes de tocar clases/entrenamientos.

[Evidencia reproducible](docs/refactor-r3/verificacion.md): `TEST_DATABASE_URL=postgresql://local_test:local_test_password@127.0.0.1:55439/feet_test pnpm test:db` pasa sin omisiones, con PostgreSQL local 17.6. Incluye reconstrucción de las 19 migraciones en un schema temporal y comparación completa de columnas de negocio, FK/acciones, PK, checks, índices y predicados. Diferencias explícitas: identidad Better Auth y generación UUID en PostgreSQL en lugar de Prisma cliente.

Pasan carreras de última plaza/cupo/bono, doble cancelación, solape entre sedes, correcciones de crédito/ajuste, tarifa/reserva, baja/reserva, edición de aforo/reserva, restauración/reserva, nombres normalizados y materialización simultánea/repetida. Se comprueban rollback, estado final, devoluciones y no resurrección de reservas/sesiones. Adapter Better Auth real: acceso username, mismo correo entre ámbitos, contraseñas independientes, siete rutas HTTP bloqueadas, reset revoca sesión, alta fallida no deja identidad huérfana. Seed de catálogo/admin repetido no duplica cuentas.

Consultas verificadas con fixture temporal de 505 cuentas y 6011 reservas: páginas de 25 y orden antes de paginar, calendario y resumen/impagos. EXPLAIN ANALYZE/BUFFERS ejecutado para calendario, consumo e impagos; tiempos concretos en el log, sin presentarlos como p50/p95 o benchmark de producción. El fixture se revierte. Dominio: 81 tests pasan. Typecheck de DB/aplicación y `drizzle-kit check` pasan.

**R3 cerrada para la persistencia del destino.** Pendientes propios de R4: montaje Fastify, auth HTTP con bloqueo concurrente de intentos/CSRF/roles, todas las operaciones y DTO públicos, OpenAPI/cliente, worker y corte de auth/cron anteriores. No se certifican todavía suite web, build, smoke ni migración de consumidores. No se inició R5 ni se hizo commit/push.


## 15. Detención solicitada tras cerrar R3

El usuario pide detener R4 y documentar R3. **R3 queda completada para la persistencia del destino**, con alcance, comandos y evidencia en §14. README, TRD y hoja de ruta reflejan este cierre; §§12–13 se conservan como cortes históricos, no como estado vigente.

**R4 iniciada y detenida, sin cierre funcional.** Quedan `apps/api/src/auth.ts` (factoría y borrador de acceso/sesión/logout Better Auth) y `packages/contracts/src/index.ts` (DTO Zod iniciales), manifiestos y dependencias instaladas/lockfile. El typecheck del borrador API pasó antes de la detención; no demuestra comportamiento HTTP ni autorización. No existen aún `main.ts`, servidor Fastify montado, rutas completas, OpenAPI generado, cliente generado ni worker. Los scripts declarados para esos archivos ausentes son preparación incompleta y no comandos operativos. `packages/api-client` solo es un directorio vacío, sin paquete o implementación.

Estos borradores no se activaron ni conectaron a Compose. Siguen activos únicamente la autenticación y el cron anteriores; la sustitución y retirada coordinada siguen pendientes en R4. No se ha ejecutado suite web/build/smoke en este cierre ni se presentan como correctos. No empezar R5. No se hizo commit ni push. stop ponytail / normal mode.


## 16. Preparación de guardado solicitada

El usuario autoriza commit y push del estado acumulado, con R3 cerrada y R4 detenida. Los ejemplos de entorno quedan sin valores conforme a `docs/git-flow.md`; Compose toma `infra/local.env`, ignorado por Git, preparado localmente desde el ejemplo. Antes del primer arranque en otro clon hay que copiar y completar ese archivo. Las evidencias publicables se conservan en `docs/refactor-r0-r1/resultados.md` y `docs/refactor-r3/verificacion.md`; los logs originales siguen locales e ignorados. Este ajuste no activa R4 ni inicia R5.


## 17. R4 — API, identidad, contratos y worker completados

Se completa el encargo mediante workflow 01 (SDD auto → implementación Ponytail full → break-ui + fix del acceso/contacto → convergencia con Ponytail off). [Entregas E0–E7, dependencias y aceptación](docs/refactor-r4/entregas.md); [evidencias reproducibles y límites](docs/refactor-r4/verificacion.md).

Fastify sirve todas las operaciones anteriores salvo cron, retirado, y las lecturas que antes solo hacían RSC: 81 operaciones OpenAPI con ID único. Zod valida entradas y DTO públicos de salida; cliente generado reproducible con credenciales, abort, errores tipados y sin reintentar mutaciones. Perfiles/imágenes privadas, calendario/reservas, socios/tarifas/pagos, equipo, sedes/horario/tipos, plantillas/clases y biblioteca consumen los casos de uso/transacciones R3.

Better Auth/Drizzle es la única autenticación vigente: ámbitos member/staff, selector Socio/Equipo, correo real obligatorio, contraseñas independientes, sesión absoluta 90 días, bloqueo persistido, rol/estado por petición y revocación servidor. Se retiraron JWT/argon2 propios y handlers/servicios Prisma. Next conserva únicamente la presentación y consulta Fastify por HTTP; el cambio a SPA corresponde a R5.

Worker independiente con ejecución al arrancar y 03:15 Europe/Madrid, liderazgo PostgreSQL, reintentos, cierre y replay idempotente comprobados sin API HTTP. Se eliminaron ruta y configuración Vercel Cron. Compose migra Drizzle, siembra admin Better Auth y arranca DB/API/worker/web; web no recibe secretos DB/auth.

Pasan batería PostgreSQL completa sin omisiones (dominio 81 tests, aplicación/catálogo, API con 89 denegaciones de rol, worker y web 103 tests), typecheck, generación reproducible de contratos, build/CSS y smoke HTTP/SSR de 34 lecturas con cuentas por rol, fichas, biblioteca/clase y reserva real. Carreras de login/reset/baja, última plaza/cupo/bono, errores, imágenes privadas y materialización independiente verificadas. Caída real de PostgreSQL: API viva con health 200/readiness 503 y recuperación a 200 sin reinicio; worker recupera y libera liderazgo al parar. Los comandos y el detalle de cada garantía están en la evidencia R4.

**R4 cerrada.** Pendientes explícitos en ese corte: lint global heredado (19 errores/1 warning; sin supresiones), validación visual completa/mediciones y limpieza histórica R6, SPA R5, dispositivo Expo R7 y hosting/backups R8. No se declara cumplido todavía el hito «web recuperada» de R6 ni se marcan sus checks globales. El smoke HTTP no acredita interacción visual ni Android. Sin recursos remotos modificados y sin commit ni push de ese encargo. El estado de la web posterior está en §18. stop ponytail / normal mode.

## 18. R5 — SPA sobre la API

Workflow 01 (SDD auto, Ponytail full en la implementación, convergencia con Ponytail off). No se inicia R6 ni Expo. No hay commit ni push.

`apps/web` deja de ser Next y pasa a ser la SPA Vite 8.3.8 + React Router 8.5.1. TanStack Query 5.107.1 posee las lecturas; las claves incluyen cuenta y los filtros de la URL. Salir o entrar vacía la caché. Las mutaciones no se reintentan e invalidan el alcance que cambian: reserva (calendario, detalle, reservas, consumo), tarifa, pago, plantilla, horario/catálogo, roster y biblioteca. React Hook Form + Zod cubren el acceso y las altas de socio, equipo y sede, con el mensaje bajo el campo, los valores conservados si falla y el envío bloqueado. El resto de editores conserva esa misma conducta de campo con la validación que ya tenían. Las rutas de producto se mantienen y se dividen en imports dinámicos. La web no importa base de datos ni secretos; el navegador llama a `/api` y Vite lo reenvía a Fastify.

Entregas: acceso, shell y perfil; calendario, reservas, historial, biblioteca y tarifa del socio; Hoy, Semana, excepciones y ficha de clase; socios, pagos, impagos y cobros; equipo; sedes, horario, tipos, tarifas, plantilla y biblioteca de staff. Cada una carga, muestra error o vacío, y respeta el rol en la ruta.

Comprobado en este cierre: `pnpm --filter web typecheck`; `pnpm --filter web test` (104 tests); `pnpm --filter web build` con CSS de producción compilado y rutas en chunks separados. El contenedor `web` rehecho responde 200 en `/login` y en las URLs de producto; el proxy admite el login de admin, Hoy, el rechazo de resumen de socio (403) y el logout. No hubo navegador disponible para recorrer escritorio, móvil, teclado ni temas. No se declara el hito «web recuperada» de R6: siguen pendientes la retirada de restos Neon/Prisma históricos, el lint global que R4 dejó heredado, las mediciones y esa pasada visual. stop ponytail / normal mode.

## 19. R6 — corte y web recuperada

Workflow 01 (SDD auto, Ponytail full solo en la implementación, convergencia con Ponytail off). No se inicia Expo. No hay commit, push ni despliegue. No se borran recursos remotos.

Se retiran del árbol activo Prisma (esquema, migraciones, seed y la comparación que las reejecutaba), `neon.ts`, `.neon`, las dependencias `@neon/*` y los restos de Next en lint, directivas `use client`, prefetch ignorado e ignores. La web queda en ESLint sin `eslint-config-next`. El lockfile regenerado no instala Next, Prisma client ni Neon. Better Auth sigue trayendo `@better-auth/prisma-adapter` y Kysely porque su paquete los declara; 78feet no los importa y usa el adapter Drizzle.

La matriz R0 sigue cubierta por la API salvo el cron, que responde 404. El smoke local comprueba el shell de la SPA, las denegaciones por rol y una reserva real. La batería de `feet_test` recrea la base, migra dos veces, siembra y corre las carreras. El worker del Compose materializa con `created: 0` sobre datos ya presentes.

Cifras, comandos y límites: [verificación R6](docs/refactor-r6/verificacion.md). R0 no aportó una línea base de bytes ni de latencia; no se inventa el antes. La precarga inicial pesa 270363 B gzip y no incluye los editores. En el navegador se recorrieron login de admin, Equipo, redirección de rol, Hoy vacío en pantalla estrecha, foco, tema, un diálogo y el logout.

**R6 cerrada.** El hito «web recuperada» queda cumplido con los límites escritos en la evidencia. Expo es R7. El alojamiento es R8. stop ponytail / normal mode.
