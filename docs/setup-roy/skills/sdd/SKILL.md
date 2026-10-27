---
name: sdd
description: >
  Spec-Driven Development (setup-roy): heavy one-shot delivery of a product piece
  in the current repo. Runs brief, clarify, technical plan, requirements review,
  tasks, cross-check, implement, and converge — inspired by Spec Kit, not the
  Spec Kit CLI unless the project already uses it. Levels auto (default, no
  pauses, assumptions in closing) and pausas (stop for human-only decisions,
  zero code until the user answers). One task per request, not a chat mode.
  Use when the user names sdd, SDD, skill pesada, spec-driven, piece-heavy, or
  forge. Not companion, grilling, or surgical.
argument-hint: "[auto|pausas]"
---

# SDD — Spec-Driven Development

Deliver **one product piece** in this project with full spec discipline, then stop. Not a session mode unless the user starts another SDD request.

**Level** (this request only): `auto` (default) or `pausas`. User may say `skill pesada auto`, `sdd pausas`, `sin paradas` / `asume todo` (treat as `auto`), or `con decisiones` / `guided` (treat as `pausas`).

## Not this skill

| Skill | When |
|-------|------|
| **ftd** | Fast Track — shorter path, no product pauses |
| **surgical** | Bug fix or small change with wide search, not new piece design |
| **companion** | User implements step by step; default no repo writes |
| **grilling** | Stress-test decisions only; do not implement until user confirms understanding |

## Hard rules

1. **One shot** — Complete the piece (or a documented block) in this engagement; do not stay in SDD for unrelated work.
2. **Repo anchor first** — Read what the task needs (`AGENTS.md`, docs, neighbors, patterns). No project constitution phase; do not invent global principles files unless the user asks.
3. **Not conversational** — Do not use `next` / companion flow. In `auto`, run all phases and implement without asking product questions.
4. **`pausas` + decisions** — **Write zero code** until the user answers numbered decision questions. Then continue the pipeline in the same thread without another pause unless a new human-only blocker appears after cross-check.
5. **Implement** — Phases are for quality; the deliverable is working code in the repo when the request expects it.
6. **Claims** — Do not say tests/build passed unless you ran them this session.
7. **Git** — No commit or push unless explicitly asked.

## Pipeline (always, in order)

Map to Spec Kit ideas for alignment; do not require `/speckit-*` or `.specify/` unless the project already has them.

| Step | Name | Do |
|------|------|-----|
| 0 | **Anclaje** | Minimal read of project context for this piece. |
| 1 | **Brief** (`specify`) | What/why, done-when, in scope / out of scope. Product language; stack detail waits for step 3. |
| 2 | **Cerrar huecos** (`clarify`) | Edge cases and gaps; list assumptions. In `pausas`, surface human-only choices for the gate below. |
| — | **Pausa 1** | `pausas` only: if the user must choose (product, secrets, irreversible tradeoffs), output **Decisiones** (numbered, each with a recommended option) and **stop — no code**. Otherwise continue. |
| 3 | **Técnica** (`plan`) | How in *this* codebase: modules, files, data, dependencies. |
| 4 | **Revisión del brief** (`checklist`) | Requirements-quality pass: is the brief complete and implementable without guessing? Fix gaps internally before tasks. |
| 5 | **Tareas** (`tasks`) | Ordered work units (prefer thin vertical slices). |
| 6 | **Cruzar** (`analyze`) | Spec/plan/tasks consistent? In `auto`, fix artifacts mentally and proceed. In `pausas`, if only a human can resolve a conflict, **Pausa 2** (same format, **zero code**); else fix and continue. |
| 7 | **Programar** (`implement`) | Execute tasks; match repo conventions. |
| 8 | **Cierre** (`converge`) | Code vs brief and tasks; run checks if available; note config/secrets the user must add. In `auto`, prominent **Supuestos** list for what you would have asked in `pausas`. |

### When to pause (`pausas` only)

Pause (no code) only for decisions **you cannot** take from the repo or safe defaults: business rules, credentials, which of two valid product behaviors, scope the brief contradicts. Do **not** pause for style, file paths, or fixable inconsistencies — fix those and continue.

## Response shape

Keep the preamble compact; then do the work.

**`auto` or after user answered in `pausas`:**

```markdown
## SDD · <piece title>
**Hecho cuando:** …
**Fuera de alcance:** …
**Supuestos:** … (required in auto; optional in pausas if already agreed)
**Plan de tareas:** 1) … 2) …
---
(implementation + verification note)
```

**`pausas` waiting on user:**

```markdown
## SDD · <piece title> — decisiones
Responde con el número o una frase corta. No implemento hasta entonces.

1. **<title>:** …
   → Recomiendo: …
```

## If Spec Kit files exist

You may update `spec.md` / `plan.md` / `tasks.md` in the project’s Spec Kit layout when that is already the team workflow. Otherwise keep the brief in the chat (or a path the user named). Do not run `specify init` unless asked.
