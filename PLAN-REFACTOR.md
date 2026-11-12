# Plan de refactor de 78feet

Fecha de corte: 12 de noviembre de 2026. Estado: planificación; migración todavía no iniciada.

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

El árbol contiene numerosos cambios locales ya realizados. Forman parte del punto de partida, aunque no estén en un commit: filtros por slug, ordenación SQL, vacíos de listados, composición de UI, copia de horarios, agregación de consumo, consultas de ficha de socio, concurrencia y retirada de imágenes locales de prueba. No se descartan ni se reconstruye solo desde `HEAD`.

Antes de empezar la implementación se registrará `git status`, diff, versiones y resultados de comprobaciones. No hacer commit, push ni publicación sin petición. Los datos de desarrollo pueden recrearse; esto no autoriza a borrar recursos remotos ni otros entornos.

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

Cada fila se desglosará en una checklist por endpoint, lectura de servidor y pantalla antes de portarla. Las rutas API actuales no cubren necesariamente todas las lecturas usadas por los componentes de servidor: hay que inventariar ambos caminos.

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

R1 verificará la implementación de estas reglas, sin reabrir la elección de biblioteca:

1. Alta administrativa con correo real obligatorio; DNI de socio y usuario de staff como identificadores; acceso por email rechazado.
2. Roles excluyentes, sin autorregistro; el staff controla altas y resets.
3. Resolver explícitamente la unicidad de email de Better Auth frente a la persona con cuenta de socio y cuenta de staff. No exigir correos distintos ni fabricar direcciones sin una decisión de producto: comprobar un modelo de identidad que conserve ambos accesos y permisos, y documentarlo antes de fijar el esquema.
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

- [ ] Socio, coach y admin realizan todos sus flujos actuales y rechazan acciones ajenas a su rol.
- [ ] Calendarios, sedes, preferencia, horario, excepciones y borradores mantienen su semántica.
- [ ] Reservas, cambios de tarifa, cupos, bonos y concurrencia pasan con Postgres real.
- [ ] Socios, Equipo, Impagos, Cobros y Bibliotecas conservan filtros, orden, búsqueda local y páginas.
- [ ] Imágenes privadas y opcionales, tema, vacíos, errores, foco, diálogos y navegación funcionan.
- [ ] URLs actuales de producto siguen teniendo una ruta SPA directa válida; no se crean alias de legado.
- [ ] Materialización funciona al reiniciar y ejecutar dos veces; no depende de Vercel Cron.
- [ ] Instalación, migración, seed, tests, typecheck y build funcionan con instrucciones locales.
- [ ] No quedan imports ni comandos activos de Next, Prisma o Neon; tampoco mocks usados como backend real.
- [ ] Documentos vigentes describen el sistema implementado y distinguen Expo pendiente.

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

Primer trabajo ejecutable al aprobar este plan: R0, seguido de la validación de integración de Better Auth y actualización coordinada de documentación en R1. Este archivo entrega la planificación solicitada; no afirma que Compose, Fastify, Drizzle o la SPA estén implementados ni que las comprobaciones del producto se hayan ejecutado en esta sesión.
