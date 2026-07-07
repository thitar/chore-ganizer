# Handoff: M1 "The Look" — Dark Redesign + Frontend Gamification

**Written:** 2026-07-05, mid-execution, for any agent picking this up cold.
**Executing skill:** `superpowers:subagent-driven-development` (fresh implementer subagent per task, task-reviewer subagent per task, ledger-tracked).

## Where things live

| What | Path |
|---|---|
| Repo | `/home/thitar/dev/chore-ganizer` (no worktree — work happens directly on this checkout) |
| Branch | `feature/m1-the-look`, branched from `main` at `cdbbf20` |
| Spec (design) | `docs/superpowers/specs/2026-07-04-frontend-redesign-design.md` |
| Plan (15 tasks) | `docs/superpowers/plans/2026-07-04-frontend-redesign-m1-the-look.md` |
| SDD ledger | `.superpowers/sdd/progress.md` — **source of truth for what's done**; read this first. **Git-ignored, local to this checkout** — not committed, won't survive a fresh clone or `git clean -fdx`. If it's ever missing, rebuild your understanding from `git log --oneline main..feature/m1-the-look` and this handoff doc instead. |
| SDD scratch (briefs/reports/review diffs) | `.superpowers/sdd/task-N-brief.md`, `task-N-report.md`, `review-BASE..HEAD.diff` — same git-ignored caveat applies |
| GSD state | `.planning/STATE.md`, `.planning/ROADMAP.md` — milestone `v3.2.0 Teen Appeal Redesign`, phase 13 = this plan, phase 14 = M2 "The Game" (not started, not planned in detail yet) |

**Unrelated pre-existing state, do not touch:**
- `.worktrees/phase-04-recurring-chores` — a stale worktree from a much older phase (unrelated milestone), branch `gsd/phase-04-recurring-chores`. Not part of this work.
- `frontend-v2/` (untracked, at repo root) — present since before this session started, not created by this work, purpose unknown to this agent. Left alone.
- Many `fix/*` and `gsd/*` local branches exist from prior milestones — ignore them.

## How to resume

1. Read `.superpowers/sdd/progress.md` in full — it lists Tasks 1–11 with their commit ranges and every Minor finding deferred to the final whole-branch review.
2. Read the plan file's Task 12 section (`docs/superpowers/plans/2026-07-04-frontend-redesign-m1-the-look.md`) to get the next unit of work.
3. Re-invoke `superpowers:subagent-driven-development` (or just continue its loop manually): extract the task brief with `scripts/task-brief` (path below), dispatch an implementer subagent, then a task-reviewer subagent, then log to the ledger.
   - Script location: `/home/thitar/.claude/plugins/cache/claude-plugins-official/superpowers/6.0.3/skills/subagent-driven-development/scripts/task-brief` and `.../scripts/review-package`
4. **Do not re-dispatch Tasks 1–10** — they are implemented, reviewed (some with a fix+re-review round), and committed. Trust the ledger and `git log`, not conversation memory.

## Task-by-task status (15 total in the plan)

| # | Task | Status | Commits |
|---|---|---|---|
| 1 | Foundation: tokens, fonts, base styles | ✅ Done, reviewed | `3492af8` (baseline test-suite repair, see Bugs below) → `df3e035` |
| 2 | Core UI primitives (Button, Card, Avatar, StatCard, PageHeader, EmptyState, Skeleton, Toast) | ✅ Done, reviewed | `297a53c` |
| 3 | Motion: CountUp, ProgressRing, celebrate() | ✅ Done, reviewed | `49cf5b5` |
| 4 | TopNav, BottomTabBar, AppShell | ✅ Done, reviewed + fixed + re-reviewed | `93529fd`, a11y fix `537924c` |
| 5 | Backend `GET /api/points/leaderboard` | ✅ Done, reviewed | `f158cb3` |
| 6 | Frontend leaderboard API/hook/component | ✅ Done, reviewed + fixed + re-reviewed | `3ac8dcc`, a11y fix `fb46476` |
| 7 | Login page restyle | ✅ Done, reviewed | `89b5037` |
| 8 | Dashboard rebuild | ✅ Done, reviewed + test-fixed + re-reviewed twice | `875612f`, test fixes `304650e`, `7d839a9` |
| 9 | My Chores cards + celebration | ✅ Done, reviewed + test-fixed + re-reviewed | `dcf43bf`, test fix `4753218` |
| 10 | Points hero + leaderboard | ✅ Done, reviewed | `c06da1a` |
| 11 | StatusBadge/FilterBar/ConfirmDelete restyle | ⚠️ **Implemented + committed, NOT YET REVIEWED** | `d6a9eb3` |
| 12 | Calendar dark restyle | ⬜ Not started |  |
| 13 | Profile dark restyle | ⬜ Not started |  |
| 14 | Parent pages restyle (Templates, Recurring, Assignments, Users) | ⬜ Not started |  |
| 15 | Cleanup, remove legacy NavBar, full verification, E2E, version bump | ⬜ Not started |  |

### Task 11 detail — pick this up first

The implementer subagent for Task 11 died mid-task from hitting its own session usage limit. It had correctly written all three files (matching the brief exactly) but died **before** adding `import { Button } from './ui/Button'` to `ConfirmDelete.tsx` (left `tsc` broken) and before writing its report or running final verification.

The controller (this session) found the partial diff, added the missing import line, verified `npx tsc --noEmit` clean and `npm test` 106/106 green, and committed as `d6a9eb3`. **No task-reviewer subagent has evaluated this diff.** Next step: generate the review package (`scripts/review-package 4753218 d6a9eb3` — wait, check: the actual base is `c06da1a` since that's Task 10's head) and dispatch a task-reviewer per the brief at `.superpowers/sdd/task-11-brief.md`, using the standard reviewer prompt template. If it comes back clean, log it to the ledger and continue to Task 12. If it finds issues, dispatch a fix subagent as usual.

Correct base/head for the review package: **base `c06da1a`, head `d6a9eb3`**.

## Bugs found and fixed along the way (not part of the plan, but load-bearing)

1. **Prisma schema duplicate fields** — fixed on `main` at commit `fe8496f`, i.e. *before* `feature/m1-the-look` was branched off (merge-base is `cdbbf20`, which is after `fe8496f`), so this fix is already inherited by the feature branch. `backend/prisma/schema.prisma` had `dueNotifiedAt DateTime?` declared twice in both `ChoreAssignment` and `RecurringOccurrence` (merge artifact from the v3.1.0 notifications milestone). This broke `prisma validate`, which would have broken the Docker entrypoint's `prisma db push` on next deploy. Logged in `docs/project_notes/bugs.md`.
2. **Frontend test suite was silently broken on `main`** (commit `3492af8`, done as part of Task 1's baseline verification). Two independent problems:
   - `.gitignore` had an unanchored `test/` pattern that swallowed `frontend/src/test/` — `setup.ts` was never committed, so all 10 test files failed to load with "Cannot find module." Fixed by anchoring to `/test/` and restoring `setup.ts` from git history.
   - Three test files (`CalendarPage`, `AssignmentsPage`, `MyChoresPage`) hardcoded June 2026 fixtures and asserted on "current month" — they silently started failing once the calendar rolled into July. Fixed with `vi.useFakeTimers({ now: new Date('2026-06-15...'), toFake: ['Date'] })` in each file's `beforeEach`.
   - Both logged in `docs/project_notes/bugs.md`.

## GSD tracking state

`.planning/STATE.md` and `.planning/ROADMAP.md` were updated to register this work as milestone **v3.2.0 "Teen Appeal Redesign"**, Phase 13 = "M1 The Look" (this plan, in progress), Phase 14 = "M2 The Game" (backend streaks/levels/badges — outlined in the spec's Milestone 2 section but **not planned in detail**; write that plan only after M1 ships and the actual users — two teenagers — give feedback). Update `STATE.md`'s `current_phase`/`status`/`last_activity` fields as you complete further tasks; mark phase 13 complete and flip to phase 14 only when Task 15 (cleanup + verification) is done.

## Deferred Minor findings (read before the final whole-branch review)

Every task review surfaced a few Minor (non-blocking) findings, deliberately **not** fixed inline — they're recorded in `.superpowers/sdd/progress.md` under each task and are meant to be triaged together at the final whole-branch review (after Task 15, per the `subagent-driven-development` skill's process). Notable ones an implementer of Tasks 12-15 should be aware of because they touch shared code:
- `ProgressRing`'s SVG gradient uses a hardcoded `id="progress-ring-gradient"` — will collide if the Calendar or Profile page ever renders two rings at once (currently only Dashboard uses one).
- The reduced-motion CSS gate for `ProgressRing`'s stroke transition doesn't exist yet (only `CountUp`/`celebrate()` are gated) — consider a global `@media (prefers-reduced-motion: reduce)` reset in `frontend/src/index.css` if Task 12+ introduces more rings.
- Login/labels lack `htmlFor`/`id` association — pre-existing, not fixed, worth a dedicated a11y pass across all forms (Profile page's form in Task 13 is a good place to establish the right pattern going forward, since it's untouched so far).

## Verification commands (unchanged throughout)

```bash
cd frontend && npm test          # baseline as of Task 11: 106 tests, 15 files, all passing
cd frontend && npx tsc --noEmit  # must be clean
cd backend && npm test           # 213 tests passing (unaffected by frontend tasks)
```

## What's NOT done yet (do not report M1 complete until these land)

- Tasks 12–14: Calendar, Profile, and the four parent-only pages (Templates, Recurring, Assignments, Users) still show the **old light theme** — they use the legacy `NavBar` component, not `AppShell`. This is expected mid-milestone; the plan's Global Constraints call for restyling every page.
- Task 15: legacy `NavBar.tsx` removal, the `primary` Tailwind alias removal, E2E test fixes for the new nav, a manual phone-viewport pass, and the version bump (`backend/package.json` + `frontend/package.json` + `.env` `APP_VERSION`, per this repo's version-management convention in `AGENTS.md`).
- The final whole-branch code review (via `superpowers:requesting-code-review`'s reviewer template) has not run — it happens once, after Task 15, per the `subagent-driven-development` skill.
- After the whole-branch review and any resulting fixes, use `superpowers:finishing-a-development-branch` to decide how to land this (PR vs. merge vs. further cleanup) — do not push or open a PR unilaterally; that skill will prompt for the human's preference.
