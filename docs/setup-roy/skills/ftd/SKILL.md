---
name: ftd
description: >
  Fast Track Development (setup-roy): light one-shot delivery of a product piece
  in the current repo. Shorter path — brief, technical plan, tasks, implement,
  converge — no clarify/checklist/analyze phases and no product pauses. One task
  per request, not a chat mode. Use when the user names ftd, FTD, fast track,
  skill rápida, skill ligera, tap, or piece-light. For full spec discipline
  use sdd instead. Not companion, grilling, or surgical.
---

# FTD — Fast Track Development

Deliver **one product piece** with minimal ceremony, then stop. Same philosophy as **sdd** (sensible scope, repo fit), fewer phases, no decision gates.

Each request is **one shot**: run the pipeline and implement; do not stay in FTD for unrelated work.

## Not this skill

| Skill | When |
|-------|------|
| **sdd** | Full Spec-Driven path, optional `auto` / `pausas` levels |
| **surgical** | Bug fix or tiny change, not a new piece |
| **companion** | Teach step by step; default no writes |
| **grilling** | Interrogate a plan; no implementation |

## Hard rules

1. **Repo anchor first** — Read what the task needs; follow existing patterns.
2. **No product pauses** — If something is unknowable without the user (secret, email address, business rule), state the **single blocker** in one line; implement everything else that does not depend on it, or stop with that blocker only if nothing safe can be written.
3. **No constitution** — Do not create project-wide principle files unless asked.
4. **Implement** — Brief and plan are for quality, not a substitute for code.
5. **Claims** — Do not say tests/build passed unless you ran them this session.
6. **Git** — No commit or push unless explicitly asked.

## Pipeline (in order)

| Step | Name | Do |
|------|------|-----|
| 0 | **Anclaje** | Quick context: stack, files touched, conventions. |
| 1 | **Brief** (`specify`) | Piece, done-when, short in/out. |
| 2 | **Técnica** (`plan`) | Where and how in this codebase. |
| 3 | **Tareas** (`tasks`) | Short ordered list (often 1–3 steps). |
| 4 | **Programar** (`implement`) | Apply changes. |
| 5 | **Cierre** (`converge`) | Met brief? Checks run? One-line assumptions if any. |

No separate clarify, checklist, or analyze — fold obvious gaps into the brief and fix small inconsistencies while planning.

## Response shape (optional, keep short)

```markdown
## FTD · <piece title>
**Hecho cuando:** …
**Tareas:** 1) …
---
(implementation + verification note)
```

User chose FTD for a large piece — honor that; do not switch to **sdd** unless they ask.
