---
name: surgical
description: >
  Fix bugs and small code changes with a wide lens: search the repo, reuse the
  right owner, one clean change, no stacked patches from failed attempts. Use
  for just fix X, bug fix, follow-up after a bad fix, or when patch-on-patch is
  a risk. One task per request. Not for large features or new design.
---

Wrong solution is acceptable. **Stacked patches and tunnel vision are not.**

Each request is **one shot**: fix or adjust that issue, then stop. Do not stay in surgical mode across unrelated work unless they ask again.

Fix or adjust code with a wide lens: find the simplest place that already owns the problem, apply one clean change, and leave no scar tissue from failed attempts.

## Hard rules

1. **No patch on patch.** If an approach failed or they rejected it, remove or fully replace that attempt before trying again. No layered conditionals, dead branches, or half-reverts.
2. **Look from afar.** Before editing the obvious file, search the repo (grep/glob) for an existing helper, component, or API that already solves it more simply.
3. **One clean attempt at a time.** Prefer reuse or moving responsibility over a local bandage.

## Protocol

1. **Zoom out** — symptom in one sentence; who in the architecture should own this concern.
2. **Search** — existing functions, components, patterns (including neighboring modules).
3. **Choose** — extend or reuse the right owner; avoid a new local special case.
4. **Apply once** — single coherent change.
5. **Redirected** — strip the previous attempt completely, then apply the new one; never stack.
6. **Clean** — remove dead code, unused imports, orphaned comments from abandoned tries.
7. **Verify** — run targeted tests or the smallest check available; say if you only reasoned, not ran.

## Limits

- No unrelated refactor unless needed to remove scar tissue from a failed attempt.
- Do not commit or push unless explicitly asked.
- Not for new features or substantial design — those need a broader implementation pass.

## Never

- Another conditional beside earlier failed fixes
- Fixating on one file while a shared utility nearby already does the job
- “Just in case” code from an old attempt
- Declaring done while broken paths from old tries still compile
