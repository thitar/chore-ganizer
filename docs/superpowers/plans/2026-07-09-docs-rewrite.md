# Documentation Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale/scattered top-level docs (README, CHANGELOG, AGENTS.md, BACKUP-RESTORE-GUIDE.md) with an accurate, current set: a user-facing README, a regenerated CHANGELOG, a leaner AGENTS.md focused on AI-agent conventions, and two new documents — `docs/ARCHITECTURE.md` (system design) and `docs/OPERATIONS.md` (how to run and maintain the app day to day).

**Architecture:** Each doc has one job and no overlap: README = "what is this and how do I start it", ARCHITECTURE.md = "how is it built and why", OPERATIONS.md = "how do I run/back up/troubleshoot it", AGENTS.md = "conventions an AI agent needs to not break things". Content is sourced from the actual current codebase (routes, schema, docker-compose.yml, docker-entrypoint.sh), not carried over from stale docs — the old docs are read only to identify what's now wrong.

**Tech Stack:** Markdown only. No tooling changes.

## Global Constraints

- Depends on `docs/superpowers/plans/2026-07-09-repo-cleanup.md` having run first for `SWAGGER_JSDOC_GUIDE.md` removal. **Enforced, not just noted:** Task 1 Step 0 below checks this before any other work starts.
- Every factual claim (env var name, port number, command) must be verified against the actual source file in the same task, not copied from an existing doc without checking.
- `CLAUDE.md` stays a symlink to `AGENTS.md` — do not break that.
- Work on branch `docs/rewrite-core-docs` (or continue on `chore/repo-cleanup` if that PR is still open — either is fine, just don't mix with feature work).
- One commit per document.

---

## Task 1: Audit — build the fact sheet every other task pulls from

**Files:** none created yet — this task's output is used inline in later tasks, not written to disk.

- [ ] **Step 0: Enforce the cross-plan dependency**

Run: `ls SWAGGER_JSDOC_GUIDE.md 2>&1`
Expected: `No such file or directory`. If the file still exists, **stop** — run `docs/superpowers/plans/2026-07-09-repo-cleanup.md` first, or at minimum its Task 5 (dead config/stale docs removal), before continuing here.

- [ ] **Step 1: Extract the current environment variable contract**

Read `backend/.env.example` directly, and cross-reference `docker-compose.yml` for every `${VAR:-default}` usage:

```bash
grep -oP '\$\{[A-Z_]+(:-[^}]*)?\}' docker-compose.yml | sort -u
```

Record: every var name, its default, and whether it's required (no default) or optional.

- [ ] **Step 2: Extract the actual health/monitoring surface**

```bash
grep -n "router\.\(get\|post\)" backend/src/routes/health.routes.ts 2>/dev/null || find backend/src/routes -iname "*health*"
grep -n "healthcheck" docker-compose.yml
```

Record: exact paths (`/api/health`, `/api/health/live`, `/api/health/ready`, `/api/metrics` per AGENTS.md — verify each still exists in `backend/src/routes/`).

- [ ] **Step 3: Extract the actual data/backup story**

```bash
grep -n "DATA_DIR\|DATABASE_URL" docker-compose.yml docker-entrypoint.sh 2>/dev/null
find . -maxdepth 1 -iname "docker-entrypoint.sh" -o -iname "*.sh" | grep -v node_modules
```

Record: where the SQLite file actually lives at runtime (`${DATA_DIR}/chore-ganizer.db` or whatever the real path is), and whether any backup automation currently exists (the old `docs/BACKUP-RESTORE-GUIDE.md` references `backend-v1-archive/backup-scripts/` — confirm there is NO equivalent for the current backend before writing new backup instructions; if none exists, document the manual procedure only, don't invent automation that isn't there).

- [ ] **Step 4: Extract current version/tag state**

```bash
git tag -l | sort -V
git log --oneline main --grep="^feat\|^fix" -20
cat backend/package.json | grep version
```

Record: full tag list with dates (for CHANGELOG reconstruction) and current version.

- [ ] **Step 5: List every doc this plan touches or retires**

```bash
ls README.md CHANGELOG.md AGENTS.md MISSING_FEATURES.md docs/BACKUP-RESTORE-GUIDE.md 2>&1
```

Confirm all exist before starting Task 2.

---

## Task 2: Write `docs/ARCHITECTURE.md`

**Files:**
- Create: `docs/ARCHITECTURE.md`

**Interfaces:**
- Consumes: the fact sheet from Task 1.
- Produces: the doc that AGENTS.md (Task 5) will link to instead of duplicating.

- [ ] **Step 1: Draft the structure**

Required sections (fill each with real content pulled from the code, not placeholders):
1. **Overview** — one paragraph: what the app does, who uses it (parents/children), core value prop (copy the "Core value" line from `.planning/STATE.md` if still accurate, verify it first).
2. **Stack** — backend (Express/TypeScript/Prisma/SQLite/Jest), frontend (React 18/TypeScript/Vite/Tailwind/Vitest), auth (express-session + bcrypt + custom CSRF double-submit-cookie middleware — name `backend/src/middleware/csrf.ts` explicitly).
3. **Monorepo layout** — table of top-level dirs and what's in each, post-cleanup (backend/, frontend/, e2e/, docs/, .planning/) — do NOT list backend-v2/frontend-v2/backend-v1-archive/frontend-v1-archive if the cleanup plan has run; if it hasn't, note them as "scheduled for removal, see repo-cleanup plan".
4. **Backend structure** — one paragraph per: routes → controllers → services → prisma, plus middleware ordering (Helmet → rate limiter → CORS → session → CSRF → routes — verify this against the actual `backend/src/app.ts` middleware registration order at write time, don't assume it hasn't changed).
5. **Frontend structure** — routing (`App.tsx`), data layer (`api/` + TanStack Query hooks in `hooks/`), the `createApiClient()` convention and why it exists (link to the CSRF bug in `docs/project_notes/bugs.md` dated 2026-07-08 as the concrete "why").
6. **Data model** — the core entities and relationships: User, ChoreTemplate, ChoreAssignment, RecurringChore/RecurringOccurrence, PointLog, UserBadge. Pull field names from `backend/prisma/schema.prisma` directly, don't reconstruct from memory.
7. **Auth flow** — login → session cookie → CSRF token fetch-on-GET → CSRF header on mutations. Reference the exact flow already documented in AGENTS.md's "Auth Flow" section, move it here verbatim if still accurate (verify against current `backend/src/middleware/auth.ts` and `csrf.ts`).
8. **Notification flow** — ntfy.sh push, fire-and-forget pattern, where it's triggered from (chore assigned, due soon, badge earned).
9. **Key architectural decisions** — pull the `[v1-rewrite]`, `[v3.1]`, `[v3.2]` decision bullets from `.planning/STATE.md`'s "Accumulated Context > Decisions" section; these are already accurate and vetted, just relocate them here as the permanent home instead of a milestone-scoped state file.

- [ ] **Step 2: Write the file**

Use the structure above. Every code reference (file path, function name, middleware order) must be verified against the live file, not copied from a stale doc.

- [ ] **Step 3: Verify accuracy**

Run: `grep -n "app.use" backend/src/app.ts` and confirm the middleware ordering described in the doc matches exactly.

- [ ] **Step 4: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: add ARCHITECTURE.md — system design reference

Extracted from AGENTS.md's technical sections plus a fresh read of
the current schema, routes, and middleware ordering. Single source
of truth for 'how is this built', separate from AGENTS.md's
AI-agent-conventions focus."
```

---

## Task 3: Write `docs/OPERATIONS.md`

**Files:**
- Create: `docs/OPERATIONS.md`
- Delete: `docs/BACKUP-RESTORE-GUIDE.md` (superseded — dated 2026-03-08, predates the entire v1-rewrite; references `data/chore-ganizer.db` and `backend-v1-archive/backup-scripts/`, both gone or going per the cleanup plan)

**Interfaces:**
- Consumes: the fact sheet from Task 1 (env vars, health endpoints, data path, version bump procedure).

- [ ] **Step 1: Draft the structure**

Required sections:
1. **Starting the app** — `docker compose up -d` vs `./docker-compose.sh up --build -d` and when to use which (pull-from-registry vs local build), verified against the current `docker-compose.yml` and `AGENTS.md`'s existing "Building & Running" section.
2. **Environment variables** — full table from Task 1's fact sheet: name, required/optional, default, purpose. Include `SESSION_SECRET`'s new fail-fast behavior (added in PR #147 — verify `backend/src/app.ts` still has this check) and `APP_VERSION`'s sync requirement.
3. **Version bumps** — the exact procedure from AGENTS.md's "Version Management" section (`backend/package.json` + `frontend/package.json` must match, `.env` `APP_VERSION` must sync), copied here since this is now the operational home for it; AGENTS.md should link here instead of repeating it (handled in Task 5).
4. **Health checks & monitoring** — `/api/health`, `/api/health/live`, `/api/health/ready`, `/api/metrics` — what each returns, how to curl them, what "unhealthy" looks like.
5. **Data & backups** — where the SQLite file actually lives (`${DATA_DIR}/chore-ganizer.db` — verify exact filename against `docker-compose.yml`'s `DATABASE_URL` default), a manual backup procedure (`sqlite3 .backup` or plain file copy — confirm SQLite is safe to copy live or whether the app needs to be stopped first, check for WAL mode in `backend/prisma/schema.prisma`'s datasource block or connection config), and a restore procedure. Do not describe automated/scheduled backups unless Task 1 found an actual cron/script — if none exists, say so explicitly and note it as a gap, don't imply one exists.
6. **Logs** — where backend logs go (stdout, per `docker compose logs -f backend` — confirm no separate log file setup exists).
7. **Common troubleshooting** — pull 3-5 real recurring issues from `docs/project_notes/bugs.md` (e.g. "SESSION_SECRET missing in production" now fails fast instead of silently running insecure — reference the app.ts guard from PR #147) and phrase them as "symptom → cause → fix".
8. **Notification setup** — `NTFY_BASE_URL`/`NTFY_*` vars, what happens when unset (graceful no-op, verified in `backend/src/config/notifications.ts`).
9. **Upgrading between versions** — pull-new-images-and-restart procedure; note that `prisma db push` auto-applies schema changes on container start (no manual migration step), per the existing docker-entrypoint.sh behavior.

- [ ] **Step 2: Write the file**

- [ ] **Step 3: Remove the superseded guide**

```bash
git rm docs/BACKUP-RESTORE-GUIDE.md
```

- [ ] **Step 4: Verify no other doc links to the removed guide**

Run: `grep -rln "BACKUP-RESTORE-GUIDE" --include="*.md" . 2>/dev/null | grep -v node_modules`
Expected: no output after this task's commit (fix any that appear).

- [ ] **Step 5: Commit**

```bash
git add docs/OPERATIONS.md
git commit -m "docs: add OPERATIONS.md, retire stale BACKUP-RESTORE-GUIDE.md

New guide reflects the current DATA_DIR-based deployment (the old
guide referenced data/chore-ganizer.db and backend-v1-archive's
backup scripts, both gone since the v1-rewrite). Covers startup,
env vars, health checks, backups, logs, troubleshooting, and
version upgrades using only what's actually implemented today —
no invented automation."
```

---

## Task 4: Rewrite `README.md`

**Files:**
- Modify: `README.md` (full rewrite)

**Interfaces:**
- Consumes: Tasks 2 and 3's docs (links out to them instead of duplicating content).

- [ ] **Step 1: Draft the structure**

Required sections, in order:
1. **What this is** — 2-3 sentences, family chore tracker, parents/children roles, points/gamification.
2. **Quick start** — the shortest path to a running instance: `docker compose up -d` with the minimal required `.env` (SESSION_SECRET, APP_VERSION). Link to `docs/OPERATIONS.md` for the full picture.
3. **Local development** — condensed version of AGENTS.md's "Local Development" section (backend `npm run dev` on 3010, frontend `npm run dev` on 5173).
4. **Default credentials** — the seeded accounts (dad@home.local etc.) — verify these are still accurate against `backend/prisma/seed.ts` before publishing (a public README with credentials is only appropriate if this is genuinely a private/self-hosted app for the user's own family, which it is — keep this section but note it clearly as dev/first-run defaults to change).
5. **Architecture** — one-paragraph summary + link to `docs/ARCHITECTURE.md`.
6. **Contributing / AI agents** — link to `AGENTS.md`.
7. **License** (if one exists — check for a `LICENSE` file; if none, omit this section rather than inventing one).

- [ ] **Step 2: Verify seeded credentials are current**

Run: `grep -n "email:\|password" backend/prisma/seed.ts`
Confirm against what's written in the README.

- [ ] **Step 3: Write the file**

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README as a lean entry point

Replaces the prior README with a short quick-start that links out to
docs/ARCHITECTURE.md and docs/OPERATIONS.md for depth, instead of
duplicating content that will drift out of sync across three files."
```

---

## Task 5: Reorganize `AGENTS.md`

**Files:**
- Modify: `AGENTS.md` (remove content now owned by ARCHITECTURE.md/OPERATIONS.md, keep and tighten the rest)

**Interfaces:**
- Consumes: Tasks 2 and 3 (links to them for content being removed).

- [ ] **Step 1: Identify what moves out**

From the current `AGENTS.md`, these sections' content now lives in `docs/ARCHITECTURE.md` or `docs/OPERATIONS.md` and should be replaced with a one-line pointer:
- "Version Management" → pointer to `docs/OPERATIONS.md#version-bumps`
- "Environment Setup" → pointer to `docs/OPERATIONS.md#environment-variables`
- "Building & Running" → pointer to `docs/OPERATIONS.md#starting-the-app`
- "Health & Observability" → pointer to `docs/OPERATIONS.md#health-checks--monitoring`
- "Architecture > Stack", "Backend Structure", "Frontend Structure", "Auth Flow", "Notable Environment Variables" → pointer to `docs/ARCHITECTURE.md`

- [ ] **Step 2: Identify what stays (this is the actual point of AGENTS.md)**

Keep and preserve verbatim — these are agent-specific gotchas that don't belong in human-facing docs:
- "Testing Patterns" (mock conventions, integration test DB path, `.spec.ts` vs `.test.ts`)
- "Non-Obvious Conventions" section in full (frontend/backend parameter mapping table, CSRF cookie literal-string rule, `createApiClient()` rule, children-redirect behavior, 401 auto-logout event) — **do not lose the CodeQL literal-cookie-name rule or the `createApiClient()` rule added in PR #146/#147** — these prevent real regressions and are exactly the kind of thing that belongs in an agent-facing doc, not a human one.
- "Project Memory System" sections (both of them — note the duplication and fix it, see Step 3).
- "API Documentation (none — by design)" rationale.

- [ ] **Step 3: Fix the duplicated "Project Memory System" section**

The current `AGENTS.md` has this section twice, verbatim, back to back. Delete the second occurrence.

- [ ] **Step 3a: Fix the stale `PointTransaction` naming**

`AGENTS.md`'s "Key Domain Concepts" section currently reads `**PointTransaction types**: EARNED, BONUS, DEDUCTION, PENALTY, PAYOUT, ADVANCE, ADJUSTMENT`. The actual Prisma model is `PointLog` (verify: `grep -n "model PointLog" backend/prisma/schema.prisma`), not `PointTransaction` — that name doesn't exist anywhere in the schema. Correct it to `**PointLog types**: ...` when this section moves into `docs/ARCHITECTURE.md`'s data model section (Task 2).

- [ ] **Step 4: Write the trimmed file**

- [ ] **Step 5: Verify the symlink still works**

Run: `ls -la CLAUDE.md && diff <(cat CLAUDE.md) <(cat AGENTS.md)`
Expected: symlink intact, content identical (since `CLAUDE.md -> AGENTS.md`).

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md
git commit -m "docs: trim AGENTS.md to agent-specific conventions only

Moves architecture/operations content to the new docs/ARCHITECTURE.md
and docs/OPERATIONS.md (linked, not duplicated). Keeps everything
that's actually agent-facing: testing patterns, non-obvious
conventions, the CSRF/createApiClient gotchas from PR #146/#147, and
the project memory protocols. Also fixes the duplicated 'Project
Memory System' section (was present twice)."
```

---

## Task 6: Regenerate `CHANGELOG.md`

**Files:**
- Modify: `CHANGELOG.md` (append entries; the file currently stops at `[2.1.9] - 2026-03-19`, missing everything from v2.1.10 through v3.2.0)

- [ ] **Step 1: Reconstruct entries from git tags**

Run: `git tag -l --sort=-v:refname | head -10` then for each tag from `v2.1.10` onward: `git log --oneline <previous-tag>..<tag>`

Group commits per tag into Added/Changed/Fixed following the file's existing Keep-a-Changelog format. At minimum, cover: `v2.1.10`, `v3.0.0` (the rewrite), `v3.1.0` (notifications), `v3.2.0` (M1 The Look + M2 The Game).

- [ ] **Step 2: Write entries**

Match the existing format exactly (see the `[2.1.9]` entry already in the file as the template).

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: catch up CHANGELOG.md through v3.2.0

Was stale since [2.1.9] (2026-03-19) — missing v2.1.10, the entire
v1-rewrite (v3.0.0), v3.1.0 Notifications, and v3.2.0 Teen Appeal
Redesign. Reconstructed from git tags and commit history."
```

---

## Task 7: Resolve `MISSING_FEATURES.md`

**Files:**
- Modify or delete: `MISSING_FEATURES.md` (last touched 2026-06-29, during Phase 8 of the rewrite — recent enough to likely still be accurate, needs a content audit rather than a rewrite)

- [ ] **Step 1: Read and cross-check every item**

For each item in the file, check whether it's actually still missing (some may have shipped in M1/M2 since June 29) by grepping the relevant feature area in `backend/src/` and `frontend/src/`.

- [ ] **Step 2: Decide the doc's fate**

If most items are still accurate: keep the file, update stale entries, add a one-line pointer from `docs/ARCHITECTURE.md` or the README.
If most items shipped or the file duplicates `.planning/STATE.md`'s "Deferred Items" table: merge any still-relevant items into that table and delete `MISSING_FEATURES.md`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: audit MISSING_FEATURES.md against current codebase"
```

---

## Task 8: Final cross-link and verification pass

- [ ] **Step 1: Verify no broken internal doc links**

Run: `grep -rohE '\[.*\]\((docs/[a-zA-Z0-9_.-]+\.md|README\.md|AGENTS\.md|CHANGELOG\.md)\)' README.md AGENTS.md docs/*.md | grep -oE '\(.*\)' | tr -d '()' | sort -u` then confirm each resolved path exists with `ls`.

- [ ] **Step 2: Confirm no content was lost, only relocated**

For each section removed from `AGENTS.md` in Task 5, confirm the equivalent content exists in `docs/ARCHITECTURE.md` or `docs/OPERATIONS.md` — diff the old AGENTS.md (via `git show HEAD~6:AGENTS.md` or similar, adjust ref count to before Task 5's commit) against the new set.

- [ ] **Step 3: Push and open PR**

```bash
git push -u origin docs/rewrite-core-docs
gh pr create --base main --title "docs: rewrite README/CHANGELOG/AGENTS.md, add ARCHITECTURE.md + OPERATIONS.md" --body "$(cat <<'EOF'
## Summary
- New docs/ARCHITECTURE.md: system design (stack, structure, data model, auth flow, key decisions) — pulled from a fresh read of the current code, not copied from stale docs.
- New docs/OPERATIONS.md: how to run/maintain the app (env vars, health checks, backups, troubleshooting, upgrades) — replaces docs/BACKUP-RESTORE-GUIDE.md (dated 2026-03-08, referenced paths that no longer exist).
- README.md: rewritten as a lean entry point that links out instead of duplicating.
- AGENTS.md: trimmed to agent-specific conventions only (testing patterns, non-obvious gotchas, memory protocols); also fixes a duplicated section.
- CHANGELOG.md: caught up from [2.1.9] through v3.2.0.
- MISSING_FEATURES.md: audited against current code, updated or merged into .planning/STATE.md's Deferred Items.

## Test plan
- [x] Every internal doc link resolves
- [x] Every factual claim (env vars, ports, health endpoints, middleware order) verified against source, not copied from prior docs
EOF
)"
```

---

## Explicitly out of scope for this plan

- `docs/project_notes/` (bugs.md, decisions.md, key_facts.md, issues.md) — active memory system, not part of this rewrite; OPERATIONS.md's troubleshooting section references it but doesn't duplicate it.
- `.planning/` phase docs — historical record, untouched per the cleanup plan's scope decision.
- Setting up a docs linter/link-checker in CI — worth suggesting as a follow-up, not building here.
