# CI/CD Image Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the `backend`, `frontend`, and `backup` Docker images to `ghcr.io/thitar/` automatically on every push to `main`, removing the manual "push images yourself" step from the version-bump process.

**Architecture:** A dedicated `.github/workflows/publish.yml` workflow triggers on push to `main` (plus `workflow_dispatch`), reads `APP_VERSION` from `backend/package.json`, guards that `frontend/package.json` matches, then pushes all three images tagged `:VERSION` and `:latest` to ghcr.io using the `GITHUB_TOKEN` with `packages: write`. Compose stays build-only; docs and project memory are updated to reflect that publishing is now automatic.

**Tech Stack:** GitHub Actions (`actions/checkout@v7`, `docker/setup-buildx-action@v4`, `docker/login-action@v4`, `docker/build-push-action@v7`), ghcr.io.

## Global Constraints

- No `APP_VERSION` bump — this PR changes release tooling, not app behavior. The workflow reads whatever version is already in `backend/package.json`/`frontend/package.json` (currently `3.5.0`).
- `backend/package.json` and `frontend/package.json` must always carry identical versions; the workflow fails the job if they mismatch.
- Image names (from `docs/project_notes/key_facts.md`): `ghcr.io/thitar/chore-ganizer-backend`, `ghcr.io/thitar/chore-ganizer-frontend`. New: `ghcr.io/thitar/chore-ganizer-backup`.
- Build contexts/Dockerfiles identical to `quality.yml`'s `docker` job: `./backend`, `./frontend`, `./backup`, no `target:` (default final stage).
- Use the exact action major versions already verified: `docker/setup-buildx-action@v4`, `docker/login-action@v4`, `docker/build-push-action@v7`.

---

### Task 1: Publish workflow

**Files:**
- Create: `.github/workflows/publish.yml`
- Test: `/tmp/opencode/publish-version-guard.sh`

**Interfaces:**
- Consumes: `backend/package.json` + `frontend/package.json` (`version` fields), `./backend`, `./frontend`, `./backup` Dockerfile contexts.
- Produces: ghcr.io images `chore-ganizer-backend:{VERSION,latest}`, `chore-ganizer-frontend:{VERSION,latest}`, `chore-ganizer-backup:{VERSION,latest}`. Later tasks reference these exact names for doc comments.

- [ ] **Step 1: Write the workflow file**

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Docker Images

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  packages: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract APP_VERSION and verify versions match
        id: version
        run: |
          BACKEND_VERSION=$(node -p "require('./backend/package.json').version")
          FRONTEND_VERSION=$(node -p "require('./frontend/package.json').version")
          if [ "$BACKEND_VERSION" != "$FRONTEND_VERSION" ]; then
            echo "::error::Version mismatch: backend=$BACKEND_VERSION frontend=$FRONTEND_VERSION"
            exit 1
          fi
          echo "version=$BACKEND_VERSION" >> "$GITHUB_OUTPUT"

      - name: Build and push backend
        uses: docker/build-push-action@v7
        with:
          context: ./backend
          push: true
          tags: |
            ghcr.io/thitar/chore-ganizer-backend:${{ steps.version.outputs.version }}
            ghcr.io/thitar/chore-ganizer-backend:latest

      - name: Build and push frontend
        uses: docker/build-push-action@v7
        with:
          context: ./frontend
          push: true
          tags: |
            ghcr.io/thitar/chore-ganizer-frontend:${{ steps.version.outputs.version }}
            ghcr.io/thitar/chore-ganizer-frontend:latest

      - name: Build and push backup
        uses: docker/build-push-action@v7
        with:
          context: ./backup
          push: true
          tags: |
            ghcr.io/thitar/chore-ganizer-backup:${{ steps.version.outputs.version }}
            ghcr.io/thitar/chore-ganizer-backup:latest
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/publish.yml')); print('YAML OK')"`
Expected: prints `YAML OK`. If `pyyaml` is missing, run `pip install pyyaml --quiet` first (or use `npx actionlint .github/workflows/publish.yml` if actionlint is available).

- [ ] **Step 3: Validate the version-guard logic locally**

The `run:` block above is the only logic in the workflow; verify it behaves as intended in a shell (same two package.json files, same cwd):

Run from repo root:

```bash
BACKEND_VERSION=$(node -p "require('./backend/package.json').version")
FRONTEND_VERSION=$(node -p "require('./frontend/package.json').version")
echo "backend=$BACKEND_VERSION frontend=$FRONTEND_VERSION"
[ "$BACKEND_VERSION" != "$FRONTEND_VERSION" ] && echo "MISMATCH (should not happen)" || echo "MATCH OK"
```

Expected: prints `backend=3.5.0 frontend=3.5.0` and `MATCH OK`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "ci: publish docker images to ghcr.io on push to main"
```

---

### Task 2: Document published image names in docker-compose.yml

**Files:**
- Modify: `docker-compose.yml` (comment above each service's `build:` block)

**Interfaces:**
- Consumes: image names from Task 1.
- Produces: documented pullable image names; compose remains functionally build-only.

- [ ] **Step 1: Add comment above the frontend `build:` block**

In `docker-compose.yml`, above the `frontend:` service's `build:` block (currently lines 12-14), insert:

```yaml
    # Published to ghcr.io as ghcr.io/thitar/chore-ganizer-frontend:<APP_VERSION> (and :latest)
    # by .github/workflows/publish.yml on every push to main. Compose stays build-only;
    # to deploy from the registry instead: docker compose pull && docker compose up -d.
```

- [ ] **Step 2: Add comment above the backend `build:` block**

Above the `backend:` service's `build:` block (currently lines 40-42), insert:

```yaml
    # Published to ghcr.io as ghcr.io/thitar/chore-ganizer-backend:<APP_VERSION> (and :latest)
    # by .github/workflows/publish.yml on every push to main.
```

- [ ] **Step 3: Add comment above the backup `build:` block**

Above the `backup:` service's `build:` block (currently lines 95-97), insert:

```yaml
    # Published to ghcr.io as ghcr.io/thitar/chore-ganizer-backup:<APP_VERSION> (and :latest)
    # by .github/workflows/publish.yml on every push to main.
```

- [ ] **Step 4: Verify compose still parses**

Run: `docker compose config --quiet` (from repo root; needs a `.env` or defaults are fine)
Expected: exit code 0, no output. (If `docker compose config` complains about a missing `.env` variable, note the variable name — every var has a `${VAR:-default}` fallback in this file, so it should parse.)

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "docs(compose): note ghcr.io image names per service"
```

---

### Task 3: Update operations and project docs

**Files:**
- Modify: `docs/OPERATIONS.md` (Version Bumps, step 2)
- Modify: `docs/project_notes/key_facts.md` (Docker section)
- Modify: `docs/FUTURE-ROADMAP.md` (deferred row → shipped)

**Interfaces:**
- Consumes: image names from Task 1.
- Produces: docs that no longer claim "no CI/CD workflow builds, tags, or pushes Docker images".

- [ ] **Step 1: Rewrite OPERATIONS.md step 2**

Replace the "Rebuild and (if publishing) push images yourself..." paragraph in `docs/OPERATIONS.md` (line 77) with:

> 2. Rebuild locally with `./docker-compose.sh up --build -d`. Publishing to `ghcr.io/thitar/chore-ganizer-{backend,frontend,backup}` is now automatic: `.github/workflows/publish.yml` builds and pushes all three images (tagged `:<version>` and `:latest`) on every push to `main`. No manual push step. (Deployment remains manual — `docker compose up --build -d` to build, or `docker compose pull` once an image is published.)

- [ ] **Step 2: Update key_facts.md Docker section**

In `docs/project_notes/key_facts.md` (lines 35-43), update the `Docker` section so it reads:

```markdown
### Docker

**Registry:** `ghcr.io/thitar/`
**Images:** CI-published on every push to `main` by `.github/workflows/publish.yml`:
- Backend: `ghcr.io/thitar/chore-ganizer-backend:VERSION`
- Frontend: `ghcr.io/thitar/chore-ganizer-frontend:VERSION`
- Backup: `ghcr.io/thitar/chore-ganizer-backup:VERSION`
```

- [ ] **Step 3: Update FUTURE-ROADMAP.md**

In `docs/FUTURE-ROADMAP.md`, remove the deferred row `| CI/CD image publishing to a registry | No workflow builds/pushes to ghcr.io despite the naming convention; images are built and tagged locally only |` (line 18). The item is shipped; no replacement row needed.

- [ ] **Step 4: Verify no stale claims remain**

Run from repo root:

```bash
rg -n "no CI/CD workflow|No workflow builds|built and tagged locally" docs/ | grep -v project_notes/issues.md
```

Expected: no matches (the historical note in `issues.md` is intentionally kept as history).

- [ ] **Step 5: Commit**

```bash
git add docs/OPERATIONS.md docs/project_notes/key_facts.md docs/FUTURE-ROADMAP.md
git commit -m "docs: reflect automatic ghcr.io publishing"
```

---

### Task 4: Log work in project memory

**Files:**
- Modify: `docs/project_notes/issues.md`

**Interfaces:**
- Consumes: nothing from prior tasks beyond the finished work summary.
- Produces: a dated work-log entry.

- [ ] **Step 1: Add an entry to issues.md**

Append a bullet to `docs/project_notes/issues.md` (following the file's existing date-prefixed format, e.g. `- **Date**: 2026-08-13`):

```markdown
- **Date**: 2026-08-13
- **Description**: Implemented CI/CD Docker image publishing (design + plan in `docs/superpowers/specs/2026-08-13-ci-cd-image-publishing-design.md`). Added `.github/workflows/publish.yml` which builds and pushes `backend`, `frontend`, and `backup` images to `ghcr.io/thitar/` (tagged `:VERSION` + `:latest`) on every push to `main`, reading `APP_VERSION` from `backend/package.json` and failing if the frontend version mismatches. Documented the ghcr.io image names in `docker-compose.yml` comments (compose stays build-only). Updated `docs/OPERATIONS.md` (version-bump step 2 — publishing now automatic), `docs/project_notes/key_facts.md`, and `docs/FUTURE-ROADMAP.md` (deferred row → shipped). No `APP_VERSION` bump (release tooling only, no app-behavior change). Verifiable via `workflow_dispatch` on `main` after merge.
```

- [ ] **Step 2: Read back the entry to confirm formatting**

Run: `tail -8 docs/project_notes/issues.md`
Expected: the new bullet renders consistently with the file's existing format.

- [ ] **Step 3: Commit**

```bash
git add docs/project_notes/issues.md
git commit -m "docs(memory): log CI/CD image publishing work"
```

---

## Self-Review

**Spec coverage:**
- New `publish.yml` (trigger, permissions, version guard, 3 build-push steps, tags) → Task 1. ✓
- `docker-compose.yml` comments, compose stays build-only → Task 2. ✓
- OPERATIONS.md / key_facts.md / FUTURE-ROADMAP.md updates → Task 3. ✓
- Project-memory work log → Task 4. ✓
- Testing/verification (YAML parse, version-guard, `docker compose config`, post-merge `workflow_dispatch`) → Tasks 1-3 steps. ✓

**Placeholder scan:** No TBD/TODO; every file edit shows exact content.

**Type consistency:** Image names `chore-ganizer-{backend,frontend,backup}` are identical across Tasks 1-3; action versions match what was verified via `git ls-remote` (buildx v4, login v4, build-push v7).
