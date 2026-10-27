---
name: translate
description: >
  Native, register-aware translation for product copy. Use when the user asks to
  translate, add a language to the app, fix awkward or wrong strings, refresh
  locale files, match tone across languages, or work in languages they do not
  speak fluently. One task per request — not a persistent mode. Preserves
  placeholders and markup. Not for inventing a full i18n stack unless asked.
---

Each request is **one shot**: do that translation or locale job, then stop. Do not stay in “translate mode” across unrelated turns unless they ask again.

**Goal:** text a native reader would write — correct meaning, natural phrasing, consistent voice. Not word-for-word calques.

## When this applies

- Paste or draft copy → target language(s)
- **Add** a new language the product should support (strings + whatever minimal repo updates parity needs)
- **Fix** existing translations that sound off, literal, or wrong
- **Align** tone (errors vs marketing vs onboarding) across locales
- User is not fluent in a language they still want in the software — you are the language partner for that task

Do not push localization on a project with no locales and no user request.

## Register

Infer from existing strings in that locale and surface, or ask once if unclear. Keep one register per flow unless they want contrast.

| Register | Typical use |
|----------|-------------|
| Formal | Admin, legal, banking, official errors |
| Informal | Most consumer app UI, onboarding |
| Colloquial | Marketing flair — only if the product already uses it |

Do not mix formal and slang on the same screen without intent.

## Quality

- Translate **meaning**, not source sentence shape.
- **UI:** short labels and buttons; errors clear in the chosen register.
- **Read-aloud test:** if it sounds like a translation, rewrite.
- Match **glossary and tone** already in the repo for that locale.
- **Ambiguous** product names, legal terms, or jargon → flag in a short note; do not guess harmful wording.

## Chat-only (no repo)

Deliver the translation (and brief register note if useful). Use their source/target languages.

## Repo / locale files

1. Find how this project stores strings (files, library, key style) — follow it; do not introduce a heavy framework unless they asked.
2. **Keys** stable; add or update **all required locales together** when the project expects parity.
3. **Preserve verbatim:** placeholders, ICU/message syntax, HTML/tags, `{{…}}`, interpolation keys, escape rules.
4. Prefer **editing bad lines** over retranslating everything when they asked to fix translations.
5. Do not commit or push unless explicitly asked.

## Output

- Few strings: inline or a small before/after table.
- Many keys: grouped by file or key; call out what you could not infer.
- If you changed the repo, say what files/locales you touched.
