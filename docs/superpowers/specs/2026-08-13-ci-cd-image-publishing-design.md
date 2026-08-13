# CI/CD Image Publishing — Design

Date: 2026-08-13

## Goal

Publish the three Docker images (`backend`, `frontend`, `backup`) to `ghcr.io/thitar/` automatically on every push to `main`, removing the manual "build and (if publishing) push images yourself" step from `docs/OPERATIONS.md`'s Version Bumps checklist.

## Current State

- Three images are built **locally only**: `backend/`, `frontend/`, and `backup/` each have a Dockerfile; `quality.yml`'s `docker` job already builds all three on PRs (`chore-ganizer-backend:ci`, etc.).
- `docker-compose.yml` uses `build:` only — no `image:` refs, so nothing is pullable from a registry.
- `APP_VERSION` is the single source of truth in `backend/package.json` and must match `frontend/package.json` (identical values, see AGENTS.md). `docker-compose.sh` syncs it into `.env` for local image tags.
- No CI workflow publishes images or deploys; `ghcr.io/thitar/chore-ganizer-{backend,frontend}` names are documented in `key_facts.md` but nothing is actually pushed there today.

## Approach

Dedicated workflow file — Approach A from brainstorming.

### New file: `.github/workflows/publish.yml`

- **Trigger:** `on: push: branches: [main]` plus `workflow_dispatch` (re-run / manual convenience).
- **Permissions:** `contents: read`, `packages: write` (job-level). The `GITHUB_TOKEN` can publish to ghcr.io for this user-owned repo — no PAT required.
- **One job `publish`:**

  1. `actions/checkout@v7`
  2. `docker/setup-buildx-action`
  3. `docker/login-action` to `ghcr.io` with `${{ github.actor }}` / `${{ secrets.GITHUB_TOKEN }}`
  4. Extract `APP_VERSION` from `backend/package.json` (node one-liner); assert `frontend/package.json` matches — fail the job if the version contract is broken.
  5. Three `docker/build-push-action` steps — `backend`, `frontend`, `backup` — each with `push: true` and tags:
     - `ghcr.io/thitar/chore-ganizer-<svc>:${APP_VERSION}`
     - `ghcr.io/thitar/chore-ganizer-<svc>:latest`
     - Build context and Dockerfile identical to `quality.yml`'s `docker` job.

- On `workflow_dispatch`, the version is read from the code at the ref the workflow runs against (i.e. whatever you point it at).
- Re-pushing an already-existing `:VERSION` tag simply overwrites it — idempotent, no uniqueness check.

### `docker-compose.yml`

Add a comment above each service's `build:` block documenting that service's published ghcr.io image name (`ghcr.io/thitar/chore-ganizer-<svc>:VERSION`) and that it's CI-published on push to main. No functional `image:` refs — compose stays build-only.

### Docs updates

- **`docs/OPERATIONS.md`** — Version Bumps step 2 rewritten: publishing is now automatic on merge to `main`; local rebuild still via `docker compose build`. Remove "no CI/CD workflow builds/tags/pushes" claim.
- **`docs/project_notes/key_facts.md`** — Docker section: note images are CI-published to ghcr.io on push to main.
- **`docs/FUTURE-ROADMAP.md`** — move the "CI/CD image publishing" deferred row to shipped.

## Error Handling & Failure Behavior

- Version-guard failure stops the job before any push (a mismatch between the two package.json versions is a merge error, not something to publish).
- Login/push failures fail the job loudly; since deployment is manual, a failed push means the server still runs whatever it last built locally — no partial-deploy risk.
- `latest` is only updated when the whole job succeeds (each push step is independent; a backend failure would still push frontend — acceptable for this homelab scale, noted as a known trade-off).

## Testing

- Can't exercise a push-to-`main` trigger without merging. Verification plan:
  1. YAML sanity (parse/actionlint if available).
  2. Merge, then run the workflow via `workflow_dispatch` on `main` and confirm all three images appear in `ghcr.io/thitar/`.
  3. Optionally verify `docker compose pull` resolves images after a tag exists.

## Out of Scope

- Automated deployment to the server — stays manual (`docker compose up --build -d` / pull + up).
- Changing `docker-compose.yml` to functional `image:` refs.
- Tag strategies beyond `:VERSION` + `:latest` (no commit-SHA tags, no semver parsing).
