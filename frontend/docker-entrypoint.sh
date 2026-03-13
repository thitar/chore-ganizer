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

# Configure nginx backend port based on environment (default: 3011 for staging, 3010 for production)
BACKEND_PORT=${BACKEND_PORT:-3011}
sed -i "s|backend:3010|backend:${BACKEND_PORT}|g" /etc/nginx/conf.d/default.conf 2>/dev/null || true
sed -i "s|Host \"backend:3010\"|Host \"backend:${BACKEND_PORT}\"|g" /etc/nginx/conf.d/default.conf 2>/dev/null || true
echo "Nginx configured to proxy to backend:${BACKEND_PORT}"

# Start nginx
exec nginx -g 'daemon off;'
