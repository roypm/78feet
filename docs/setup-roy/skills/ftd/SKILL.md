---
name: ftd
description: >
  Fast Track Development: implements one clearly scoped feature or product
  change in the current repo through a lightweight pipeline—Anchor, Specify,
  Plan, Tasks, Implement, Converge. End-to-end with optional checks unless
  requested. Use when the user asks for FTD, fast-track development, or
  lightweight implementation.
---

# FTD — Fast Track Development

Deliver one clearly scoped change through the pipeline below: ground the work in the repo, specify the outcome, plan and break down tasks, implement, then converge. Treat each request as a separate task and stop when it is complete.

## Hard rules

1. **Anchor first** — Read relevant project context (`AGENTS.md`, docs, nearby code) and follow existing patterns.
2. **Keep moving** — If missing information blocks part of the work, state what is missing and continue with the parts that do not depend on it. If nothing can be done safely, stop and ask for that information.
3. **Keep scope local** — Avoid project-wide rules or configuration unless asked. Update existing docs when the change makes them inaccurate; don’t create docs when none are relevant.
4. **Complete the change** — Use **Specify**, **Plan**, and **Tasks** to guide **Implement**; do not stop after planning alone.
5. **Checks** — Skip tests by default. Run them only if requested or a quick check is necessary; report results accurately.
6. **Respect Git boundaries** — Do not commit or push unless explicitly asked.

## Pipeline (always, in order)

Run the phases below in order for each request. Step **0** re-anchors repo context and governing principles for that change. Scale **Plan** and **Tasks** to the size of the change.

| Step | Name | Goal | Do |
|------|------|------|-----|
| 0 | **Anchor** | Ground this change in the repo and the rules later steps must honor. | Read `AGENTS.md`, docs, and nearby code; note constraints, patterns, risks, and non-negotiables (security, architecture, quality). State any principles the user gave for this task that are not already in project docs. |
| 1 | **Specify** | Turn the request into a clear spec: what to build and why—not stack or implementation. | Define problem, outcome, acceptance criteria, scope, and out-of-scope in product language; keep it concise; defer tech choices to **Plan**. Record assumptions you proceed on when something is underspecified. |
| 2 | **Plan** | Translate the spec into a technical design: stack, architecture, and how the change lands in the codebase. | Choose how and where to implement (modules, files, data, dependencies) in this repo. |
| 3 | **Tasks** | Produce dependency-ordered, actionable work items from the plan and spec. | Break the plan into concrete ordered tasks; each advances a spec requirement with a clear done check; omit filler. |
| 4 | **Implement** | Execute tasks in order and build the change per the plan. | Complete tasks using project conventions. |
| 5 | **Converge** | Verify the change matches the spec and tasks; close the loop on this request. | Compare outcome to **Specify** and **Tasks**; state assumptions and anything still missing. Run checks only per hard rule 5; report what ran accurately (including when none ran). |

## Response shape (optional, keep short)

```markdown
## FTD · <piece title>
**Done when:** …
**Tasks:** 1) …
---
(implementation + verification note)
```
