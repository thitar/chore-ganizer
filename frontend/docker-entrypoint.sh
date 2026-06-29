#!/bin/sh
# docker-entrypoint.sh for frontend-v2
# Generates runtime config.js with env vars, then starts nginx

set -e

# Generate config.js with runtime env vars
cat > /usr/share/nginx/html/config.js <<EOF
window.APP_CONFIG = {
  apiUrl: "${VITE_API_URL:-}",
  debug: ${VITE_DEBUG:-false},
  appVersion: "${VITE_APP_VERSION:-dev}"
};
EOF

echo "[entrypoint] Generated config.js:"
cat /usr/share/nginx/html/config.js

# Generate nginx config from template with envsubst
envsubst '${BACKEND_PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

echo "[entrypoint] Starting nginx"
exec "$@"
