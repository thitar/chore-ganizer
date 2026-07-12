# Plan Issues - 2026-07-09

Issues found during review of the three plans created on 2026-07-09. Plans reviewed:
- `2026-07-09-uat-plan.md`
- `2026-07-09-docs-rewrite.md`
- `2026-07-09-repo-cleanup.md`

---

## UAT Plan Issues

### 1. Task 1 Step 1 — Vague reference to session notes
**Location:** `2026-07-09-uat-plan.md` line 26
**Issue:** Says "Follow the pattern already used in this session (see `docs/project_notes/issues.md`, 2026-07-09 entries, for the exact commands)" — this is fragile. An agent executing this plan may not find sufficiently detailed commands in that file, or the entries may be terse session notes rather than reproducible instructions.
**Suggestion:** Include the actual commands inline in the plan (the isolated DATABASE_URL, PORT=3011, vite proxy target pattern) rather than deferring to a memory file.

### 2. Task 4 — Missing NODE_ENV constraint for CSRF testing
**Location:** `2026-07-09-uat-plan.md` lines 151-211
**Issue:** The plan claims `m2-the-game.spec.ts` is "the first e2e coverage that exercises CSRF through a real browser + real axios instance end to end" and that "Backend unit tests bypass CSRF under NODE_ENV=test." However, the plan never explicitly states that the e2e environment must NOT set `NODE_ENV=test`. If the Playwright config or the test runner sets `NODE_ENV=test`, the CSRF middleware will be bypassed and the test will pass without actually exercising CSRF — defeating the entire purpose.
**Suggestion:** Add a global constraint or a note in Task 4 Step 1: "The backend must be running with `NODE_ENV != test` for CSRF to be enforced. Verify this before running the spec."

### 3. Task 5 Step 1 item 7 — Notifications testing requires external service
**Location:** `2026-07-09-uat-plan.md` line 231
**Issue:** The manual checklist says "verify a chore-assigned push arrives, verify a badge-earned push arrives (real ntfy server, per the pattern used in PR #146's verification)." This requires a real ntfy.sh server and topic, which may not be available in all testing environments. The checklist should acknowledge this dependency and provide fallback instructions (e.g., "skip if ntfy is not configured").
**Suggestion:** Add a prerequisite note: "Requires NTFY_BASE_URL configured in .env and a subscribed topic. If not configured, skip notification items."

---

## Docs Rewrite Plan Issues

### 1. Task 2 Step 1 item 9 — References non-existent `.planning/STATE.md`
**Location:** `2026-07-09-docs-rewrite.md` line 93
**Issue:** Says "pull the `[v1-rewrite]`, `[v3.1]`, `[v3.2]` decision bullets from `.planning/STATE.md`'s 'Accumulated Context > Decisions' section." However, `.planning/STATE.md` does not exist (verified via glob). This step will fail at execution time.
**Suggestion:** Either (a) identify the actual file containing these decisions (likely in `.planning/milestones/` or `docs/project_notes/decisions.md`), or (b) remove this sub-step and have the agent research decisions from `docs/project_notes/decisions.md` and git history instead.

### 2. Task 1 Step 1 — Inconsistent sandbox handling
**Location:** `2026-07-09-docs-rewrite.md` line 27
**Issue:** Says "Run: `cat backend/.env.example` (or if denied by sandbox, ask the user to paste it)". The plan is intended for agentic workers who should be able to read files directly. The sandbox fallback instruction is inconsistent with the plan's execution model — an agent should just use the Read tool.
**Suggestion:** Simplify to: "Read `backend/.env.example` and cross-reference with `docker-compose.yml` for every `${VAR:-default}` usage."

### 3. Cross-plan dependency not enforced
**Location:** `2026-07-09-docs-rewrite.md` line 13
**Issue:** The plan says "Depends on `docs/superpowers/plans/2026-07-09-repo-cleanup.md` having run first for `SWAGGER_JSDOC_GUIDE.md` removal." This dependency is only acknowledged in text, not enforced. If an agent runs the docs-rewrite plan before the cleanup plan, it may reference or duplicate content about Swagger that should be removed.
**Suggestion:** Add a check at the start of Task 1: "Verify `SWAGGER_JSDOC_GUIDE.md` no longer exists at the repo root. If it does, run the repo-cleanup plan first or skip Swagger references."

---

## Repo Cleanup Plan Issues

### 1. Task 2 Step 3 — Fragile `cd` chain in verification command
**Location:** `2026-07-09-repo-cleanup.md` line 83
**Issue:** The verification command uses `cd backend && npm test && npx tsc --noEmit && cd ../frontend && npm test -- --run && npx tsc --noEmit && npm run build`. This is a long shell chain that may not work as expected in all contexts (e.g., if the agent uses a `workdir` parameter, the `cd` commands become redundant or conflicting).
**Suggestion:** Split into two separate commands with explicit `workdir` parameters, or note that the agent should run backend and frontend verification separately.

### 2. Task 4 — `test-reports/` tracked vs gitignored nuance
**Location:** `2026-07-09-repo-cleanup.md` line 30
**Issue:** The verified findings table says `test-reports/` is "tracked" and the `.gitignore` has `test-reports/` on line 44. This means the files were committed before the gitignore rule was added. The plan's grep verification (Step 1) checks for references but doesn't confirm the files are actually tracked via `git ls-files`. If the files are somehow untracked (e.g., someone ran `git rm --cached`), the `git rm -r test-reports` command would fail.
**Suggestion:** Add `git ls-files test-reports/` to Step 1's verification to confirm the files are tracked.

### 3. Task 3 — `frontend-v2/` already empty
**Location:** `2026-07-09-repo-cleanup.md` lines 101-102
**Issue:** The plan says `frontend-v2/` is "already emptied in a prior session (was 179MB of stale `node_modules`+`dist`+one orphan test file)." Verified: the directory exists but is empty. The plan's Step 2 (`rm -rf backend-v2 frontend-v2`) will work, but Step 3's verification (`ls backend-v2 frontend-v2 2>&1` expecting "No such file or directory") is slightly misleading — `frontend-v2` will show as an empty directory until removed, not "No such file or directory."
**Suggestion:** The verification should check that both directories are gone after `rm -rf`, not before. The current plan structure is correct (Step 2 deletes, Step 3 verifies), but the expected output description should note that `frontend-v2` is empty before deletion.

---

## Cross-Plan Issues

### 1. AGENTS.md duplicated "Project Memory System" section
**Not a plan issue, but noted for awareness:** The current `AGENTS.md` has the "Project Memory System" section duplicated verbatim (lines 42-72 and lines 74-104). The docs-rewrite plan correctly identifies this in Task 5 Step 3 and plans to fix it. This is a valid finding.

### 2. Schema model names verified correct
**For awareness:** The docs-rewrite plan's Task 2 Step 1 item 6 lists `User, ChoreTemplate, ChoreAssignment, RecurringChore/RecurringOccurrence, PointLog, UserBadge`. Verified against `backend/prisma/schema.prisma` — these are the actual model names. The current `AGENTS.md` incorrectly references "PointTransaction" in the Key Domain Concepts section; the schema uses "PointLog". The docs-rewrite plan should catch this discrepancy.

---

## Summary

| Plan | Critical | Moderate | Minor |
|------|----------|----------|-------|
| UAT Plan | 1 (NODE_ENV/CSRF) | 1 (vague reference) | 1 (ntfy dependency) |
| Docs Rewrite | 1 (missing STATE.md) | 1 (cross-plan dep) | 1 (sandbox handling) |
| Repo Cleanup | 0 | 1 (cd chain) | 2 (gitcheck nuance, empty dir) |
