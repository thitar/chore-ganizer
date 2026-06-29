# DEPRECATED — v1-archive of backend

This directory contains the **legacy v2.1.10 backend codebase** that was
superseded by the v1-rewrite (the `backend/` directory at the repo root).

## Why it exists

The v1-rewrite was a ground-up rebuild of Chore-Ganizer with a
right-sized, ~50-source-file architecture (vs the legacy 200+ files).
The rewrite was built alongside the legacy in `backend-v2/` and
`backend/` respectively, then promoted to `backend/` when all 8 phases
of the rewrite shipped (commit gsd/phase-04-recurring-chores 2026-06-29).

## Status

- **No maintenance.** Don't add features, fixes, or tests here.
- **Reference only.** Use git history (`git log -- backend-v1-archive/`)
  if you need to see how a legacy feature was implemented.
- **Do NOT deploy from this directory.** The Dockerfile and
  `docker-compose.yml` at the repo root target the new `backend/`.

## When to delete

After 1 release cycle (e.g., 30 days post-Phase 8 merge to `main`) with
no rollback needed, this directory can be removed. Until then, it's
the safety net for any missed feature in the rewrite.

## Last known good commit

This archive corresponds to the v2.1.10 codebase as of
`main @ 2026-04-28` (the v2.1.10 milestone ship date per
`MILESTONES.md`).
