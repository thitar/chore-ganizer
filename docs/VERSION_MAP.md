# Version Bump Map

Every PR that changes app behavior must bump `APP_VERSION`. If unsure what version to bump to, ask the user.

## Files to update (all must match)

| File | Field | Example |
|------|-------|---------|
| `backend/package.json` | `"version"` | `"version": "3.2.2"` |
| `frontend/package.json` | `"version"` | `"version": "3.2.2"` |
| `backend/package-lock.json` | `"version"` (root + `packages[""]`) | regenerated via `npm install` |
| `frontend/package-lock.json` | `"version"` (root + `packages[""]`) | regenerated via `npm install` |
| `.env` | `APP_VERSION=` | `APP_VERSION=3.2.2` |
| `.env.example` | `APP_VERSION=` | `APP_VERSION=3.2.2` |
| `CHANGELOG.md` | New `## [x.y.z]` header | Add entry for the version |

## Process

1. Edit `backend/package.json` and `frontend/package.json` to the new version
2. Edit `.env` and `.env.example` to match
3. Delete both `package-lock.json` files and `node_modules/`, run `npm install` in each to regenerate clean lockfiles (**never** use `sed` to patch lockfiles — it corrupts transitive dependency versions)
4. Add/update `CHANGELOG.md` entry for the new version
5. Commit everything together with the PR changes

Note: `.env`'s `APP_VERSION` is passed to the backend container only (currently unread by backend code) and is kept in sync for consistency/tagging purposes. It does **not** affect what the frontend displays — that's baked into the image from `frontend/package.json` at `docker build` time (`frontend/Dockerfile`), so it's always correct after a rebuild even if `.env` drifts. See `docs/OPERATIONS.md`'s "What happens on container start".
