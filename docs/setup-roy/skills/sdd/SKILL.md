---
name: sdd
description: >
  Spec-Driven Development: deliver one clearly scoped product change through a
  full specification workflow: brief, clarification, technical plan,
  requirements review, tasks, cross-check, implementation, and final review.
  Supports auto (default; proceeds with stated assumptions) and pausas (stops
  for decisions only the user can make). Use when the user asks for SDD,
  spec-driven development, or a full specification workflow.
argument-hint: "[auto|pausas]"
---

# SDD — Spec-Driven Development

Deliver one clearly scoped product change in this project through a specification-led workflow, then stop. Treat each request as a separate task.

**Level** (for this request only): `auto` (default) or `pausas`. Use `auto` to proceed without pausing for product decisions, recording assumptions in the closeout. Use `pausas` or `guided` to stop for decisions only the user can make.

## Hard rules

1. **One shot** — Complete the requested change, or clearly report what blocks it. Treat later requests as separate tasks.
2. **Repo anchor first** — Analyze the request and relevant project context, including `AGENTS.md`, docs, nearby code, conventions, constraints, and risks.
3. **Keep moving** — In `auto`, complete the phases and implement without pausing for product decisions. State assumptions in the closeout.
4. **`pausas` decisions** — Write no code until the user answers the numbered decision questions. Then continue in the same thread; pause again only if cross-check reveals a new decision only the user can make.
5. **Keep scope local** — Avoid project-wide rules or configuration unless asked. Update existing docs when the change makes them inaccurate; do not create docs when none are relevant.
6. **Complete the change** — Use the phases to guide the work; do not stop after producing the specification or plan when implementation is expected.
7. **Checks** — In **Converge**, run the project’s usual verify commands when documented (scripts, Makefile, CI config, or repo docs). Prefer targeted checks on changed areas when the full suite is slow or huge. Fix failures or report what blocks closure. If nothing verifiable ran, say so explicitly — do not imply green without evidence.
8. **Respect Git boundaries** — Do not commit or push unless explicitly asked.

## Pipeline (always, in order)

Run the phases below in order for each request. Step **0** re-anchors repo context and governing principles for that change (not a separate one-time setup).

| Step | Name | Goal | Do |
|------|------|------|-----|
| 0 | **Anchor** | Ground this change in the repo and the rules later steps must honor. | Read `AGENTS.md`, docs, and nearby code; note constraints, patterns, risks, and non-negotiables (security, architecture, quality). State any principles the user gave for this task that are not already in project docs. |
| 1 | **Specify** | Turn the request into a clear spec: what to build and why—not stack or implementation. | Define the problem, desired outcome, acceptance criteria, and scope in product language; defer tech choices to **Plan**. |
| 2 | **Clarify** | Close gaps and ambiguities in the spec before planning on assumptions. | Surface edge cases and assumptions; in `pausas`, list decisions only the user can make. |
| — | **Pause 1** | *(Skill gate.)* | In `pausas`, if the user must decide product behavior, provide credentials, or accept an irreversible tradeoff, list numbered **Decisions** with recommendations, then stop without code. Otherwise continue. |
| 3 | **Plan** | Translate the spec into a technical design: stack, architecture, and how the change lands in the codebase. | Choose how and where to implement (modules, files, data, dependencies) in this repo. |
| 4 | **Checklist** | Validate spec quality—complete, clear, consistent—before breaking work down. | Confirm the spec is implementable without guessing; resolve gaps before **Tasks**. |
| 5 | **Tasks** | Produce dependency-ordered, actionable work items from the plan and spec. | Break the plan into concrete ordered tasks; each advances a spec requirement with a clear done check; omit filler. |
| 6 | **Analyze** | Read-only cross-check of spec, plan, and tasks for conflicts, gaps, and drift. | Ensure the three artifacts agree; fix at the source and re-check. In `auto`, resolve fixable inconsistencies and proceed. In `pausas`, pause only if resolution needs a user-only decision. |
| 7 | **Implement** | Execute tasks in order and build the change per the plan. | Complete tasks using project conventions; if the requirements checklist from **Checklist** is still open, stop and ask before coding. |
| 8 | **Converge** | Verify the codebase matches spec, plan, and tasks until nothing material is left open. | Compare outcome to spec and tasks; run verification per hard rule 7; report what ran. If gaps remain, add tasks and repeat **Implement** → **Converge**. In `auto`, list important assumptions; note config or secrets the user must supply. |

### When to pause (`pausas` only)

Pause without writing code only for decisions that cannot be resolved from the repo or safe defaults, such as business rules, credentials, choosing between valid product behaviors, or conflicting scope. Do not pause for style, file paths, or fixable inconsistencies; resolve those and continue.

## Response shape

Keep the preamble compact, then do the work.

**`auto` or after the user answers in `pausas`:**

```markdown
## SDD · <piece title>
**Done when:** …
**Out of scope:** …
**Assumptions:** … (required in auto; optional in pausas if already agreed)
**Task plan:** 1) … 2) …
---
(implementation and verification note)
```

**`pausas` waiting on user:**

```markdown
## SDD · <piece title> — decisions
Reply with a number or a short phrase. Implementation is paused until you answer.

1. **<title>:** …
   → Recommended: …
```
