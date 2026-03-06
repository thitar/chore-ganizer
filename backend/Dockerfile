# Backend Dockerfile for Chore-Ganizer
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:25-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:25-slim AS production

WORKDIR /app

# Install OpenSSL for Prisma, sqlite3 for backup/restore, and cron
RUN apt-get update && apt-get install -y openssl sqlite3 cron && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production

# Generate Prisma client for production
RUN npx prisma generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Copy cron entrypoint and crontab
COPY cron-entrypoint.sh /app/cron-entrypoint.sh
COPY crontab /crontab
RUN chmod +x /app/cron-entrypoint.sh

# Create directory for backup scripts (will be populated at runtime)
RUN mkdir -p /backup-scripts

# Create directory for SQLite database
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3010

# Expose port
EXPOSE 3010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3010/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Create non-root user and set permissions
RUN groupadd -r appuser && useradd -r -g appuser -u 1001 appuser \
    && chown -R appuser:appuser /app \
    && chown -R appuser:appuser /backup-scripts \
    && chown -R appuser:appuser /app/data

# Switch to non-root user (must be before CMD for security)
USER appuser

# Start the application
CMD ["/app/docker-entrypoint.sh"]
