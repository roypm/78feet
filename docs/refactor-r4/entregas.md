# R3 → R4: entregas y aceptación

Estado actualizado: R3 cerrada para la persistencia del destino (PLAN-REFACTOR §14); R4 iniciada y detenida por petición del usuario. Se autoriza completar primero R3. R5, commit y push fuera de alcance. Workflow 01: SDD auto; Ponytail full únicamente durante implementación; sin cambios de UI, break-ui no aplica.

## Especificación y cruce de requisitos

Recuperar todos los comportamientos del inventario [R0](../refactor-r0-r1/referencia.md), incluyendo sus lecturas RSC, mediante una única API. Las reglas son las del PRD/TRD y del dominio existente; las pruebas parciales de R3 no certifican los casos restantes. No considerar entregada una operación por existir su ruta: exigir validación, autorización, transacción, DTO público y prueba de errores/rollback.

No cambiar pantallas a Vite en esta fase. La sustitución de autenticación requiere actualizar los consumidores Next actuales para consultar Better Auth antes de eliminar JWT; eso es integración de R4, sin anticipar la SPA R5. API y worker comparten casos de uso y persistencia, nunca imports de Next. Un despliegue del worker exige retirar la configuración y ruta Cron anterior en la misma entrega.

## Dependencias y comprobaciones

| Entrega | Depende de | Resultado funcional | Comprobación obligatoria |
|---|---|---|---|
| E0. Completar R3 | R2 | Persistencia de las 16 entidades, consultas y transacciones vigentes; fixtures y seed; auditoría de bloqueos multiclase | PostgreSQL aislado: restricciones completas, rollback, última plaza/cupo/bono, solapes entre sedes, tarifa durante reserva, edición/restauración, EXPLAIN con datos representativos |
| E1. Identidad y acceso | E0; integración adapter puede verificar requisitos de E0 | Better Auth con ámbitos member/staff, alta administrativa atómica, DNI/usuario, sesión web y canal móvil, reset/baja/revocación, bloqueo de intentos | Roles excluyentes; mismo correo entre ámbitos; email/autoregistro/recuperación rechazados por petición directa; carreras de login/reset/baja; CSRF/origen; sin hashes/tokens en respuestas ni logs; eliminación de JWT y actualización de sus consumidores |
| E2. Perfil y calendario/reservas | E1 | Perfil por rol, preferencias, fotos privadas, sedes/horarios de lectura, calendario cuatro semanas, detalle/roster, reservas propias y staff, historial y resumen | Sin sesión/inactiva/revocada; foto propia/ajena; cupo compartido, cero/ilimitado, cancelación y devolución; errores estables; DTO y fechas Madrid |
| E3. Socios, cobros y equipo | E1, E2 | Altas/fichas, tarifa, créditos, ajustes, sede de pago, baja/reactivación, pagos/impagos, equipo y tarifas | Matriz coach/admin; atomicidad identidad-negocio; cambio tarifa cancela futuras y conserva bono; pagos informativos/histórico sede; filtros y orden antes de paginar |
| E4. Operación y configuración | E2, E3 | Hoy/Semana, excepciones, extra/modificar/cancelar/recuperar/restaurar, sedes, tipos/imágenes, horario/cierres, plantilla y biblioteca | Confirmación aforo/tipo/desvinculación; solo sede publicada y lunes siguiente; recuperación sin reservas; horario y solapes; fases/bloques ordenados; permisos coach/admin |
| E5. Contratos completos y cliente | Esquemas desde E1; cierre tras E4 | Zod → Fastify/OpenAPI → cliente generado reproducible; transporte común con credenciales, abort y errores | Comparar todas las operaciones del inventario y lecturas RSC; validación de entrada/salida, datos privados ausentes; regeneración sin diff; tipos/build; sin reintento automático de mutaciones |
| E6. Materialización y operación local | E0, E4 | Caso de uso compartido, worker independiente con ejecución inicial/diaria, reintentos acotados y cierre; Compose API/worker con readiness; retirada Cron Vercel | Repetición/concurrencia/reinicio, unicidad y rollback; zona Madrid/cambio horario; sin Cron ni HTTP para generar; un solo planificador activo; DB caída/readiness y cierre de pool |
| E7. Convergencia R4 | E1–E6 | Cobertura y documentación contrastadas, R4 cerrada con evidencias | Suite PostgreSQL sin omisiones, permisos por método, errores/contratos/concurrencia, OpenAPI/cliente reproducibles, arranque limpio local; pendientes explícitos, sin declarar R5 hecha |

Las entregas son unidades de aceptación, no paquetes vacíos ni implementaciones paralelas. E5 se construye junto a cada ruta; su posición indica cuándo puede cerrarse la cobertura completa. E0 aceptada según PLAN-REFACTOR §14; E1–E7 requieren aún sus comprobaciones HTTP y de operación. No activar auth o worker nuevos junto a los anteriores para aparentar progreso.

## Lecturas que requieren contrato explícito

Además de todos los métodos/rutas de R0: perfil propio y preferencias del shell; sedes autenticadas para socio/staff y horario por sede; resumen de socio para staff; pagos de socio y listado global paginados; tipos de filtro de biblioteca; opciones completas y acotadas de socios activos, tipos, coaches y entrenamientos vinculables; filtros/orden de equipo; ejes/horarios auxiliares de calendario y plantilla. Conservar `items/pageInfo` y campos adicionales, filtros URL y desempate ID. Una página de tabla no sustituye un selector completo.

## Estado de ejecución

- E0/R3 completada para la persistencia del destino; cierre y evidencias en PLAN-REFACTOR §14.
- Casos de uso reales en `packages/application`; esquema, pool y migración en `packages/db`.
- R4 detenida por petición del usuario. Borradores: `apps/api/src/auth.ts`, DTO iniciales de `packages/contracts`, manifiestos y dependencias. No están conectados al runtime.
- E1–E7 sin aceptación: faltan servidor/rutas HTTP, matriz de permisos y CSRF, contratos completos/OpenAPI, cliente generado, worker y sustitución coordinada de auth/cron anteriores.
- Los scripts API que apuntan a archivos todavía ausentes no son operativos. El directorio vacío `packages/api-client` no constituye una implementación.
- README, TRD y PLAN-REFACTOR §15 registran el punto para retomar. No se inició R5 ni se hizo commit/push.
