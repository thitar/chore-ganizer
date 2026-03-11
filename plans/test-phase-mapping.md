# Test to Phase Mapping

## Complete Test Count

| Phase | Branch | Categories | Test Count |
|-------|--------|------------|------------|
| 1 | test/phase1-auth | Parent Auth, Child Auth | 11 |
| 2 | test/phase2-core | User Management, Chore Templates, Chore Assignments, Child Viewing | 28 |
| 3 | test/phase3-advanced | Recurring Chores, Pocket Money, Statistics, Child Completion, Overdue | 29 |
| 4 | test/phase4-crosscut | Calendar, Notifications (P+C), PWA (P+C) | 18 |
| 5 | test/phase5-regression | Settings, Personal Dashboard, Responsive Design, Smoke | 8 |

**Total: ~94 tests**

---

## Detailed Phase Breakdown

### Phase 1: Authentication (Foundation)
**Branch:** `test/phase1-auth`
**Git Tag Prefix:** `test/phase1-auth-*`

| Category | Test IDs | Count |
|----------|----------|-------|
| Parent Authentication | P-001 to P-007 | 7 |
| Child Authentication | C-001 to C-004 | 4 |

---

### Phase 2: Core Features
**Branch:** `test/phase2-core`
**Git Tag Prefix:** `test/phase2-core-*`

| Category | Test IDs | Count |
|----------|----------|-------|
| User Management | P-101 to P-112 | 12 |
| Chore Templates | P-201 to P-206 | 6 |
| Chore Assignments | P-301 to P-308 | 8 |
| Child Chore Viewing | C-101 to C-104 | 4 |

---

### Phase 3: Advanced Features
**Branch:** `test/phase3-advanced`
**Git Tag Prefix:** `test/phase3-advanced-*`

| Category | Test IDs | Count |
|----------|----------|-------|
| Recurring Chores | P-401 to P-410 | 10 |
| Pocket Money | P-501 to P-507 | 7 |
| Statistics | P-601 to P-606 | 6 |
| Child Completion | C-201 to C-204 | 4 |
| Overdue Penalty | P-309 to P-312 | 4 |

---

### Phase 4: Cross-Cutting Features
**Branch:** `test/phase4-crosscut`
**Git Tag Prefix:** `test/phase4-crosscut-*`

| Category | Test IDs | Count |
|----------|----------|-------|
| Calendar | P-701 to P-706 | 6 |
| Notifications (Parent) | P-707 to P-712 | 6 |
| PWA (Parent) | P-801 to P-806 | 6 |
| PWA (Child) | C-401 to C-403 | 3 |
| Notifications (Child) | C-501 to C-503 | 3 |

---

### Phase 5: Final Regression
**Branch:** `test/phase5-regression`
**Git Tag Prefix:** `test/phase5-regression-*`

| Category | Test IDs | Count |
|----------|----------|-------|
| Settings | P-901 to P-903 | 3 |
| Personal Dashboard | P-904 to P-905 | 2 |
| Responsive Design | P-906 to P-908 | 3 |
| Points/Pocket Money (Child) | C-301 to C-304 | 4 |

---

## Tag Naming Reference

### Phase 1 Tags
```
test/phase1-auth-parent-complete     # All parent auth passed
test/phase1-auth-parent-fail        # Some parent auth failed
test/phase1-auth-child-complete      # All child auth passed
test/phase1-auth-child-fail         # Some child auth failed
test/phase1-merged                  # Phase 1 merged to staging
```

### Phase 2 Tags
```
test/phase2-core-user-mgmt-complete
test/phase2-core-user-mgmt-fail
test/phase2-core-chore-templates-complete
test/phase2-core-chore-templates-fail
test/phase2-core-chore-assignments-complete
test/phase2-core-chore-assignments-fail
test/phase2-core-child-viewing-complete
test/phase2-core-child-viewing-fail
test/phase2-merged
```

### Phase 3 Tags
```
test/phase3-advanced-recurring-complete
test/phase3-advanced-recurring-fail
test/phase3-advanced-pocket-money-complete
test/phase3-advanced-pocket-money-fail
test/phase3-advanced-statistics-complete
test/phase3-advanced-statistics-fail
test/phase3-advanced-child-completion-complete
test/phase3-advanced-child-completion-fail
test/phase3-advanced-overdue-complete
test/phase3-advanced-overdue-fail
test/phase3-merged
```

### Phase 4 Tags
```
test/phase4-crosscut-calendar-complete
test/phase4-crosscut-calendar-fail
test/phase4-crosscut-notifications-parent-complete
test/phase4-crosscut-notifications-parent-fail
test/phase4-crosscut-notifications-child-complete
test/phase4-crosscut-notifications-child-fail
test/phase4-crosscut-pwa-complete
test/phase4-crosscut-pwa-fail
test/phase4-merged
```

### Phase 5 Tags
```
test/phase5-regression-settings-complete
test/phase5-regression-settings-fail
test/phase5-regression-dashboard-complete
test/phase5-regression-dashboard-fail
test/phase5-regression-responsive-complete
test/phase5-regression-responsive-fail
test/phase5-regression-smoke-complete
test/phase5-regression-smoke-fail
test/phase5-merged
```
