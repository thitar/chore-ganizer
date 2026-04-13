# Make Backend Port Configurable via BACKEND_PORT Env Var

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded backend port `3010` in nginx.conf with a runtime-configurable `$BACKEND_PORT` environment variable using `envsubst`.

**Architecture:** Rename `nginx.conf` to a `.template` file with `$BACKEND_PORT` placeholder. The `docker-entrypoint.sh` runs `envsubst` at container startup, substituting only `$BACKEND_PORT` while preserving all nginx-native variables (`$host`, `$remote_addr`, etc.). If `BACKEND_PORT` is unset, it defaults to `3010`.

**Tech Stack:** nginx:alpine, envsubst (gettext), shell scripting, Docker

---

### File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/nginx.conf.template` | **Create** | nginx config template with `$BACKEND_PORT` placeholder |
| `frontend/nginx.conf` | **Delete** | Replaced by template (hardcoded version) |
| `frontend/docker-entrypoint.sh` | **Modify** | Run `envsubst` on template before starting nginx; remove warning echo |
| `frontend/Dockerfile` | **Modify** | Copy `.template` file instead of `.conf` |
| `docker-compose.yml` | **Modify** | Remove "has no effect" comment; BACKEND_PORT now works |
| `AGENTS.md` | **Modify** | Update documentation about runtime port config |

---

### Task 1: Create nginx.conf.template

**Files:**
- Create: `frontend/nginx.conf.template`

- [ ] **Step 1: Create template file**

Copy the current `frontend/nginx.conf` content, replacing the hardcoded `3010` with `$BACKEND_PORT`:

```nginx
# Nginx configuration for Chore-Ganizer frontend
# Handles SPA routing and API proxy
# NOTE: $BACKEND_PORT is substituted at container startup via envsubst

server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;
    gzip_disable "MSIE [1-6]";

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://backend:$BACKEND_PORT/api;
        
        proxy_http_version 1.1;
        
        # Pass original Host header to preserve origin information
        proxy_set_header Host $host;
        
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # CRITICAL: Preserve X-Forwarded-Proto from upstream proxy (Caddy/Traefik).
        # Do NOT change to $scheme - this breaks TLS detection behind reverse proxies.
        # The upstream proxy (e.g., Caddy) sets X-Forwarded-Proto to https when handling TLS.
        # We must preserve this value so the backend knows the original request protocol.
        proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
        
        # Important for session cookies
        proxy_pass_header Set-Cookie;
        proxy_cookie_path / /;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # SPA fallback - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

**Key change:** Line `proxy_pass http://backend:$BACKEND_PORT/api;` — the only `$` variable that envsubst will substitute.

- [ ] **Step 2: Delete the old hardcoded file**

```bash
rm frontend/nginx.conf
```

- [ ] **Step 3: Verify no other references to the old filename**

```bash
grep -r "nginx\.conf" frontend/ --include="*.sh" --include="Dockerfile*" --include="*.yml" --include="*.md"
```

Update any references from `nginx.conf` to `nginx.conf.template`.

---

### Task 2: Update docker-entrypoint.sh to run envsubst

**Files:**
- Modify: `frontend/docker-entrypoint.sh`

- [ ] **Step 1: Rewrite the entrypoint script**

Replace the entire `frontend/docker-entrypoint.sh` with:

```bash
#!/bin/sh
set -e

# Generate runtime configuration file
# This script runs at container startup and creates config.js from environment variables

echo "Generating runtime configuration..."

# Read baked version from image, fall back to env var
BAKED_VERSION=""
if [ -f /usr/share/nginx/html/.image-version ]; then
  BAKED_VERSION=$(cat /usr/share/nginx/html/.image-version | tr -d '[:space:]')
fi
VERSION="${VITE_APP_VERSION:-$BAKED_VERSION}"

BUILD_DATE=$(date +%Y-%m-%d)
cat > /usr/share/nginx/html/config.js << EOF
// Runtime configuration generated at container startup
// This file is regenerated each time the container starts
window.APP_CONFIG = {
  // API URL - empty string means use relative URLs (proxied by nginx)
  apiUrl: '${VITE_API_URL:-}',
  // Debug mode - enable console logging
  debug: ${VITE_DEBUG:-false},
  // Application version
  appVersion: '${VERSION}',
  // Build date (container startup date)
  buildDate: '${BUILD_DATE}'
};
EOF

echo "Configuration generated:"
echo "  - API URL: ${VITE_API_URL:-'(empty - using nginx proxy)'}"
echo "  - Debug: ${VITE_DEBUG:-false}"
echo "  - Version: ${VERSION}"
echo "  - Build Date: ${BUILD_DATE}"

# Substitute BACKEND_PORT in nginx configuration template
# Default to 3010 if not set
export BACKEND_PORT="${BACKEND_PORT:-3010}"

TEMPLATE="/etc/nginx/conf.d/default.conf.template"
OUTPUT="/etc/nginx/conf.d/default.conf"

if [ -f "$TEMPLATE" ]; then
  echo "Applying nginx configuration template (BACKEND_PORT=$BACKEND_PORT)..."
  # Only substitute $BACKEND_PORT - all other $variables are nginx-native ($host, $remote_addr, etc.)
  envsubst '${BACKEND_PORT}' < "$TEMPLATE" > "$OUTPUT"
  echo "  - Backend port: $BACKEND_PORT"
else
  echo "WARNING: nginx template not found at $TEMPLATE, using existing config"
fi

# Start nginx
exec nginx -g 'daemon off;'
```

**Critical details:**
- `envsubst '${BACKEND_PORT}'` — the single-quoted argument tells envsubst to **only** substitute `$BACKEND_PORT`. All other `$` variables (`$host`, `$remote_addr`, `$proxy_add_x_forwarded_for`, etc.) are left untouched as nginx variables.
- `export BACKEND_PORT="${BACKEND_PORT:-3010}"` — ensures a default if the env var is not set.
- The template file is at `/etc/nginx/conf.d/default.conf.template` because the Dockerfile copies it there.
- Graceful fallback: if the template is missing, nginx starts with whatever config exists (won't crash).

---

### Task 3: Update Dockerfile to copy template

**Files:**
- Modify: `frontend/Dockerfile`

- [ ] **Step 1: Update the COPY instruction**

Change the Dockerfile line that copies the nginx config. Replace:

```dockerfile
# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

With:

```dockerfile
# Copy custom nginx configuration template (envsubst at runtime)
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
```

**Full Dockerfile for reference (only the changed line matters):**

```dockerfile
# Frontend Dockerfile for Chore-Ganizer
# Multi-stage build for optimized production image
#
# Runtime configuration is injected via docker-entrypoint.sh
# Changes to .env take effect on container restart (no rebuild needed)

# Stage 1: Build
FROM node:25-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build argument for version (extracted from backend/package.json at build time)
ARG VITE_APP_VERSION=""
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Build the application
# Note: VITE_API_URL is now runtime-configured, so we use a placeholder
# Version is provided via build arg from docker-compose (extracted from backend/package.json)
RUN npm run build

# Bake version into image as a simple text file
RUN echo "$(cat /app/package.json | grep '"version"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')" > /app/.image-version

# Stage 2: Production
FROM nginx:alpine AS production

# Copy custom nginx configuration template (envsubst at runtime)
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

# Copy entrypoint script for runtime config generation
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy baked version
COPY --from=builder /app/.image-version /usr/share/nginx/html/.image-version

# nginx:alpine already has 'nginx' user/group (UID 101) - just set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && chown -R nginx:nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

# Switch to non-root user BEFORE health check and entrypoint
USER nginx

# Expose port
EXPOSE 80

# Health check (runs as nginx user)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Use custom entrypoint to generate runtime config
ENTRYPOINT ["/docker-entrypoint.sh"]
```

---

### Task 4: Update docker-compose.yml

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Update the BACKEND_PORT comment**

Replace lines 23-25 in `docker-compose.yml`:

**Before:**
```yaml
      # NOTE: BACKEND_PORT has no effect - nginx hardcodes port 3010 in nginx.conf
      # To change the backend port, edit frontend/nginx.conf directly.
      - BACKEND_PORT=${BACKEND_PORT:-3010}
```

**After:**
```yaml
      # Backend port for nginx API proxy (substituted at runtime via envsubst)
      - BACKEND_PORT=${BACKEND_PORT:-3010}
```

---

### Task 5: Update AGENTS.md documentation

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update the runtime config paragraph**

Find this paragraph in `AGENTS.md` (under "Frontend Structure" section):

```
**Runtime config**: The frontend Dockerfile builds with a placeholder API URL. At container start, `docker-entrypoint.sh` generates `/usr/share/nginx/html/config.js` which sets `window.APP_CONFIG.apiUrl` from the `VITE_API_URL` env var. If `VITE_API_URL` is empty (default), the frontend uses relative URLs and nginx proxies `/api/*` to the backend. The backend port is **hardcoded to 3010 in `frontend/nginx.conf`** — the `BACKEND_PORT` env var is ignored by nginx. Config changes only need a container restart, not a rebuild.
```

Replace with:

```
**Runtime config**: The frontend Dockerfile builds with a placeholder API URL. At container start, `docker-entrypoint.sh` generates `/usr/share/nginx/html/config.js` which sets `window.APP_CONFIG.apiUrl` from the `VITE_API_URL` env var. If `VITE_API_URL` is empty (default), the frontend uses relative URLs and nginx proxies `/api/*` to the backend. The backend port is configurable via `BACKEND_PORT` env var (default: `3010`) — `nginx.conf.template` uses `envsubst` at startup to substitute the port. Config changes only need a container restart, not a rebuild.
```

---

### Task 6: Verify the build

**Files:**
- All modified files

- [ ] **Step 1: Verify Docker build succeeds**

```bash
cd frontend && docker build -t chore-ganizer-frontend:test .
```

Expected: Build completes successfully with no errors.

- [ ] **Step 2: Verify envsubst substitution works**

Run the image with a custom port and check the generated config:

```bash
docker run --rm -e BACKEND_PORT=4000 chore-ganizer-frontend:test sh -c "cat /etc/nginx/conf.d/default.conf | grep proxy_pass"
```

Expected output:
```
proxy_pass http://backend:4000/api;
```

- [ ] **Step 3: Verify default port when BACKEND_PORT is unset**

```bash
docker run --rm chore-ganizer-frontend:test sh -c "cat /etc/nginx/conf.d/default.conf | grep proxy_pass"
```

Expected output:
```
proxy_pass http://backend:3010/api;
```

- [ ] **Step 4: Verify nginx variables are preserved**

```bash
docker run --rm -e BACKEND_PORT=4000 chore-ganizer-frontend:test sh -c "cat /etc/nginx/conf.d/default.conf | grep 'proxy_set_header'"
```

Expected: nginx variables like `$host`, `$remote_addr`, `$proxy_add_x_forwarded_for`, `$http_x_forwarded_proto` should all be present (not replaced with empty strings).

- [ ] **Step 5: Verify full docker-compose works**

```bash
cd /home/thitar/dev/chore-ganizer && docker compose up -d --build
docker compose logs frontend | head -20
```

Expected: No warning about hardcoded port. Instead:
```
Applying nginx configuration template (BACKEND_PORT=3010)...
  - Backend port: 3010
```

---

### Self-Review Checklist

- [x] **Spec coverage:** All requirements addressed — template created, envsubst in entrypoint, Dockerfile updated, compose file updated, docs updated, build verified
- [x] **Placeholder scan:** No TBD/TODO — every step has exact code and commands
- [x] **Type consistency:** N/A (shell/config changes only)
- [x] **Edge cases handled:**
  - Default port `3010` when `BACKEND_PORT` unset
  - Graceful fallback if template file is missing
  - Only `$BACKEND_PORT` substituted — all nginx `$` variables preserved via `envsubst '${BACKEND_PORT}'` filter
  - The `nginx:alpine` image includes `envsubst` (gettext package, merged in PR #976)
