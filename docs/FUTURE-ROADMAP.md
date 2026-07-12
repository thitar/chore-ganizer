# Future Roadmap

What's deliberately deferred, not what's aspirational. Sourced from `.planning/STATE.md`'s "Deferred Items" table — update that table first if a deferred item ships, then reflect it here.

## Deferred features

| Item | Why it's deferred |
|------|--------------------|
| Recurring chore edit | Currently create+delete only; editing in place is future polish |
| Round-robin / mixed recurring assignment | Only fixed-user assignment shipped (RECUR-05 scope); rotation modes are future work |
| Recurring chore "uncomplete" | Out of RECUR scope |
| Bulk-create recurring chores | Out of RECUR scope |
| Custom recurrence rules (RRULE-style) | Out of RECUR scope — only `frequency`/`dayOfWeek`/`dayOfMonth` exist |
| Per-user `ntfyBaseUrl` override | Out of scope — a single `NTFY_BASE_URL` env var is enough for a family deployment |
| Per-event notification toggles | Out of scope — all-or-nothing per user via `ntfyTopic` |
| In-app notification center | Out of scope — ntfy push is the only channel |
| Email / Slack / Discord notification channels | Out of scope — ntfy is the only channel |
| Scheduled/automated database backups | Documented gap in OPERATIONS.md, not implemented — manual `sqlite3 .backup` only |
| CI/CD image publishing to a registry | No workflow builds/pushes to `ghcr.io` despite the naming convention; images are built and tagged locally only |

## Explicitly removed, not "future"

These were cut during the v1-rewrite and are not planned to come back unless a new decision reverses it (see `docs/project_notes/decisions.md`):

- Pocket money / currency conversion (`PointTransaction`-based banking)
- Chore categories
- Statistics dashboard
- Family groups / multi-family support
- Audit logging
- OpenAPI/Swagger generation

## Notes

- This list reflects `.planning/STATE.md` as of 2026-07-12. Check that file for the latest before treating anything here as current.
- Anything not listed above or in `.planning/STATE.md`'s Deferred Items table is either shipped (see root `CHANGELOG.md`) or was never scoped — don't assume a feature is "coming soon" just because it sounds plausible.
