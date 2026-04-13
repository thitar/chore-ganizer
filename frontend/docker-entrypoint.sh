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
  echo "ERROR: nginx template not found at $TEMPLATE"
  exit 1
fi

# Start nginx
exec nginx -g 'daemon off;'
