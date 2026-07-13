# Architectural Decisions

Date-ordered Architectural Decision Records (ADRs).

## Tips

- Number decisions sequentially (ADR-001, ADR-002, etc.)
- Always include date for context
- Be honest about trade-offs
- Keep alternatives brief but clear
- Update decisions if they're revisited or changed
- Focus on "why" not "how"

---

### ADR-001: sendNtfy Returns Promise<boolean> Instead of void (2026-07-04)

**Context:**
- `sendNtfy()` needed to signal success/failure to callers who await the result
- The due-soon sweep function needs to know if notification succeeded before marking `dueNotifiedAt`
- Higher-level wrappers (`notifyChoreAssigned`, `notifyChoreCompleted`) should remain fire-and-forget via `void`

**Decision:**
- `sendNtfy()` returns `Promise<boolean>` — `true` on success, `false` on failure/noop
- Domain wrappers call `void sendNtfy(...)` to fire-and-forget
- The sweep function `notifyDueSoon()` `await`s the result

**Alternatives Considered:**
- Always fire-and-forget → Rejected: sweep needs to know for dedup
- Use callback/event pattern → Overengineered for this use case
- Throw on failure → Contradicts "never throw" requirement (NOTIFY-06)

**Consequences:**
- ✅ Callers can choose to await or fire-and-forget
- ✅ Simple API — just a boolean return
- ❌ Domain wrappers need `void` prefix (easy to forget)

### ADR-002: Use AbortController Instead of AbortSignal.timeout() (2026-07-04)

**Context:**
- Need to timeout ntfy.sh HTTP requests after 3 seconds
- `AbortSignal.timeout(3000)` is concise but requires Node 18.5+

**Decision:**
- Use `AbortController` + `setTimeout(..., 3000)` pattern
- Compatible with Node 18.0+

**Alternatives Considered:**
- `AbortSignal.timeout(3000)` → Requires Node 18.5+, our minimum target is Node 18.0
- `fetch` with manual timeout → More boilerplate

**Consequences:**
- ✅ Works on all Node 18.x versions
- ✅ Familiar pattern
- ❌ Slightly more verbose (3 lines vs 1)

### ADR-003: jest.spyOn() Over jest.resetModules() for Isolated Mocking (2026-07-04)

**Context:**
- Test for "ntfy disabled" scenario needed to mock `isNtfyConfigured` to `false`
- Initial approach used `jest.resetModules()` + `jest.doMock()` pattern

**Decision:**
- Use `jest.spyOn()` on the specific module export instead of resetting the whole module registry
- Scoped with `beforeEach`/`afterEach` cleanup via `jest.restoreAllMocks()`

**Alternatives Considered:**
- `jest.resetModules()` + `jest.doMock()` → Causes cross-test pollution (see bugs.md)
- Separate test file with `jest.isolateModules()` → Works but is heavyweight
- Dependency injection → Would require refactoring all service files

**Consequences:**
- ✅ No cross-test pollution
- ✅ Simple, readable test setup
- ✅ Works with existing module structure
- ❌ Only works for functions, not module-level constants

### ADR-004: isNtfyConfigured Re-exported from notification.service.ts (2026-07-04)

**Context:**
- `config/notifications.ts` defines `isNtfyConfigured` boolean
- `assignment.service.ts` needs to check it before firing notifications in the sweep function

**Decision:**
- `notification.service.ts` re-exports `isNtfyConfigured` from `config/notifications.ts`
- `assignment.service.ts` imports it from `notification.service`, not directly from `config`

**Alternatives Considered:**
- Import directly from `config/notifications` → Works but couples assignment service to config internals
- Pass as parameter → Verbose, requires changing function signatures

**Consequences:**
- ✅ Clean import path: all notification concerns go through `notification.service`
- ✅ Easy to mock in tests (one module to spy on, not two)
- ❌ Adds one re-export line per config value used externally

### ADR-009: POST /api/auth/login Returns 400 (Not 401) for an Empty/Malformed Body (2026-07-13)

**Context:**
- Adding `validate(loginSchema)` to `auth.routes.ts` (closing the "no Zod validation on 4 of 7 route modules" gap, see ADR/CONCERNS history) changed behavior for one specific edge case: a request body missing `email`/`password`, or with either as an empty string.
- Previously, that body reached `authService.login()` directly, which did a Prisma lookup for a nonexistent user and threw a 401 `AppError('Invalid credentials')`.
- Now Zod rejects the malformed shape before the handler runs, returning `400 VALIDATION_ERROR` instead.
- A code review flagged this as a real, observable API contract change and asked whether it should be preserved.

**Decision:**
- Keep the new 400 behavior. A missing/empty `email` or `password` is a malformed request, not a wrong credential — 400 is the more semantically correct status code, and this is the same trade-off already made for every other route that gained Zod validation in this pass (`users`, `recurring`).
- Do not special-case `auth.routes.ts` to preserve the old 401-for-empty-body behavior — that would mean either skipping validation for empty values (defeating the point of adding it) or adding bespoke logic solely to keep a status code stable.

**Alternatives Considered:**
- Have `loginSchema` never reject anything, delegating all checks (including presence) to `authService.login()` → Rejected: reduces the new validation to a no-op for the most common malformed-request case.
- Catch the Zod rejection for this route only and re-throw as a 401 → Rejected: extra special-case code to preserve a status code nothing currently depends on.

**Consequences:**
- ✅ Consistent 400/`VALIDATION_ERROR` envelope for malformed request bodies across all routes with Zod validation, including auth.
- ✅ No bespoke logic needed in `auth.routes.ts`.
- ❌ Any external caller (frontend error-branching, monitoring/alerting keyed on 401 vs 400 for `/login`) that distinguishes these two codes for an empty-body request would see a change. Checked: no current test, e2e spec, or frontend code branches on this specific case.
- If this ever needs revisiting, the frontend's `auth.api.ts` `AuthError` handling (see `AGENTS.md`'s "401 responses" note) is the first place to check for status-code-specific branching.

### ADR-008: In-Memory Session Store — Accepted Trade-off, Not a Bug (2026-07-13)

**Context:**
- `backend/src/app.ts` uses `express-session`'s default in-memory `MemoryStore`, not Redis or a DB-backed store.
- Consequence: every backend restart (deploy, crash-restart, `docker compose up -d --force-recreate`) invalidates every logged-in session — the whole family gets logged out simultaneously.
- Flagged repeatedly across reviews (PR146-REVIEW-3, `CONCERNS.md`) as a "medium" item, never actually fixed.

**Decision:**
- Keep the in-memory store. This is a single-family homelab app on one backend instance — there is no horizontal scaling, and a restart-triggered re-login for 4-8 family members is a minor inconvenience, not an incident.
- Do not add Redis (or any external session store) purely to solve this — it would add an operational dependency (another container, another failure mode to monitor) to remove an inconvenience that costs each user one login form.

**Alternatives Considered:**
- Redis-backed session store → Rejected: real infra cost (extra container, backup/restore surface) for a cosmetic-scale problem at this app's size.
- SQLite-backed session store (reuse existing DB) → Deferred, not rejected: cheaper than Redis since no new service is needed, but not worth doing without a concrete trigger (e.g. restarts becoming frequent enough that re-logins are a real nuisance).

**Consequences:**
- ✅ Zero added infrastructure or failure modes.
- ✅ Matches the app's actual deployment shape (one backend instance, one family).
- ❌ A restart (deploy, crash, manual recreate) logs everyone out; already documented as expected behavior, not a defect.
- If the app ever moves to multi-instance/horizontal scaling, this decision must be revisited first — in-memory sessions do not work across multiple backend processes.

### ADR-007: `PARTIALLY_COMPLETE` Status — Documented, Deferred to Future Development (2026-07-13)

**Context:**
- `schema.prisma`, `ARCHITECTURE.md`, and `key_facts.md` all list `PARTIALLY_COMPLETE` as a valid `ChoreAssignment`/`RecurringOccurrence` status alongside `PENDING`/`COMPLETED`.
- No current code path (service, route, or frontend) ever writes `PARTIALLY_COMPLETE` — it exists in the documented value set but has no producer.
- Unclear from history whether this was speculative schema design ahead of a feature, or a partially-implemented feature that never shipped.

**Decision:**
- Leave `PARTIALLY_COMPLETE` in the schema and docs as a reserved, not-yet-implemented status — do not remove it, and do not implement it opportunistically as a side effect of unrelated work.
- Treat "what counts as partial completion for a chore" (sub-tasks? parent approval step? partial point award?) as a real product decision that needs its own design pass, not something to guess at while fixing something else.
- Any future work that touches assignment/occurrence completion should assume `PARTIALLY_COMPLETE` is planned-but-inert, not dead code to delete.

**Alternatives Considered:**
- Remove the unused status now → Rejected: no evidence it's unwanted, just unfinished; removing it would just mean re-adding it later with the same open design questions.
- Implement a minimal version now → Rejected: no defined product behavior exists for what "partial" means here; guessing risks building the wrong thing.

**Consequences:**
- ✅ No wasted implementation effort building an undesigned feature.
- ✅ Docs no longer read as an inconsistency/bug — they reflect a known, intentional gap.
- ❌ The status remains inert until someone actually designs and implements it.

### ADR-006: Lazy Self-Healing Cache Pattern for lifetimePoints (2026-07-10)

**Context:**
- PR #146 deferred `User.lifetimePoints` caching, claiming "needs a schema migration + backfill against live data"
- The app has no migration tooling — only schema-push (Prisma db push)
- Yet `streakCount` was already cached successfully using a lazy pattern

**Decision:**
- Use the exact same nullable-sentinel pattern as `streakCount`:
  - Add `lifetimePoints: Int` and `lifetimePointsSyncedAt: DateTime?` to User schema
  - Treat `NULL` `lifetimePointsSyncedAt` as "never synced"; on first read, backfill from `PointLog.aggregate()`
  - This self-heal-on-first-read *is* the backfill — no separate migration script needed
  - Increment cache in the same transaction as every positive PointLog write (complete, adjustment, etc.)
  - Negative entries (REVERSED, negative ADJUSTMENT) excluded, matching existing amount>0 filter semantics

**Alternatives Considered:**
- Full schema migration + offline backfill script → Rejected: not viable without migration tooling; risk of data loss
- Lazy recomputation on read (no cache) → Too expensive; defeats the purpose
- Keep PR #146's acceptance of duplicate queries → Fine for current scale; premature to pay migration cost

**Consequences:**
- ✅ Zero-downtime deployment: existing users self-heal on first read post-deploy
- ✅ Matches project's existing pattern (streakCount); maintainable
- ✅ No separate migration script; schema-push-only compatible
- ❌ First read slightly slower (backfill query), then cached thereafter
- ❌ Requires discipline: every positive PointLog write site must increment cache in same transaction, or cache drifts

### ADR-005: Multi-Agent Coding Setup — Hermes + Claude Code + OpenCode on docker.lab (2026-07-08)

**Context:**
- Thitar develops solo on `docker.lab` (host `docker`), home dir `/home/thitar`.
- Three AI coding agents are in play: Hermes (runs on `lyra.lab`, reaches docker.lab over SSH as `hermes`), Claude Code, and OpenCode (both installed on docker.lab).
- Goal: let Hermes help in coding sessions (debug, code-review, PRs) without handing over the entire home folder, while keeping all three agents able to share project context.

**Decision:**
- **Access boundary:** Hermes accesses repos via SSH as `hermes` (uid 1001), NOT via thitar's home directly. A shared, group-owned zone is used instead of exposing `/home/thitar`.
- **Shared group:** `hermes-data` (gid **1002**, pinned to match lyra/cleo) contains both `thitar` and `hermes`.
- **Two clean zones:**
  - `/home/thitar/dev` — Thitar's dev repos. Group-shared (`thitar:hermes-data`, mode `2775`, setgid so new files inherit the group). No move, no symlink — kills phantom-mode and dangling-symlink regrets.
  - `/var/lib/hermes/shared` — General Hermes⇄thitar shared zone (`hermes:hermes-data`, `2775`). Hermes scratch / cross-host notes live here, NEVER inside `~/dev`, so dev tree stays clean.
- **Git operation:** Hermes runs git on these repos via `safe.directory` entries in its own `~/.gitconfig` (no sudo, no touching thitar's config). `core.fileMode=false` set in each repo so group-write bits don't produce phantom `git status` mode changes.
- **Push/auth split:**
  - **GitHub (historical repos, e.g. chore-ganizer):** Hermes has an ed25519 SSH key (`hermes@docker.lab`) registered to Thitar's GitHub account. Verified: `Hi thitar!`.
  - **Forgejo (`git.thitar.ovh`, brand new):** HTTPS token stored in `~/.git-credentials` (perms `600`, `credential.helper=store`). Verified API HTTP 200.
- **Memory convention:** All repos use the **Spillwave `project-memory` skill** → `docs/project_notes/` (bugs/decisions/key_facts/issues). This is the default for new repos so Claude Code + OpenCode (which ship this skill) share continuity without extra wiring.
  - Hermes's own bundled `project-memory` skill was made **convention-aware**: detect `docs/project_notes/` first → else `docs/memory/` (legacy Hermes repos: llama-bench, llama-swap-gui) → else default `docs/project_notes/`. No parallel trees created.
  - `chore-ganizer` already fully set up; `reco`, `beacon`, `argus` scaffolded this session. `data` is a subdir of `argus`, not a repo.
  - OpenCode wired via `.opencode/instructions.md` pointing at `docs/project_notes/`.

**Alternatives Considered:**
- Give Hermes access to all of `/home/thitar` → Rejected: violates least-privilege, over-broad blast radius.
- Move `~/dev` into an external shared folder + symlink back → Rejected: `mv` preserves old group (setgid only applies to new files) causing intermittent write failures; symlinks break editor/agent path caching if the mount drops.
- Use ACLs instead of group+setgid → Rejected: only two actors, group is sufficient; ACLs add debugging overhead at this scale.
- Globally switch Hermes's skill to `docs/project_notes/` → Rejected: would break llama-bench / llama-swap-gui which use `docs/memory/`.
- Let Hermes push directly after its own review → Rejected: Thitar's hard rule is **mandatory human review before every push, no exceptions**. Hermes may prep branches/PRs but pushes only after explicit sign-off.

**Consequences:**
- ✅ Hermes can debug, code-review, and open GitHub/Forgejo PRs in all `~/dev` repos.
- ✅ Three agents share one memory convention (`docs/project_notes/`); continuity preserved across sessions.
- ✅ Least-privilege: Hermes is a non-root group member, separate scratch zone, no sudo, no home exposure.
- ✅ Recoverable by hand: plain SSH + group perms + git-tracked configs; no Hermes-specific automation dependency.
- ✅ Push capability split cleanly: GitHub SSH (historical) vs Forgejo HTTPS (new).
- ❌ Requires Thitar to register GitHub SSH keys / Forgejo creds when new repos are added (one-time per remote).
- ❌ Two memory conventions coexist at the Hermes level (`project_notes` for user repos, `docs/memory` for legacy Hermes repos) — contained by the convention-aware skill, but a future agent must not "unify" them blindly.
- ❌ Mandatory review gate means Hermes cannot autonomously merge/close PRs; human in the loop for every push.
