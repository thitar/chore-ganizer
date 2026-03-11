# Manual Testing: Branches vs Tags

## Option 1: Branches Per Category (~20 branches)

```
test/auth-parent
test/auth-child
test/user-management
test/chore-templates
test/chore-assignments
... (about 20 total)
```

### Pros
- Each category is isolated - changes in one don't affect others
- Easy to switch between test categories with `git checkout`
- Can run multiple categories in parallel (different machines)
- Each branch can have its own notes/checklist commits

### Cons
- 20 branches to manage and remember
- Merging back to main can be complex (when do you merge?)
- Risk of branches getting stale or forgotten
- More git overhead (switching, keeping in sync)

---

## Option 2: Tags/Checkpoints (Recommended for Manual Testing)

Tags are like lightweight bookmarks on specific commits - they mark a point in history without creating a parallel line of development.

```
# After completing authentication tests:
git tag -a test/auth-complete -m "Auth tests passed"

# After completing user management:
git tag -a test/user-mgmt-complete -m "User management tests passed"
```

### How It Works

1. You work on a single branch (e.g., `staging`)
2. Run through test category
3. When category passes, tag that commit
4. If a test fails, you can branch from that tag to fix

### Pros

| Benefit | Explanation |
|---------|-------------|
| **Simplicity** | No branch merging complexity |
| **Immutable record** | Tags can't move, they mark exact points |
| **Quick recovery** | `git checkout test/auth-failed` to branch from failure point |
| **Linear history** | Main branch stays clean |
| **Easy to review** | `git log --oneline --decorate` shows test progress |
| **Lightweight** | No duplicate code to manage |

### Cons

| Drawback | Explanation |
|----------|-------------|
| **No isolation** | If you accidentally break something, all tests fail |
| **Must commit carefully** | Don't commit unrelated changes between tests |
| **Not parallelizable** | Can't run tests simultaneously |

---

## Option 3: Hybrid Approach (Recommended)

Use both - branches for phases, tags within each phase:

```
staging
  ├── test/parent-functional    (branch)
  │     ├── test/auth-complete (tag)
  │     └── test/user-mgmt-complete (tag)
  ├── test/child-functional     (branch)
  └── test/regression          (branch)
```

---

## Comparison Table

| Criteria | Branches per Category | Tags Only | Hybrid |
|----------|----------------------|-----------|--------|
| Setup effort | High | Low | Medium |
| Isolation | ✅ Excellent | ❌ None | ✅ Good |
| Parallel testing | ✅ Yes | ❌ No | ✅ Limited |
| Merge complexity | ⚠️ High | ✅ None | ⚠️ Medium |
| Recovery from failure | ✅ Easy | ⚠️ Medium | ✅ Easy |
| Maintenance overhead | ⚠️ High | ✅ Low | ⚠️ Medium |

---

## Recommendation for 100 Tests

**Use Option 2 (Tags Only)** because:

1. You're a solo developer - no need for parallel testing
2. Simpler than managing 20 branches
3. Tags give you "checkpoints" to return to if needed
4. Your staging environment stays clean and linear

### Workflow with Tags:

```bash
# 1. Start fresh on staging
git checkout staging
git pull origin staging

# 2. Run Parent Authentication tests (P-001 to P-007)
# ... test manually ...
# 3. If all pass:
git tag -a test/P-auth-complete -m "Parent auth tests passed - 7/7"

# 4. Continue to User Management tests
# ... test manually ...
# 5. If P-101 passes but P-102 fails:
git tag -a test/P-user-mgmt-fail -m "P-102 failed - need fix"
git checkout -b fix/p-102-password-validation

# 6. After fix, continue testing
# 7. When all user management passes:
git tag -a test/P-user-mgmt-complete -m "User management tests passed"
```

### To Review Progress:

```bash
# See all test tags
git tag -l "test/*"

# See history with test progress
git log --oneline --decorate

# See what was tested in each tag
git tag -l test/* | while read tag; do
  echo "=== $tag ==="
  git tag -l "$tag" -n -1
done
```

---

## Summary

| Your Situation | Best Option |
|---------------|-------------|
| Solo dev, sequential testing | **Tags** |
| Need parallel testing | Branches per category |
| Want checkpoints + isolation | Hybrid |

**For 100 manual tests as a solo developer, tags are the simplest and most practical solution.**
