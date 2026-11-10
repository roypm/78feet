## Setup Roy
Optional resources for AI-assisted work are installed in `docs/setup-roy/`. When the user names a resource or the task clearly fits the pack, inspect the installed tree and its available guidance, then read the relevant resources and follow those that apply. Use only paths that actually exist. Otherwise work normally.

## React / Next.js
Al crear, revisar o refactorizar código React/Next.js, leer `docs/setup-roy/skills/vercel-react-best-practices/SKILL.md` y aplicar las reglas pertinentes. Consultar los archivos de `rules/` que correspondan al cambio. Si hay diferencias, prevalecen la documentación del proyecto y la guía de Next.js instalada en `node_modules/next/dist/docs/`.

## Commits
`<emoji> <tipo>: <resumen en imperativo>`, ej. `✨ feat: calcular cupo semanal`.
Tabla de emoji por tipo en `docs/git-flow.md`.

## Documentación

**Convenciones (origen, no se editan).** `docs/grilling-results/convenciones-producto.md` y
`convenciones-tecnicas.md` son el resultado de grillear el plan inicial y tomar las decisiones de producto
antes de empezar a construir. Son el registro de origen.

**Documentos vigentes (fuente de verdad).** Si difieren del grilling, mandan estos; no copiarlos acá.

- `prd.md` — qué se construye, para quién, qué debe hacer.
- `trd.md` — arquitectura, stack, modelo de datos, cómo funciona por dentro.
- `app-flow.md` — pantallas y flujos del usuario.
- `design-system.md` — colores, tipografía, espaciado, componentes.
- `hoja-de-ruta.md` — orden de las llescas hasta v1, no el producto.
- `auditoria-web.md` — cambios cerrados sobre la web desplegada, antes de enseñar la v1. El corte y el orden están en la hoja de ruta (llescas 7–20), no aquí.

Leer PRD y TRD antes de tocar dominio, API, modelo de datos o pantallas.
Construir en el orden de la hoja de ruta; no saltar a pantallas si la llesca anterior no está hecha.
No editar los originales del grilling. Editar el original solo si lo pido explícitamente.

## UI

Fuente de verdad visual: [`docs/design-system.md`](docs/design-system.md).
Antes de tocar pantallas, componentes, estilos o toasts, seguir
[`.cursor/skills/ui-78feet/SKILL.md`](.cursor/skills/ui-78feet/SKILL.md).
Ahí se enrutan las skills de vendor (shadcn + Emil selectivo) en `.agents/skills/`.
No instalar packs extra de diseño sin pedirlo.
