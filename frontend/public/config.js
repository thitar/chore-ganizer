// Runtime configuration for Chore-Ganizer
// This file is used for local development only.
// In production (Docker), this file is generated at container startup by docker-entrypoint.sh
// with values from environment variables.

window.APP_CONFIG = {
  // API URL - empty string means use relative URLs (proxied by nginx in production)
  apiUrl: '',
  // Debug mode - enable console logging
  debug: true,
  // Application version (fallback for local dev)
  appVersion: '1.2.3-dev'
};
