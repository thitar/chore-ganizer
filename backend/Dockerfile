# Multi-stage build for backend-v2 (Node.js + Prisma + Express)

# ---- Stage 1: dependencies ----
FROM node:26-alpine AS deps
WORKDIR /app

# Install build deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---- Stage 2: build ----
FROM node:26-alpine AS build
WORKDIR /app

# Install all deps (including dev) for TypeScript build
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN npm run build

# ---- Stage 3: runtime ----
FROM node:26-alpine AS runtime
WORKDIR /app

# Install runtime deps only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma

# Install runtime tools
RUN apk add --no-cache su-exec tini curl

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -u 1001 -S -G appuser appuser && \
    mkdir -p /opt/app-data/chore-ganizer && \
    chown -R appuser:appuser /app /opt/app-data/chore-ganizer

# Copy entrypoint
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3010
ENV DATA_DIR=/opt/app-data/chore-ganizer
EXPOSE 3010

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
