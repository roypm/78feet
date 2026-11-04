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
| 7–20 | Auditoría de la web | pendiente | Decisiones en [auditoria-web](./auditoria-web.md); corte y orden en la sección de abajo |
| 21 | App Expo | pendiente | Seis pestañas del socio (incluye Historial y Biblioteca), mismo cliente de `@78feet/domain`, Android primero |

Fuera de esta lista (v1): pagos online, notificaciones, asistencia, lista de espera, iOS, Docker.

<a id="auditoria-web"></a>

## Auditoría de la web (llescas 7–20)

Qué hay que cambiar: [auditoria-web](./auditoria-web.md). Este bloque solo dice **cómo cortarlo** y **en qué orden**. El PRD y el TRD se actualizan **dentro** de la llesca que cambia producto o dominio, no en un PR de docs previo. El grilling original no se toca.

Una fila = una llesca = un PR. El «Hecho cuando» es la sección de la auditoría; no mezclar dos H2 distintas en el mismo merge, salvo que compartan el mismo patrón (los avisos de campo sí van juntos).

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
| 19 | Plantilla: duplicar y publicar por box | pendiente | Duplicar abre el alta copiando tipo, hora, aforo y coach del mismo día y box, sin guardar sola; Aplicar y Cancelar cambio afectan solo el box en pantalla |
| 20 | Excepciones: card | pendiente | Estado junto al nombre; segunda línea con box, día, hora, aforo y coach; sin pastillas a la derecha ni fila extra de modalidad |

Expo (llesca 21) espera a cerrar este bloque: el modelo de box y las reglas de la auditoría tienen que estar en dominio antes de copiarlos a móvil.

## Mantenimiento posterior a v1

| Tarea | Cuándo abordarla | Hecho cuando |
|---|---|---|
| Medir latencia de extremo a extremo de la propagación | Cuando haya una rama Neon de pruebas segura | Comparar guardado de plantilla con un conjunto representativo de clases y reservas, registrar tiempos y confirmar que se mantienen las reglas de cupo |

## Cuando toque desplegar (no saltar)

Hasta entonces: `main` local, commits cuando se pida, ramas cortas por llesca si hace falta. **No** abrir un GitFlow `develop` + `main` ahora.

Cuando Vercel (o un staging) entre en juego:

- **Git `main`** = lo que se despliega a producción. Trabajo en ramas cortas + PR, no commits a medio hacer en `main`.
- Rama git `develop` **solo** si hay un entorno de staging estable (preview Vercel + Neon no-prod) para que staff pruebe antes de producción.
- **Neon `production`** ≠ rama git. Esquema o seed que pueda romper datos: `neon checkout dev --create`, no un `develop` de git. Son dos ejes distintos.
