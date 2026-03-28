#!/bin/sh
set -e

# Generate runtime configuration file
# This script runs at container startup and creates config.js from environment variables

echo "Generating runtime configuration..."

# Create config.js with environment variables
cat > /usr/share/nginx/html/config.js << EOF
// Runtime configuration generated at container startup
// This file is regenerated each time the container starts
window.APP_CONFIG = {
  // API URL - empty string means use relative URLs (proxied by nginx)
  apiUrl: '${VITE_API_URL:-}',
  // Debug mode - enable console logging
  debug: ${VITE_DEBUG:-false},
  // Application version
  appVersion: '${VITE_APP_VERSION:-1.5.0}'
};
EOF

echo "Configuration generated:"
echo "  - API URL: ${VITE_API_URL:-'(empty - using nginx proxy)'}"
echo "  - Debug: ${VITE_DEBUG:-false}"
echo "  - Version: ${VITE_APP_VERSION:-1.2.3}"

# NOTE: BACKEND_PORT env var is NOT read by nginx. The backend port is hardcoded
# to 3010 in nginx.conf via a literal `set` directive. Change it there directly.
echo "Backend port is hardcoded to 3010 in nginx.conf (BACKEND_PORT env var is ignored)"

# Start nginx
exec nginx -g 'daemon off;'
