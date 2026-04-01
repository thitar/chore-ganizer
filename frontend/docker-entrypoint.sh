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

# NOTE: BACKEND_PORT env var is NOT read by nginx. The backend port is hardcoded
# to 3010 in nginx.conf via a literal `set` directive. Change it there directly.
echo "Backend port is hardcoded to 3010 in nginx.conf (BACKEND_PORT env var is ignored)"

# Start nginx
exec nginx -g 'daemon off;'
