# R4 — aceptación de API, identidad, contratos y worker

Corte: 13/11/2026, sobre R3 cerrada. [Entregas y dependencias](entregas.md). Workflow 01 aplicado en auto; implementación con Ponytail full y convergencia con Ponytail off. R5 no iniciada; sin commit ni push de este trabajo.

## Resultado funcional

Fastify es el único backend HTTP. Las 72 operaciones inventariadas en R0 se contrastan automáticamente por método/ruta; se conservan todas salvo el cron retirado deliberadamente. El contrato final contiene 81 operaciones con operationId únicos, añadiendo lecturas RSC, opciones completas y readiness. `apps/api/src/r0-operations.json` conserva el inventario de contraste. La matriz recorre todas las operaciones protegidas sin sesión y con cada rol excluido: **89 denegaciones por rol**, además de las peticiones anónimas.

Incluye acceso, perfiles/preferencias, imágenes privadas, sedes/horarios, calendario y reservas propias/staff, resumen/historial, socios/tarifas/créditos/ajustes, pagos/sede histórica/impagos, equipo, tipos/imágenes, Hoy/Semana/excepciones, clases extra/modificación/cancelación/recuperación/restauración, publicación de plantilla y biblioteca/fases/bloques. Los casos de uso y el orden de bloqueos de R3 se reutilizan; no se reimplementan en handlers.

La presentación Next permanece hasta R5. Sus RSC consultan el cliente generado con cookies por petición y sin caché compartida; sus mutaciones usan el transporte común. Se retiraron handlers Next, conexión/servicios Prisma, JWT/argon2 propios y configuración/ruta Cron Vercel. No hay autenticación ni planificador anteriores activos. Las pequeñas funciones de `lib/box` restantes son tipos o utilidades de presentación, sin persistencia.

## Comprobaciones reproducibles

Preparar `infra/local.env` según README. Usar únicamente DB local de tests `feet_test`: los runners recrean sus schemas. El puerto 55439 se usó en este equipo porque el habitual 54330 estaba ocupado; no forma parte del contrato.

| Comando | Resultado observado |
|---|---|
| `TEST_DATABASE_URL=... pnpm verify:backend` | Pasa: dominio (9 archivos, 81 tests), catálogo Drizzle, aplicación PostgreSQL, API, worker y web (27 archivos, 103 tests); sin casos omitidos |
| `TEST_DATABASE_URL=... pnpm --filter @78feet/api test` | Pasa tras conservar los estados 201 originales de créditos y ajustes; pruebas detalladas debajo |
| `pnpm typecheck` | Todos los paquetes y aplicaciones pasan |
| `pnpm contracts:generate` y `pnpm contracts:check` | OpenAPI/tipos regenerados reproduciblemente, sin diferencias |
| `pnpm --filter web build` | Compilación, tipos Next y comprobación de CSS de producción pasan |
| Compose build + `up -d --no-build --wait web worker` | Migrador termina con éxito; PostgreSQL/API/web/worker saludables |
| `pnpm local:seed` | Catálogo/admin con credencial Better Auth real; ejecución local correcta |
| `pnpm local:smoke` | 34 lecturas HTTP/SSR por rol, fichas y detalles, creación de biblioteca/clase y reserva real; proxy/cookies y restricción coach correctos; cron 404 |
| `git diff --check` | Sin errores de espacios |

`local:smoke` crea cuentas, entrenamiento y clase ficticios en la composición local; exige origen HTTP localhost/127.0.0.1, no imprime credenciales y no debe ejecutarse contra otro entorno. La reserva usa un socio nuevo; busca un hueco libre en el horario del catálogo local. No sustituye una prueba de interacción en navegador.

### Identidad, autorización y errores

`apps/api/src/integration.test.ts` usa Fastify real y PostgreSQL sin mocks en los casos de negocio; el caso de readiness inyecta un fallo de execute. También se ha parado PostgreSQL realmente en Compose como se detalla debajo. Comprueba:

- Better Auth con adapter Drizzle; cookies HttpOnly/SameSite y Secure en HTTPS; duración absoluta de 90 días y ausencia de refresh.
- Mismo correo en ambos ámbitos, contraseñas independientes, rol actual de negocio y rechazo de sesión ausente, malformada, ambigua, caducada, revocada o cuenta inactiva.
- Rutas de email/autoregistro/recuperación no montadas (404); campo de rol inyectado rechazado; no se devuelven hashes, contraseñas ni tokens.
- Origen autorizado web/nativo y rechazo de origen ausente/ajeno en mutaciones; límite adicional por IP (429) y diez fallos concurrentes por cuenta con bloqueo persistido.
- Reset/login y baja/login concurrentes: no sobrevive sesión posterior al reset/baja; revocación limitada a la cuenta elegida. Reactivar no resucita sesiones. Logout invalida también la sesión del servidor.
- Lecturas completas y opciones, validación de entrada/salida, imágenes multipart por firma y tamaño, acceso a foto propia/ajena según relación y rol; DTO sin datos privados.
- Confirmaciones, conflictos y códigos de dominio; conflicto SQL sin detalles internos; 400/401/403/404/409/413/415/429/500 según contrato; readiness 503 ante DB no disponible.
- Carreras HTTP de última plaza, último cupo y último crédito: una sola reserva vencedora, estado final y saldo correctos. Rollback, solapes entre sedes, tarifa/reserva y edición/restauración concurrentes se vuelven a ejecutar en la suite de aplicación R3.
- Cliente generado con credenciales, uploads Blob y multipart sin imagen opcional, AbortSignal, errores tipados y ausencia de reintentos automáticos de mutaciones.

### Materialización independiente

El test de API arranca el ejecutable worker como proceso separado, con solo DATABASE_URL. Crea una plantilla directamente en DB, comprueba que se materializa sin API/HTTP/cron y que la segunda pasada deja el mismo número de instancias. Mantener otro advisory lock demuestra que una réplica en espera no programa. La suite R3 prueba materialización repetida y simultánea con restricciones y rollback.

`apps/worker/src/worker.test.ts` comprueba la próxima ejecución a las 03:15 de Madrid en ambos cambios DST, tres intentos acotados y cancelación por señal. El proceso continuo recupera al arrancar, mantiene liderazgo en conexión dedicada, espera 30 segundos tras agotar reintentos y libera pool/lock al cerrar. Compose reinicia si pierde conexión. `/api/v1/cron/materialize` responde 404 y `apps/web/vercel.json` se eliminó. Heartbeat disponible para healthcheck sin servidor HTTP.

## Caída real y recuperación local

Tras reconstruir la imagen con la corrección del pool se detuvo `db` con Compose: `/health` siguió en 200 y `/ready` devolvió 503. Al arrancar PostgreSQL volvió a 200 sin reiniciar API (RestartCount 0). Esta prueba descubrió y corrigió el error de conexiones pg inactivas que podía terminar el proceso; los errores de consultas/transacciones siguen rechazando sus promesas. API tiene además restart policy en Compose.

El worker recuperó tras la caída. Al detenerlo se comprobó cero locks de liderazgo `(78,40)`; al arrancarlo de nuevo, exactamente uno y health saludable. Se repitieron batería completa en Docker y host, tipos, contratos y smoke después del corte. Se verificó en la imagen que `infra/local.env` no existe.

## Break-ui + fix del cambio de acceso/contacto

Superficie: selector Socio/Equipo (dos valores fijos), identificador (contrato 1–256), contraseña (mínimo de alta/reset del dominio, sin truncado adicional al entrar), email real obligatorio en altas/ediciones, foto propia opcional y errores de API. Se conserva el diseño vigente.

| Hallazgo | Dato límite | Corrección y comprobación |
|---|---|---|
| Desacuerdo entre formularios antiguos y nueva identidad | Email vacío/opcional | Email required en altas y perfiles de socio/equipo; Zod exige email real y trim |
| Identificador largo o con espacios | Usuario compuesto y DNI en minúsculas | Input de ancho contenido y máximo 256; normalización uniforme; DNI presentado canónico en mayúsculas |
| Posible límite de contraseña distinto al alta | Contraseña aceptada por dominio | Sin maxlength artificial en login ni restricción nueva que impida entrar |
| Actualización de foto/preferencia desde servidor | URL nula/cambiada, una o varias sedes | Estado local derivado del origen de props; fallback de avatar y selector con nombre truncado conservados |

Fixture de desarrollo: `/dev/access-fixture?data=demo` y `?data=worst`, usando LoginForm real. Está cerrada con notFound en producción. Los inputs desplazan texto internamente, el selector conserva etiquetas breves y los botones conservan el estado pendiente. Revisión por código/CSS y render HTTP, **sin inspección visual de navegador, zoom o dispositivo**; no se afirma haber certificado esos aspectos. No hay decisiones visuales nuevas pendientes en R4.

## Pendientes reales y límites

- El lint global conserva **19 errores y 1 warning previos** en `use-template-draft.ts`, `form-control.tsx`, `sidebar-liquid-menu.tsx`, `new-training-visit.tsx` y el import sin uso de `class-roster-panel.tsx`. R0 registraba 21 errores y 1 warning. Se corrigieron dos errores de estado sincronizado en foto/preferencia afectados por la integración. El lint focalizado de los archivos modificados de acceso/contacto/transporte pasa. No se han silenciado reglas ni se presenta el lint global como verde; su cierre y aceptación visual global siguen en R6.
- R5: SPA Vite/Router/Query y sus estados/invalidation pendientes; Next es la presentación vigente. R6: limpieza histórica y medidas/smoke visual completo. Se conservan migraciones Prisma solo para contraste R3; Better Auth/Drizzle aún instalan peers transitivos Prisma, sin uso ni generación de cliente en nuestros comandos. Restos de configuración Neon no usados localmente pendientes de retirar.
- R7: cliente Expo, almacén seguro de cookies e imágenes en dispositivo real pendientes; el test HTTP de origen nativo no equivale a aceptación Android.
- R8: hosting, TLS desplegado, backups/restauración y operación remota pendientes. Esta entrega solo prueba el entorno local y cookie Secure con origen HTTPS en integración.
- El rate limit por IP reside en memoria por proceso; el bloqueo por cuenta persiste en PostgreSQL. No se afirma un límite IP distribuido.

Los logs completos de esta ejecución están fuera del repositorio en `/tmp/78feet-r4-*`; este documento y las pruebas versionables conservan comandos, alcance, resultados y limitaciones sin publicar secretos. Los contenedores locales quedan disponibles con datos ficticios; no se borraron ni modificaron recursos remotos.
