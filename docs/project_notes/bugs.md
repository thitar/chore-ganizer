# Bug Log

Date-ordered log of bugs and their solutions.

## Tips

- Keep descriptions under 2-3 lines
- Focus on what was learned, not exhaustive details
- Include enough context for future reference
- Always date entries
- Periodically clean out very old entries (6+ months)

---

### 2026-07-04 - jest.resetModules() + jest.doMock() Leaves Stale Mock State

- **Issue**: Tests fail or produce incorrect results when run in a certain order — `isNtfyConfigured` returns `false` for tests that expect it to be `true`
- **Root Cause**: `jest.resetModules()` clears the module registry, but then `jest.doMock()` inside `beforeEach` re-applies mocks only for that test. The hoisted `jest.mock()` factory from the top of the file fails to re-apply after `resetModules()`, leaving subsequent tests in a polluted module state where `config/notifications` exports `isNtfyConfigured = false`
- **Solution**: Replace `jest.resetModules()` + `jest.doMock()` with `jest.spyOn()` on the specific functions that need mocking. Spy-based mocking scopes correctly per-test and doesn't affect the module registry for other tests
- **Prevention**: Never use `jest.resetModules()` when tests share module-level state. Prefer `jest.spyOn()` for isolated mocking. If `resetModules()` is unavoidable, put those tests in a separate file with `jest.isolateModules()`
- **File**: `backend/src/__tests__/services/assignment.service.test.ts`
