FROM node:20-alpine

WORKDIR /app

# Install supercronic and su-exec for user switching
RUN apk add --no-cache supercronic su-exec

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY dist/ ./dist/
COPY prisma/ ./prisma/

# Copy backup scripts and entrypoint
COPY backup-scripts/ ./backup-scripts/
COPY docker-entrypoint.sh ./
COPY supercronic.conf ./

# Make entrypoint executable
RUN chmod +x docker-entrypoint.sh backup-scripts/backup.sh backup-scripts/restore-test.sh

# Create a non-root user
RUN adduser -D appuser

# Create necessary directories
RUN mkdir -p /backups /app/data && \
    chown -R appuser:appuser /app /backups

# Run entrypoint which handles migrations, starts supercronic, and runs the server
ENTRYPOINT ["./docker-entrypoint.sh"]
