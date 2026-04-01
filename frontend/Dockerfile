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
