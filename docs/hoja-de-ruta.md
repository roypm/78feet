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
| 7 | App Expo | pendiente | Seis pestañas del socio (incluye Historial y Biblioteca), mismo cliente de `@78feet/domain`, Android primero |

Fuera de esta lista (v1): pagos online, notificaciones, asistencia, lista de espera, iOS, Docker.

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
