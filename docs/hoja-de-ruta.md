# Hoja de ruta — v1

Orden de las llescas hasta el producto del [PRD](./prd.md). El qué y el cómo mandan el PRD y el [TRD](./trd.md); este archivo solo dice **en qué orden** se construye y cuándo una llesca está hecha.

No sustituye al grilling ni se copia ahí. Si el producto cambia, se edita el PRD/TRD y luego esta lista.

Una llesca por pasada. Cada una deja el repo en un estado que se puede probar antes de pasar a la siguiente.

| # | Llesca | Estado | Hecho cuando |
|---|---|---|---|
| 0 | Esqueleto del monorepo | hecha | `apps/web` (Next.js) y `packages/domain` instalan, typecheckean y arrancan |
| 1 | Reglas de dominio | hecha | Vitest cubre cupo, bono, cancelación, solapes y materialización (TRD §9) |
| 2 | Prisma y sesión | hecha | Esquema migrado, login/logout/me, cookie JWT, seed del admin |
| 3 | Datos del box | hecha | Tarifas, socios, plantilla semanal y `ensureInstances` / cron |
| 4 | Reservar y cancelar | hecha | Socio y staff reservan/cancelan contra Postgres, con `FOR UPDATE` |
| 5 | Pantallas del socio (web) | hecha | Calendario, detalle, mis reservas, historial, mi tarifa — [app-flow](./app-flow.md) |
| 6 | Panel de staff | hecha | Hoy, semana, detalle de clase (roster y reservas staff), excepciones, catálogo de tipos de clase, socios, cuentas y perfiles de Equipo, impagos, horario semanal y excepciones por fecha del box, y Biblioteca (staff y socio) |
| 7–20 | Auditoría de la web | hecha | [auditoria-web](./auditoria-web.md); detalle por llesca en la sección de abajo |
| 21 | App Expo | pendiente | Socio, coach y admin, navegación nativa por rol, cliente API común, Android primero; requiere R6 |

Fuera de esta lista (v1): pagos online, notificaciones, asistencia, lista de espera, iOS en la primera entrega Android. Docker local está incluido en R2.

<a id="auditoria-web"></a>

## Auditoría de la web (llescas 7–20) — cerrada

Registro del delta y checklist de ejecución: [auditoria-web](./auditoria-web.md). **Bloque completado**; el producto vigente vive en PRD, TRD y app-flow. Las filas siguientes documentan qué llesca cerró cada parte de la auditoría (historial de construcción, no backlog).

Una fila = una llesca = un PR. El «Hecho cuando» era la sección correspondiente de la auditoría.

Dentro de un mismo grupo, el orden entre llescas es libre. No empezar el grupo siguiente si la cadena que lo desbloquea no está hecha.

### Independientes (7–16)

Van en cualquier orden entre ellas. No tocan el modelo de box. Se pueden hacer **antes** de Segundo box.

| # | Llesca | Estado | Hecho cuando |
|---|---|---|---|
| 7 | Avisos de los campos | hecha | Formularios del panel y del acceso avisan bajo el control; el globo nativo no se abre; el toast queda para el fallo del servidor |
| 8 | Campo vacío | hecha | El vacío se lee «—» en Equipo, Socios, fichas, Mi perfil del staff y la cuenta del socio |
| 9 | Migas | hecha | Solo el panel staff, solo pantallas que cuelgan de otra, en el hueco del encabezado; la sección es enlace y la página actual no |
| 10 | Equipo: alinear nombre | hecha | El nombre de Equipo se alinea con el avatar igual que en Socios |
| 11 | Socios: columna Tarifa | hecha | La celda muestra el nombre de la tarifa activa (truncado, nombre completo al posar); si es plan y hay bono, segunda línea «Bono · N» |
| 12 | Tarifas: cupo ilimitado | hecha | En plan semanal o mensual, cada cupo admite número, cero o Ilimitadas; el bono no; quien reserva no choca con un cupo ilimitado. Actualiza PRD/TRD |
| 13 | Tipos de clase sin imagen | hecha | La imagen no es obligatoria; con foto el bloque sigue igual; sin foto, superficie neutra con el nombre del tipo y el aforo. Actualiza PRD/TRD |
| 14 | Plantilla: coach fuera de la cajita | hecha | La cajita no muestra el nombre del coach; el lector de pantalla sí lo oye; el coach sigue en el formulario y en el detalle |
| 15 | Biblioteca: nombre y fases | hecha | Nombre opcional (si vacío, fecha Madrid, única); unicidad al guardar; se pueden quitar todas las fases y vuelven los dos botones. Actualiza PRD/TRD |
| 16 | Biblioteca: formulario | hecha | Cada entrada en Nuevo entrenamiento abre vacío; el último campo sube del todo por encima de la barra de Cancelar y Guardar |

### Cadena Segundo box (17–18)

Obligatoria y encadenada. La 18 no empieza hasta que la 17 esté hecha. Esquema o seed que pueda romper datos: rama Neon de dev, no `main` a ciegas.

| # | Llesca | Estado | Hecho cuando |
|---|---|---|---|
| 17 | Segundo box: datos | hecha | Existe el box como dato; lo de hoy es «Box 1»; horario, cierres, plantilla y clases son de cada box; tarifas, biblioteca, tipos y equipo siguen únicos; migración y tests de dominio. Actualiza PRD/TRD |
| 18 | Segundo box: producto | hecha | Selector y URL; admin crea y renombra en Horario; socio con box de pago y de preferencia; cupo de empresa y sin solape entre boxes; Excepciones lista todos; publicar plantilla solo el box en pantalla |

### Después de Segundo box (19–20)

No empiezan hasta que la 18 esté hecha. Dependen del box en datos o en pantalla.

| # | Llesca | Estado | Hecho cuando |
|---|---|---|---|
| 19 | Plantilla: duplicar y publicar por box | hecha | Duplicar abre el alta copiando tipo, hora, aforo y coach del mismo día y box, sin guardar sola; Aplicar y Cancelar cambio afectan solo el box en pantalla |
| 20 | Excepciones: card | hecha | Estado junto al nombre; segunda línea con box, día, hora, aforo y coach; sin pastillas a la derecha ni fila extra de modalidad |

Expo (llesca 21 / R7) espera a R6. Las llescas 0–20 son historial; no certifican que los checks actuales pasen.

## Mantenimiento posterior a v1

| Tarea | Cuándo abordarla | Hecho cuando |
|---|---|---|
| Medir latencia de extremo a extremo de la propagación | Cuando haya un entorno de pruebas representativo, distinto del local | Comparar guardado de plantilla con un conjunto representativo de clases y reservas, registrar tiempos y confirmar que se mantienen las reglas de cupo |

## Cuando toque desplegar (R8, no saltar)

Hasta entonces: trabajo local con Docker, commits cuando se pida, ramas cortas si hace falta. El alojamiento no está elegido. No se borran recursos remotos que ya existan y ningún comando de este repositorio los modifica.

- **Git `main`** será lo que se despliegue a producción. Trabajo en ramas cortas + PR, no commits a medio hacer en `main`.
- Una rama git de staging solo tiene sentido cuando exista un entorno de pruebas estable. Elegir ese entorno es parte de R8, no una instrucción actual.
- El esquema o el seed que pueda romper datos se ensaya en una copia desechable de ese entorno, no en la base que vaya a usarse en producción.

## Refactor previo a Expo — secuencia vigente

R0 y R1 cerradas como inventario/decisiones, con fallos previos registrados; no acreditan implementación del destino. [Plan y aceptación](../PLAN-REFACTOR.md), [evidencia R0](refactor-r0-r1/referencia.md), [identidad y contrato R1](trd.md#21-identidad-better-auth-decisión-validada-r1-implementación-r3r4).

| Fase | Estado | Entrega y aceptación |
|---|---|---|
| R0 | cerrada | Inventario API/RSC/pantallas, fixtures, escenarios y checks con fallos/omitidos explícitos |
| R1 | cerrada | Identidad de dos ámbitos comprobada, sesiones/transporte/paquetes/contrato definidos y docs coordinados |
| R2 | completada (PLAN-REFACTOR §11) | Compose + Postgres fijado + health/readiness + variables y DB aislada; clon limpio arranca sin Neon ni secretos remotos; README reproducible |
| R3 | completada (persistencia destino; evidencias en PLAN-REFACTOR §14) | Drizzle, tablas auth por ámbito, 16 entidades, índices SQL, seed determinista; migrar DB vacía, rollback y concurrencia pasan en Postgres aislado |
| R4 | completada (PLAN-REFACTOR §17 y evidencia R4) | Fastify/auth/lecturas RSC/worker; matriz por método y rol, rutas email bloqueadas, reset/baja revocan, cero Next, OpenAPI/cliente reproducibles |
| R5 | completada (PLAN-REFACTOR §18) | SPA Vite: acceso/shell/perfil, socio, operación diaria, socios/pagos y configuración/plantilla/biblioteca, con lecturas, mutaciones, invalidación y permisos |
| R6 | completada (PLAN-REFACTOR §19) | Web recuperada, smoke por rol, mediciones del stack vigente, checks verdes y una sola implementación sin Next/Prisma/Neon/Vercel |
| R7 | pendiente | Expo por rol tras R6, Android real; no heredar aceptación de web responsive |
| R8 | pendiente | Elegir alojamiento, TLS, secretos, backups/restauración y ensayo antes de publicar; después iOS según prioridad |

Las menciones a Neon o Vercel en las llescas 0–20 describen cómo se construyó aquella web. No son instrucciones del sistema vigente. No se borran recursos remotos. R2–R6 están completas. La siguiente fase es Expo (R7). No se inicia en este corte.
