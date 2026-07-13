// Local-dev default. In the Docker deployment, the entrypoint script
// overwrites this exact file with real values from docker-compose.yml's
// env vars before nginx starts — see frontend/docker-entrypoint.sh.
window.APP_CONFIG = {
  apiUrl: "",
  debug: false,
  appVersion: "dev"
};
