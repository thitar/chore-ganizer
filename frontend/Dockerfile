# Frontend Dockerfile for Chore-Ganizer
# Multi-stage build for optimized production image
#
# Runtime configuration is injected via docker-entrypoint.sh
# Changes to .env take effect on container restart (no rebuild needed)

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build argument for version (passed from docker-compose)
 ARG VITE_APP_VERSION=2.0.3
 ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Build the application
# Note: VITE_API_URL is now runtime-configured, so we use a placeholder
RUN npm run build

# Stage 2: Production
FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script for runtime config generation
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Create non-root user and set permissions
RUN groupadd -r nginx && useradd -r -g nginx -u 1001 nginx \
    && chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && chown -R nginx:nginx /etc/nginx/conf.d

# Switch to non-root user (must be before ENTRYPOINT for security)
USER nginx

# Use custom entrypoint to generate runtime config
ENTRYPOINT ["/docker-entrypoint.sh"]
