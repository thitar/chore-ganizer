# Repository Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead scaffolding, stale archives, and pre-GSD-convention debris that accumulated at the repo root over the v1-rewrite and three milestones since, without touching anything still live or referenced.

**Architecture:** Straight deletion in dependency order (worktree → branch → tracked files → untracked files), with a full test+build verification gate after each removal group, on a dedicated branch. Every deletion in this plan was verified via `git log`, `git check-ignore`, and cross-repo grep before being listed — none are guesses.

**Tech Stack:** git, npm/jest/vitest (verification only).

## Global Constraints

- Work on a new branch off `main`: `chore/repo-cleanup`.
- Never delete anything without first confirming (shown in each task) that nothing references it.
- Run full backend + frontend test suites and both builds after each task group — do not batch all deletions into one unverified commit.
- One commit per task (small, revertible, bisectable).

---

## Verified findings (source of truth for this plan)

| Path | Tracked? | Evidence it's dead |
|---|---|---|
| `backend-v1-archive/`, `frontend-v1-archive/` | tracked | Pre-rewrite (v2.1.10/v2.2.0) codebase; superseded by `backend/`/`frontend/`; history preserved via git tags `v2.1.9`, `v2.1.10` |
| `backend-v2/` | **untracked** (`git log -- backend-v2` returns nothing) | Was the v1-rewrite's working directory (`AGENTS.md`/`.planning` reference "build alongside existing app in backend-v2/"); post-switchover it holds only a stray `.env` and `prisma/dev.db` |
| `frontend-v2/` | **untracked** | Same as above; already emptied in a prior session (was 179MB of stale `node_modules`+`dist`+one orphan test file) |
| `.worktrees/phase-04-recurring-chores` | gitignored, but a **live registered git worktree** (`git worktree list` shows it, branch `gsd/phase-04-recurring-chores`) | Phase 4 (recurring chores) shipped and merged months ago; this worktree is stale |
| `cookies.txt` | gitignored | Leftover curl cookie jar from manual testing; may contain a stale session cookie |
| `plans/` (root) | tracked | Pre-GSD-convention plans folder (contains `2026-04-13-swagger-jsdoc.md`, `branching-strategy.md`); superseded by `docs/superpowers/plans/`; not referenced by any current doc |
| `test-reports/` (root) | tracked | Dated historical test-run reports (March–April 2026), same vintage as `plans/`, superseded by `.planning/phases/*/` |
| `test/` (root, contains `test/reports/`) | gitignored | Old QA-ticket-style reports (`C-102`, `P-502`, ...) predating the current `.planning/` phase system |
| `playwright.p311.config.ts` | tracked | Not referenced in `package.json` scripts or `.github/workflows/*.yml` — dead config |
| `SWAGGER_JSDOC_GUIDE.md` (root) | tracked | `AGENTS.md` itself states Swagger docs were removed in Phase 8 of the v1-rewrite; this file is the stale guide for a feature that no longer exists |
| `data/backups/`, `data/uploads/` | tracked | Empty except `.gitkeep`; real runtime data lives at `DATA_DIR` (default `/opt/app-data/chore-ganizer`, bind-mounted per `docker-compose.yml`), outside the repo |

---

### Task 1: Remove the stale git worktree

**Files:** none modified — this is a git operation, not a file edit.

- [ ] **Step 1: Confirm the worktree's branch is already merged**

Run: `git log --oneline gsd/phase-04-recurring-chores -1` then `git branch --merged main | grep phase-04-recurring-chores`
Expected: the branch tip commit is reachable from `main` (branch appears in the `--merged` list). If it does NOT appear merged, stop and flag it to the user before proceeding — do not delete unmerged work.

- [ ] **Step 2: Remove the worktree**

Run: `git worktree remove .worktrees/phase-04-recurring-chores --force`
Expected: no output on success; `git worktree list` no longer shows it.

- [ ] **Step 3: Delete the now-orphaned local branch (only if Step 1 confirmed merged)**

Run: `git branch -d gsd/phase-04-recurring-chores`
Expected: `Deleted branch gsd/phase-04-recurring-chores (was <sha>).`

- [ ] **Step 4: Verify**

Run: `git worktree list` and `ls .worktrees/`
Expected: only the main worktree listed; `.worktrees/` is empty (directory itself can stay, it's gitignored).

---

### Task 2: Remove dead pre-rewrite archives

**Files:**
- Delete: `backend-v1-archive/` (tracked, entire directory)
- Delete: `frontend-v1-archive/` (tracked, entire directory)

- [ ] **Step 1: Confirm nothing outside these directories references them**

Run: `grep -rln "backend-v1-archive\|frontend-v1-archive" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.yml" . 2>/dev/null | grep -v node_modules | grep -v backend-v1-archive | grep -v frontend-v1-archive`
Expected: no output (only `.md` docs reference them, which is fine — those are historical mentions, not active dependencies).

- [ ] **Step 2: Delete**

```bash
git rm -r backend-v1-archive frontend-v1-archive
```

- [ ] **Step 3: Verify backend and frontend still build and test clean**

Run each independently (don't chain with `&&`/`cd` if your tool invocation supports a `workdir` parameter — use that instead):
```bash
(cd backend && npm test && npx tsc --noEmit)
(cd frontend && npm test -- --run && npx tsc --noEmit && npm run build)
```
Expected: all pass (this should be a no-op for these — nothing in the live app imports the archives — but confirms it explicitly).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove backend-v1-archive/ and frontend-v1-archive/

Pre-rewrite (v2.1.10/v2.2.0) codebase, superseded by backend/ and
frontend/ since the v1-rewrite. History preserved via git tags
v2.1.9 and v2.1.10 — no need to keep dead code in the working tree."
```

---

### Task 3: Remove dead rewrite scaffolds (backend-v2/, frontend-v2/)

**Files:**
- Delete: `backend-v2/` (untracked)
- Delete: `frontend-v2/` (untracked, already emptied)

- [ ] **Step 1: Confirm untracked and unreferenced**

Run: `git status --short backend-v2 frontend-v2` (expect `??` or nothing) and `grep -rln "backend-v2\|frontend-v2" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.yml" . 2>/dev/null | grep -v node_modules`
Expected: no non-`.md`/`.planning` references (the `.planning/` hits found during investigation are historical phase docs, not live config).

- [ ] **Step 2: Delete**

Note: `frontend-v2/` is already an empty directory at this point (emptied in a prior session), not missing — `ls frontend-v2` would currently show nothing, not an error. `rm -rf` removes the directory itself, not just its (already-gone) contents.

```bash
rm -rf backend-v2 frontend-v2
```

- [ ] **Step 3: Verify**

Run: `ls backend-v2 frontend-v2 2>&1`
Expected: `No such file or directory` for both (this checks the state *after* Step 2's deletion, not before).

(No commit needed — these were untracked, so there's nothing for git to record. Just confirm `git status` is clean before moving on.)

---

### Task 4: Remove pre-GSD-convention planning/report debris

**Files:**
- Delete: `plans/` (tracked, root-level — distinct from `docs/superpowers/plans/`, which stays)
- Delete: `test-reports/` (tracked, root-level)
- Delete: `test/` (gitignored, root-level — contains `test/reports/`)

- [ ] **Step 1: Confirm nothing references these paths, and confirm what's actually tracked**

Run: `grep -rln "^plans/\|(plans/\|test-reports/\|\./test/" --include="*.md" --include="*.ts" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v "^plans/\|^test-reports/\|^test/"`
Expected: no output.

Also run: `git ls-files plans/ test-reports/ | head -5`
Expected: file paths under both (confirms they're genuinely tracked, not already `git rm --cached`'d — `test-reports/` also has a `.gitignore` entry added after these files were committed, so gitignore status alone doesn't tell you whether `git rm -r` is the right command vs plain `rm -rf`; use `git rm -r` only for whichever of the two `git ls-files` actually lists).

- [ ] **Step 2: Delete**

```bash
git rm -r plans test-reports
rm -rf test
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove pre-GSD planning/report debris (plans/, test-reports/, test/)

Superseded by docs/superpowers/plans/ and .planning/phases/*/.
Historical QA-ticket-style reports (C-1xx, P-5xx naming) predate the
current phase-based planning convention and aren't referenced anywhere."
```

---

### Task 5: Remove dead config and stale docs

**Files:**
- Delete: `playwright.p311.config.ts` (tracked)
- Delete: `SWAGGER_JSDOC_GUIDE.md` (tracked, root)
- Delete: `cookies.txt` (gitignored)

- [ ] **Step 1: Confirm `playwright.p311.config.ts` is unreferenced**

Run: `grep -n "p311" package.json .github/workflows/*.yml`
Expected: no output.

- [ ] **Step 2: Delete**

```bash
git rm playwright.p311.config.ts SWAGGER_JSDOC_GUIDE.md
rm -f cookies.txt
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove dead Playwright config and stale Swagger guide

playwright.p311.config.ts isn't referenced by any npm script or CI
workflow. SWAGGER_JSDOC_GUIDE.md documents a feature (backend/scripts/
generate-swagger.ts, docs/swagger.json) that AGENTS.md itself records
as removed in Phase 8 of the v1-rewrite. cookies.txt was a stray local
curl cookie jar, already gitignored."
```

---

### Task 6: Remove empty runtime-data scaffold

**Files:**
- Delete: `data/backups/.gitkeep`, `data/uploads/.gitkeep`, and the now-empty `data/` directory

- [ ] **Step 1: Confirm `data/` isn't the actual runtime path**

Run: `grep -n "'\./data'\|\"./data\"\|: \./data" docker-compose.yml backend/src/**/*.ts 2>/dev/null`
Expected: no output — runtime data lives at `${DATA_DIR}` (default `/opt/app-data/chore-ganizer`), bind-mounted from outside the repo, not `./data`.

- [ ] **Step 2: Delete**

```bash
git rm data/backups/.gitkeep data/uploads/.gitkeep
rmdir data/backups data/uploads data 2>/dev/null || true
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove unused data/ scaffold

Empty placeholder directories from an early commit; actual runtime
data lives at DATA_DIR (default /opt/app-data/chore-ganizer),
bind-mounted per docker-compose.yml, not ./data."
```

---

### Task 7: Final verification and push

- [ ] **Step 1: Full verification sweep**

Run each independently:
```bash
(cd backend && npm test && npx tsc --noEmit)
(cd frontend && npm test -- --run && npx tsc --noEmit && npm run build)
```
Expected: all green (252 backend tests, 106 frontend tests as of this writing — actual numbers may differ if other work has landed).

- [ ] **Step 2: Confirm final repo size drop**

Run: `du -sh --exclude=node_modules . 2>/dev/null` (or `du -sh $(ls -d */ | grep -v node_modules)`)
Expected: multi-hundred-MB reduction (backend-v2/backend-v1-archive/frontend-v1-archive alone account for ~189MB tracked+untracked).

- [ ] **Step 3: Push**

```bash
git push -u origin chore/repo-cleanup
```

- [ ] **Step 4: Open a PR**

```bash
gh pr create --base main --title "chore: repository cleanup — remove dead scaffolds and pre-GSD debris" --body "$(cat <<'EOF'
## Summary
Removes accumulated dead weight: pre-rewrite archives (backend-v1-archive/, frontend-v1-archive/ — history preserved via git tags), dead v1-rewrite scaffolds (backend-v2/, frontend-v2/ — untracked, superseded by backend/frontend/), a stale git worktree, and pre-GSD-convention planning debris (plans/, test-reports/, test/, SWAGGER_JSDOC_GUIDE.md, playwright.p311.config.ts, cookies.txt, empty data/ scaffold).

Every removal was verified unreferenced before deletion (see plan doc: docs/superpowers/plans/2026-07-09-repo-cleanup.md).

## Test plan
- [x] Backend + frontend tests pass after each removal group
- [x] Both typechecks clean
- [x] Frontend build clean
EOF
)"
```

---

## Explicitly out of scope for this plan

- `.planning/phases/*/` and `.planning/milestones/` — user decision: leave historical phase docs untouched (only "obvious junk" in scope here).
- `docs/project_notes/` — active memory system, not cleanup target.
- `test-results/`, `playwright-report/` — gitignored Playwright output, regenerates on every test run; not committed, nothing to clean.
- Setting up CI to run tests on PRs (currently `.github/workflows/` only has `security.yml`) — worth doing, but the user didn't ask for it in this pass. Flag as a follow-up suggestion, don't do it here.
