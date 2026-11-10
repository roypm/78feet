# Workflow 4 — Initialize a blank project from Starter with design skills

Use when setup-roy, `project-starter/`, `skills/frontend-design/`, and `skills/emil-design-eng/` are present in a new or blank project. This includes the full Project Starter integration from [Workflow 3](03-blank-project-starter.md), plus an initial design direction. One request = one initialization.

1. Read the starter instructions and documents, both design skills, and inspect the project root and `docs/`. Use the user's brief as product truth; surface missing product, audience, or purpose instead of inventing it.
2. Follow `frontend-design` to propose and critique a product-specific visual direction. Keep product behavior in the PRD, screen behavior in the app flow, shared visual rules in the design system, and implementation decisions in the TRD. Resolve conflicts with existing project decisions before changing them.
3. Follow `emil-design-eng` for relevant interaction guidance and, if UI is implemented or reviewed, its craft and review rules. If this request is documentation-only, record applicable guidance without claiming code was reviewed or built. Keep the agreed design system as the visual source of truth.
4. Complete Workflow 3's document and `AGENTS.md` integration, but remove the starter only after the design direction and relevant documentation are integrated. Preserve unrelated files and registry entries; if integration is incomplete, retain the scaffold.
5. Report changed files, the proposed or agreed design direction, unresolved decisions, and any work deferred. If the brief lacks facts needed for a visual direction, ask focused questions before proposing one.

Do not emit either skill's standalone initial-response greeting; continue this explicitly selected workflow. Run `break-ui` only if the user also asks for worst-case UI testing, and then follow its report-before-fix stopping point.
