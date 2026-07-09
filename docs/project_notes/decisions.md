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
