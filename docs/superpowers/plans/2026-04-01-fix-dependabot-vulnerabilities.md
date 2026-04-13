# Fix Open Dependabot Vulnerabilities

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all 3 open Dependabot alerts by updating npm overrides and pinning vulnerable transitive dependencies.

**Architecture:** Use npm `overrides` in both `backend/package.json` and `frontend/package.json` to force patched versions of transitive dependencies. No direct dependency changes needed.

**Tech Stack:** npm overrides, Express 4.x, path-to-regexp, serialize-javascript

---

### File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/package.json` | **Modify** | Add `overrides` section to force `path-to-regexp@0.1.13` |
| `frontend/package.json` | **Modify** | Update `serialize-javascript` override floor to `>=7.0.5` |
| `backend/package-lock.json` | **Regenerate** | Updated lockfile with resolved versions |
| `frontend/package-lock.json` | **Regenerate** | Updated lockfile with resolved versions |

---

### Task 1: Fix path-to-regexp (HIGH, runtime)

**Files:**
- Modify: `backend/package.json`
- Regenerate: `backend/package-lock.json`

- [ ] **Step 1: Add overrides to backend/package.json**

Read `backend/package.json` and add an `overrides` section (or append to existing one if present):

```json
"overrides": {
  "path-to-regexp": "0.1.13"
}
```

This forces Express's transitive dependency `path-to-regexp@0.1.12` to upgrade to `0.1.13`, which fixes the ReDoS vulnerability with 3+ route parameters in a single segment.

- [ ] **Step 2: Regenerate lockfile**

```bash
cd backend && npm install
```

- [ ] **Step 3: Verify the fix**

```bash
cd backend && npm ls path-to-regexp
```

Expected output: `path-to-regexp@0.1.13` (not `0.1.12`)

---

### Task 2: Fix serialize-javascript (MEDIUM, dev)

**Files:**
- Modify: `frontend/package.json`
- Regenerate: `frontend/package-lock.json`

- [ ] **Step 1: Update override in frontend/package.json**

Find the existing `overrides` section in `frontend/package.json`:

```json
"overrides": {
  "serialize-javascript": ">=7.0.3",
  "flatted": ">=3.4.2"
}
```

Change to:

```json
"overrides": {
  "serialize-javascript": ">=7.0.5",
  "flatted": ">=3.4.2"
}
```

The vulnerability (CPU exhaustion via crafted array-like objects) is patched in `7.0.5`. The current override floor of `>=7.0.3` allows npm to resolve to `7.0.4` which is still vulnerable.

- [ ] **Step 2: Regenerate lockfile**

```bash
cd frontend && npm install
```

- [ ] **Step 3: Verify the fix**

```bash
cd frontend && npm ls serialize-javascript
```

Expected output: `serialize-javascript@7.0.5` or higher.

---

### Task 3: Verify both lockfiles and test

**Files:**
- `backend/package-lock.json`
- `frontend/package-lock.json`

- [ ] **Step 1: Verify backend still works**

```bash
cd backend && npm run build
```

Expected: TypeScript compilation succeeds with no errors.

- [ ] **Step 2: Verify frontend still works**

```bash
cd frontend && npm run build
```

Expected: Vite build succeeds with no errors.

- [ ] **Step 3: Run backend tests**

```bash
cd backend && npm test
```

Expected: All tests pass.

- [ ] **Step 4: Run frontend tests**

```bash
cd frontend && npm test
```

Expected: All tests pass.

---

### Task 4: Dismiss stale picomatch alert

Alert #18 (picomatch method injection) is a stale alert — we're already on `picomatch@2.3.2` which is the patched version per the advisory itself. This can be dismissed via:

```bash
gh api repos/thitar/chore-ganizer/dependabot/alerts/18 -X PATCH -f state="dismissed" -f dismissed_reason="tolerable_risk"
```

Or via the GitHub UI: Dependabot → Alert #18 → Dismiss → "Already fixed".

---

### Self-Review Checklist

- [x] **Spec coverage:** All 3 open alerts addressed — path-to-regexp patched via override, serialize-javascript override floor raised, picomatch identified as stale
- [x] **No placeholders:** Every step has exact code and commands
- [x] **Risk assessment:** path-to-regexp is the only runtime vulnerability (HIGH). The other two are dev-only. All fixes are non-breaking version bumps within the same major version.
- [x] **Override safety:** npm overrides are the recommended approach for transitive dependency vulnerabilities when the parent package hasn't been updated. `path-to-regexp@0.1.13` is a patch-level bump with only the ReDoS fix.
