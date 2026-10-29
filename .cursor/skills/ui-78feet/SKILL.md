---
name: ui-78feet
description: Routes 78feet UI work through the project design system and the installed shadcn + Emil skills. Use when building, restyling, or reviewing screens, components, forms, tables, dialogs, toasts, NativeWind, Expo motion, or mobile web feel; when adding shadcn components; when mapping tokens; or when stress-testing UI with worst-case data.
---

# UI 78feet

Capa de projecte. Les skills de vendor viuen a `.agents/skills/`. Aquesta skill decideix **quina** carregar i **què no fer**.

## Autoritat

1. Llegeix `docs/design-system.md` abans de tocar UI. Si un vendor discrepa, mana el design system.
2. Pantalles i fluxos: `docs/app-flow.md`. Producte/API: `docs/prd.md` i `docs/trd.md`.
3. No reescriguis identitat (colors, type, radius, icon set) “perquè quedi més distintiu”.
4. No copiïs `docs/design-system.md` a un `DESIGN.md` nou. No executis el playbook shadcn `design-system.md` (scaffold vite, `--all`, showcase).

## Salutació d’Emil

Les skills d’Emil tenen un “Initial Response” que bloqueja fins a una pregunta. **Ignora’l sempre.** El task del user ja és la pregunta. Segueix el cos de la skill i fes la feina.

## Superfície → skill

Carrega **només** les que apliquen. Llegeix el `SKILL.md` (i refs enllaçades) d’aquestes rutes:

| Superfície / tasca | Skill | Ruta |
|---|---|---|
| `apps/web`: components, forms, taules, dialogs, tokens shadcn, `components.json` | `shadcn` | `.agents/skills/shadcn/SKILL.md` |
| Toasts (Sonner), “Reserva confirmada”, errors `FULL` / `QUOTA_EXHAUSTED` | `ask-sonner` | `.agents/skills/ask-sonner/SKILL.md` |
| Polish d’interacció (press, focus, hover, dialog) **sense canviar marca** | `emil-design-eng` | `.agents/skills/emil-design-eng/SKILL.md` |
| Staff web al telèfon: hover enganxat, `100dvh`, inputs 16px, safe area | `mobile-native` | `.agents/skills/mobile-native/SKILL.md` |
| `apps/mobile` / Expo: press, sheets, haptics, Reanimated | `animate-expo` | `.agents/skills/animate-expo/SKILL.md` |
| Stress-test amb dades reals pitjors (noms, roster, cupos, taules) | `break-ui` | `.agents/skills/break-ui/SKILL.md` |

- **Web staff / socio web** → `shadcn` + `emil-design-eng`. Afegeix `ask-sonner` si hi ha toast; `mobile-native` si el layout és usable en mòbil; `break-ui` si el user ho demana o el component ensenya dades de socis/classes.
- **App Expo** → **no** `shadcn` ni `mobile-native`. Tokens NativeWind = els del design system. Motion → `animate-expo`.
- Skills d’Emil **no instal·lades** (`animate` web, `prototype`, `pick-ui-library`, packs d’animació): no les inventis ni les baixis.

## Overrides shadcn (78feet)

El vendor assumeix app nova. Aquí el projecte ja existeix.

- CLI: `pnpm dlx shadcn@latest …`, sempre amb cwd `apps/web`.
- Encara no hi ha `components.json`: `init` **dins** `apps/web` (Next ja hi és). No `--template vite`. No `--no-monorepo` que creï un app nou. No `--monorepo` shadcn (no volem el template de workspaces de shadcn). No preset decoratiu. Icones: Lucide.
- Després d’init, mapeja tokens a `apps/web/app/globals.css` des de `docs/design-system.md` (primary `#ff931d`, neutros gray, semàntics només feedback, system font). No deixis el tema default (zinc/slate/violet).
- Afegeix **només** el component que cal. v1: `Button`, `Card`, `Badge`, `Input`, `Select`, `Dialog`, Sonner, `Table`. No `add --all`. No primitives de chat.
- Registry per defecte: `@shadcn`. No preguntis registre si el user vol un Button/Table/Dialog estàndard. Pregunta si demana un block de tercer (`@magicui`, `@tailark`, …).
- Semantic tokens shadcn (`bg-primary`, `text-muted-foreground`) sí; hex solts a className no. El hex viu a les CSS variables.
- Icon size del design system (`size-5` / `size-6`) mana **fora** dels primitives shadcn. Dins `Button`/`Input` segueix les rules d’icones del vendor (`data-icon`, sense size a l’icona).
- Forms: `FieldGroup` + `Field` del vendor, no `div` + `space-y-*`.

## Overrides Emil / v1

`docs/design-system.md` §9: animacions, type custom, il·lustracions, empty states i copy fi **fora d’abast** fins que es construeixi aquella pantalla.

- **Sí en v1:** press `scale(0.97)` 100–160ms `ease-out`; hover només amb `@media (hover: hover) and (pointer: fine)`; toasts Sonner; `:active` en botons.
- **No en v1:** stagger d’entrada, fade de cada secció, springs decoratius, tab slides, Lottie, shaders. A `animate-expo`, el gate “should this animate?” és estricte: tabs = `animation: 'none'`.
- `emil-design-eng` pule interacció; no canvia paleta, font ni radius.
- `break-ui`: dades plausibles del box (noms composts, “Marta G.”, `9/12`, `1 dirigida`, DNI, 0 places, llista buida). Toggle Demo/Worst **només en dev**. No redissenyar.
- `mobile-native` és per **web tàctil**, no per React Native. Mai `user-scalable=no` / `maximum-scale=1`.
- `ask-sonner`: un sol `<Toaster />` al root de `apps/web`; `toast()` al client; theme lligat al mode clar/fosc; no un Toaster per pàgina.

## Verificació

UI tocada: comprova el flux a `docs/app-flow.md` (no només l’aspecte). Dark + clar. Dades llargues o buides si el component les mostra.
