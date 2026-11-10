# Workflow 6 — Add or update GitHub Actions CI

Use when the user asks to add or repair CI with GitHub Actions. Deployment is out of scope unless requested. One request = one CI change.

1. Follow `skills/actions/SKILL.md`. Inspect the stack, package manager, existing test/lint commands, repository conventions, and `.github/workflows/`.
2. Choose and implement the smallest useful CI workflow for the request, using real repository commands and existing branches. Do not invent tests or fake green checks. Use least-privilege permissions, concurrency where useful, and pinned actions when practical. Keep secrets out of the repo and YAML.
3. Preserve unrelated workflows. Do not commit, push, merge, deploy, or change branch protection unless explicitly asked.
4. Inspect the resulting workflow and validate it when a suitable local validator is available. Report files, triggers, checks, validation limits, and any missing tests or configuration. Do not claim GitHub CI passed unless it ran there.
