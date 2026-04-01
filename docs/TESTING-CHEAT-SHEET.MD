doc# You're on Phase 1: Authentication Testing! 🎉

You're currently on the **`test/phase1-auth`** branch - perfect!

## Current Testing Status

| Phase | Branch | Status |
|-------|--------|--------|
| 1: Auth | test/phase1-auth | 🔴 **IN PROGRESS** |
| 2: Core | test/phase2-core | ⏳ Not Started |
| 3: Advanced | test/phase3-advanced | ⏳ Not Started |
| 4: CrossCut | test/phase4-crosscut | ⏳ Not Started |
| 5: Regression | test/phase5-regression | ⏳ Not Started |

---

## What to Do Right Now

### 1. Start the Application
```bash
# Start with docker compose
docker compose up -d

# Check it's running
docker compose ps
```

### 2. Open Browser
Go to: **http://localhost:3002**

### 3. Login with Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Parent | `dad@home.local` | `password123` |
| Child | `alice@home.local` | `password123` |

### 4. Run Phase 1 Tests (from [`docs/MANUAL-TESTING.md`](docs/MANUAL-TESTING.md))

**Parent Auth Tests (7 tests):**
- P-001: Login with valid credentials
- P-002: Login with invalid password
- P-003: Login with invalid email
- P-004: Logout
- P-005: Session persistence
- P-006: Session expiration
- P-007: Protected route access

**Child Auth Tests (4 tests):**
- C-001: Child login
- C-002: Child logout
- C-003: Child session persistence
- C-004: Child protected routes

### 5. After Testing - Tag Results
```bash
# All parent tests passed:
git tag -a test/phase1-auth-parent-complete -m "7/7 parent auth tests passed"
git push origin test/phase1-auth --tags

# Then test child auth, then tag:
git tag -a test/phase1-auth-child-complete -m "4/4 child auth tests passed"
git push origin test/phase1-auth --tags
```

### 6. When Phase 1 is Fully Complete - Merge to Staging
```bash
git checkout staging
git merge test/phase1-auth
git tag -a test/phase1-merged -m "Phase 1 complete"
git push origin staging --tags
```

---

## Quick Recap

```
You are here: test/phase1-auth (doing auth tests)
     ↓
Run staging at localhost:3003
     ↓
Test login/logout/session for Parent & Child
     ↓  
Tag results: test/phase1-auth-parent-complete
             test/phase1-auth-child-complete
     ↓
Merge to staging when both complete
```

Would you like me to show you the exact test steps for a specific test?