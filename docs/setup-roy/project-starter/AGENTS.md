# Project documentation

Before planning or implementing a task, identify which documents are relevant and consult only those. Consult additional documents if the work reveals a dependency, conflict, or unresolved decision.

- `docs/prd.md` — Product purpose, users, scope, permissions, and business rules. Source of truth for expected product behavior.
- `docs/app-flow.md` — Screens, navigation, user journeys, and screen-specific states and actions.
- `docs/design-system.md` — Shared visual and interaction rules, components, accessibility, and responsive patterns.
- `docs/trd.md` — Technical architecture, stack, data, APIs, security, testing, and operations.

Each document governs its own area: the PRD governs product behavior, the app flow governs screen behavior, the design system governs shared presentation, and the TRD governs technical implementation. When a decision is introduced or changed, update the document that owns it and reference it from the others instead of duplicating it. If documents conflict or an important decision is missing, flag it before proceeding with dependent work.

When implementing or modifying an interface, review its visual hierarchy, spacing, empty states, and responsive behavior. For interactive controls, consider hover, focus, pressed, loading, and disabled states, and add microinteractions only when they clarify feedback or a state change. If the user asks for a visual review or broad redesign, inspect the whole interface, identify concrete issues, and fix them; review animations too, and avoid decorative motion by default.
