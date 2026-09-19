#!/bin/sh
# docker-entrypoint.sh for frontend-v2
# Generates runtime config.js with env vars, then starts nginx

set -e

# appVersion comes from the VERSION file baked into the image at build time
# (from frontend/package.json — see Dockerfile), not an env var: this way it
# always matches what was actually built, with no separate value to keep in
# sync across rebuilds.
APP_VERSION="$(cat /etc/chore-ganizer/VERSION 2>/dev/null || echo dev)"

# Generate config.js with runtime env vars
cat > /usr/share/nginx/html/config.js <<EOF
window.APP_CONFIG = {
  apiUrl: "${VITE_API_URL:-}",
  debug: ${VITE_DEBUG:-false},
  appVersion: "${APP_VERSION}"
};
EOF

# Ensure nginx (running as non-root) can read the file
chmod 644 /usr/share/nginx/html/config.js

echo "[entrypoint] Generated config.js:"
cat /usr/share/nginx/html/config.js

# Generate nginx config from template with envsubst
envsubst '${BACKEND_PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

echo "[entrypoint] Starting nginx"
exec "$@"
