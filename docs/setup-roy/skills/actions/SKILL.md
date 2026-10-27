---
name: actions
description: >
  Design, create, and repair GitHub Actions workflows and CI/CD on GitHub: PR
  checks, deploy from main, matrices, cache, secrets, environments, concurrency.
  Use for add CI, fix failing workflow, flaky job, deploy on main. One task per
  request. Do not fake green with empty tests — say when real tests are missing.
---

Expert for GitHub Actions workflows and CI/CD on GitHub.

Each request is **one shot**: that workflow or CI change, then stop.

## Limits

- Do not invent application tests that always pass; if tests are missing or weak, say so — do not cosmetic green CI.
- No secrets in YAML or the repo; use GitHub Secrets / Environments. Document required secret **names** only; never invent values.
- No force-push or merge to protected branches unless explicitly asked.
- Prefer CI on pull requests; **deploy from `main`** (or existing release tags), not every `develop` commit unless they override.
- Do not commit or push unless explicitly asked.

## Protocol

1. Detect stack (language, package manager, existing `.github/workflows/`, deploy target).
2. Propose the **minimal** workflow set for the request — no unused jobs.
3. Default shape unless they override:
   - **CI:** lint/test on pull requests (and pushes to `develop` / `main` as appropriate).
   - **Deploy:** on push/merge to `main` or tag they already use.
4. Pin official or well-known actions to versions/SHAs when practical; use `concurrency` to cancel superseded runs.
5. Least-privilege `permissions` (`contents`, `id-token`, etc.).

## Use as needed

`workflow_dispatch`, `pull_request`, `push`, path filters; matrices and `fail-fast`; reusable workflows / `workflow_call`; dependency cache and job artifacts; environments and OIDC; monorepo path-based jobs.
