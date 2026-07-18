# Multi-stage build for frontend-v2 (React + Vite + nginx)

# ---- Stage 1: build ----
FROM node:26-alpine AS build
WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.js postcss.config.js ./
COPY index.html ./
COPY public ./public
COPY src ./src
RUN npm run build

# ---- Stage 2: runtime (nginx) ----
FROM nginx:1.25-alpine AS runtime

# Install envsubst for runtime config injection
RUN apk add --no-cache bash

# Copy built artifacts
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80

# Use a custom entrypoint that generates config.js then starts nginx
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
