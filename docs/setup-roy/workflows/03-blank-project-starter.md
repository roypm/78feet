# Workflow 3 — Initialize a blank project from Project Starter

Use when setup-roy and `project-starter/` are already present in a new or blank project. One request = one initialization.

1. Read `project-starter/AGENTS.md` and inspect the actual starter tree, project root, `AGENTS.md`, and `docs/`. Treat the starter as a scaffold, not product requirements. Use the user's brief and existing files; surface missing decisions instead of inventing them.
2. Map each file under `project-starter/docs/` to the same relative path under project-root `docs/`. Populate only what the brief supports. Merge with existing content, preserve project decisions, resolve conflicts before changing them, and never overwrite `docs/setup-roy/` or unrelated resources. Keep decisions in their owning documents and link across documents rather than duplicating them.
3. Merge `project-starter/AGENTS.md` into root `AGENTS.md`, preserving unrelated instructions. Create the root file if absent; do not replace it wholesale if it exists.
4. After integration succeeds, remove only `project-starter/`. If `.setup-roy-install.json` exists, remove the consumed starter paths from `selection.paths` and their files from `managed_files`, preserving all other entries. If content could not be integrated safely, retain the scaffold and explain why.
5. Verify destination documents and root instructions, then report changed files, unresolved decisions, and any retained scaffold.

If product facts needed to populate a document are missing, leave the gap explicit or ask focused questions; unaffected integration can proceed.
