# CI/CD Image Publishing — Design

Date: 2026-08-13 (updated 2026-08-19 — SHA pins, main-ref guard, atomic :latest)

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
- **Main-ref guard:** `if: github.ref == 'refs/heads/main'` on the publish job — blocks `workflow_dispatch` on feature branches from overwriting published tags.
- **Permissions:** `contents: read`, `packages: write` (job-level). The `GITHUB_TOKEN` can publish to ghcr.io for this user-owned repo — no PAT required.
- **All external actions pinned to immutable commit SHAs** (supply-chain hardening), with version comments for Dependabot:
  - `actions/checkout@3d3c42e5...` (v7)
  - `docker/setup-buildx-action@37fe6310...` (v4)
  - `docker/login-action@dbcb8138...` (v4)
  - `docker/build-push-action@53b7df96...` (v7)
- **One job `publish`:**

  1. Checkout, set up Buildx, log in to ghcr.io
  2. Extract `APP_VERSION` from `backend/package.json` (node one-liner); assert `frontend/package.json` matches — fail the job if the version contract is broken.
  3. Three `docker/build-push-action` steps — `backend`, `frontend`, `backup` — each pushes only the `:VERSION` tag (not `:latest`).
  4. A single `Promote all images to :latest` step using `docker buildx imagetools create` runs only after all three builds succeed (`if: success()`), promoting each `:VERSION` to `:latest` atomically. If any build fails, `:latest` is never updated — the registry is never left in an inconsistent cross-service state.

- On `workflow_dispatch`, the version is read from the code at the ref the workflow runs against — restricted to `main` by the guard.
- Re-pushing an already-existing `:VERSION` tag simply overwrites it — idempotent, no uniqueness check.

### `docker-compose.yml`

A comment above each service's `build:` block documents that service's published ghcr.io image name (`ghcr.io/thitar/chore-ganizer-<svc>:VERSION`) and that it's CI-published on push to main. No functional `image:` refs — compose stays build-only.

### Docs updates

- **`docs/OPERATIONS.md`** — Version Bumps step 2 rewritten: publishing is now automatic on push to `main`; local rebuild still via `docker compose build`. Remove "no CI/CD workflow builds/tags/pushes" claim. The "From a pre-built registry image" section explains compose is build-only and notes the `docker-compose.override.yml` approach for pulling from the registry.
- **`docs/project_notes/key_facts.md`** — Docker section: note images are CI-published to ghcr.io on push to main.
- **`docs/FUTURE-ROADMAP.md`** — move the "CI/CD image publishing" deferred row to shipped.
- **`AGENTS.md`**, **`docs/ARCHITECTURE.md`**, **`docs/DOCKER-CONFIGURATION.md`** — reconcile stale "no publishing pipeline" claims.

## Error Handling & Failure Behavior

- Version-guard failure stops the job before any push (a mismatch between the two package.json versions is a merge error, not something to publish).
- Login/push failures fail the job loudly; since deployment is manual, a failed push means the server still runs whatever it last built locally — no partial-deploy risk.
- `:latest` is only updated after **all three** builds and version-tagged pushes succeed, via a single `imagetools create` step. If any build fails, `:latest` is never touched — the registry is never left in an inconsistent cross-service state.

## Testing

- Can't exercise a push-to-`main` trigger without merging. Verification plan:
  1. YAML sanity (parse/actionlint).
  2. Merge, then run the workflow via `workflow_dispatch` on `main` and confirm all three images appear in `ghcr.io/thitar/` with both `:VERSION` and `:latest` tags.
  3. Compose remains build-only; `docker compose pull` is not used. To deploy from the registry, create a `docker-compose.override.yml` with `image:` entries.

## Out of Scope

- Automated deployment to the server — stays manual (`docker compose up --build -d`).
- Changing `docker-compose.yml` to functional `image:` refs.
- Tag strategies beyond `:VERSION` + `:latest` (no commit-SHA tags, no semver parsing).
