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
