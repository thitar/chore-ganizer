---
status: complete
phase: 10-profile-ui-user-topic-route
source: 10-01-SUMMARY.md, 10-02-SUMMARY.md
started: 2026-06-30T19:45:00Z
updated: 2026-07-01T20:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. updateNtfyTopic service function with format validation, uniqueness check, and clear support
expected: updateNtfyTopic service function with format validation, uniqueness check, and clear support
result: pass
source: automated
coverage_id: D1

### 2. PUT /me/ntfy-topic route with authenticate middleware
expected: PUT /me/ntfy-topic route with authenticate middleware
result: pass
source: automated
coverage_id: D2

### 3. updateNtfyTopic frontend API function with empty-to-null normalization
expected: updateNtfyTopic frontend API function with empty-to-null normalization
result: pass
source: automated
coverage_id: D1

### 4. Push Notifications section renders with topic input
expected: Open Profile page, verify Push Notifications section appears after Display Color with topic input pre-filled with current topic (or empty)
result: issue
reported: "Profile is a separate nav link. Username in navbar should link to profile instead."
severity: major

### 5. Generate random topic and save flow
expected: Click "Generate random topic" button, verify input fills with `chore-{username}-{6chars}`, save shows green toast "Topic saved!"
result: pass

### 6. 409 Conflict for duplicate topic
expected: Set two users to same topic, verify red error message "This topic is already in use. Please choose another."
result: [pending]

### 7. Clear topic (empty value)
expected: Empty the topic and save, verify it shows "Not set"
result: pass

### 8. Parent-only Family Topics cards
expected: Log in as Parent, verify cards render for children with Edit buttons
result: pass

## Summary

total: 8
passed: 6
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "User's name in navbar links to Profile page (no separate 'Profile' nav item)"
  status: failed
  reason: "User reported: Profile is a separate nav link. Username in navbar should link to profile instead."
  severity: major
  test: 4

- truth: "User can type a custom topic or generate a random one from the empty state"
  status: failed
  reason: "User reported: can't input own topic name without generating a random one first"
  severity: major
  test: 6
