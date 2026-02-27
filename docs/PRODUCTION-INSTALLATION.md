# 🚀 Chore-Ganizer Production Installation Guide

Complete guide for deploying Chore-Ganizer in a production environment using Docker.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker)](#quick-start-docker)
3. [Detailed Installation Steps](#detailed-installation-steps)
4. [Post-Installation](#post-installation)
5. [Upgrading](#upgrading)
6. [Troubleshooting](#troubleshooting)

---

## 📦 Prerequisites

### Server Requirements

| Resource | Minimum | Recommended | Notes |
|----------|---------|-------------|-------|
| CPU | 1 core | 2+ cores | Sufficient for family use |
| RAM | 1 GB | 2+ GB | Node.js + SQLite are lightweight |
| Storage | 5 GB | 10+ GB | Database is small; space for backups |
| Network | 1 Mbps | 10+ Mbps | For notifications and updates |

### Software Requirements

| Software | Version | Purpose |
|----------|---------|---------|
| Docker | 20.10+ | Container runtime |
| Docker Compose | 2.0+ | Container orchestration |
| Git | 2.0+ | Cloning the repository (optional) |

### Network Requirements

| Requirement | Default | Description |
|-------------|---------|-------------|
| HTTP Port | 3002 | Frontend web interface |
| API Port | 3010 | Backend API (optional, proxied via frontend) |
| Domain | - | Optional, for SSL/TLS |

### Verify Prerequisites

```bash
# Check Docker version
docker --version
# Expected: Docker version 20.10.x or higher

# Check Docker Compose version
docker compose version
# Expected: Docker Compose version v2.x.x
```

---

## ⚡ Quick Start (Docker)

### Option 1: Using Pre-built Images (Recommended)

This option downloads pre-built Docker images from the registry. No source code or build process required.

```bash
# Create application directory
mkdir -p ~/chore-ganizer
cd ~/chore-ganizer

# Download docker-compose.prod.yml (for pre-built images)
curl -O https://raw.githubusercontent.com/thitar/chore-ganizer/main/docker-compose.prod.yml

# Download environment template
curl -O https://raw.githubusercontent.com/thitar/chore-ganizer/main/.env.example
mv .env.example .env

# Edit configuration (IMPORTANT!)
nano .env
# At minimum, change SESSION_SECRET to a random 32+ character string

# Pull and start the application
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
```

### Option 2: Building from Source

This option clones the repository and builds the Docker images locally. Use this if you want to customize the code or don't have access to the image registry.

```bash
# Clone the repository
git clone https://github.com/thitar/chore-ganizer.git
cd chore-ganizer

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env

# Build and start (uses docker-compose.yml which builds from source)
docker compose up -d --build

# Check status
docker compose ps
```

### Docker Compose Files Explained

| File | Purpose | Use Case |
|------|---------|----------|
| `docker-compose.yml` | Builds from source | Development, customization, offline builds |
| `docker-compose.prod.yml` | Pre-built images | Production, quick deployment, no build required |

### Access the Application

Open your browser and navigate to:
- **Local**: http://localhost:3002
- **Remote**: http://your-server-ip:3002

---

## 🔧 Detailed Installation Steps

### Step 1: Environment Variables Setup

Create your `.env` file with the following configuration:

```bash
# ===========================================
# REQUIRED SETTINGS - CHANGE THESE!
# ===========================================

# Generate a secure session secret (32+ characters)
# Run: openssl rand -base64 32
SESSION_SECRET=your-generated-secret-here

# Set to your domain when using HTTPS
CORS_ORIGIN=https://chores.yourdomain.com

# ===========================================
# OPTIONAL SETTINGS (Defaults work for most)
# ===========================================

# Application version
APP_VERSION=2.0.2

# Environment
NODE_ENV=production

# Ports (change if conflicts)
PORT=3010
FRONTEND_PORT=3002

# Database (SQLite, stored in volume)
DATABASE_URL=file:/app/data/chore-ganizer.db

# Logging level (error, warn, info, debug)
LOG_LEVEL=info

# Session duration (7 days default)
SESSION_MAX_AGE=604800000

# Enable secure cookies for HTTPS
SECURE_COOKIES=false

# ===========================================
# NOTIFICATION SETTINGS (ntfy)
# ===========================================

# Default ntfy server (public server or self-hosted)
NTFY_DEFAULT_SERVER_URL=https://ntfy.sh

# Default topic for family notifications
NTFY_DEFAULT_TOPIC=my-family-chores

# Notification toggles
NTFY_DEFAULT_NOTIFY_CHORE_ASSIGNED=true
NTFY_DEFAULT_NOTIFY_CHORE_DUE_SOON=true
NTFY_DEFAULT_NOTIFY_CHORE_COMPLETED=true
NTFY_DEFAULT_NOTIFY_CHORE_OVERDUE=true
NTFY_DEFAULT_NOTIFY_POINTS_EARNED=true

# Reminder hours before due
NTFY_DEFAULT_REMINDER_HOURS=2

# Quiet hours (optional)
NTFY_DEFAULT_QUIET_HOURS_START=22
NTFY_DEFAULT_QUIET_HOURS_END=7

# ===========================================
# OVERDUE PENALTY SETTINGS
# ===========================================

OVERDUE_PENALTY_ENABLED=true
OVERDUE_PENALTY_MULTIPLIER=2
NOTIFY_PARENT_ON_OVERDUE=true
```

### Step 2: Volume Configuration for Data Persistence

The default configuration uses Docker named volumes. For custom paths:

```yaml
# In docker-compose.yml, modify the volumes section:
volumes:
  backend-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /path/to/your/data
```

Or use bind mounts directly:

```yaml
services:
  backend:
    volumes:
      - /your/custom/path/data:/app/data
      - /your/custom/path/backups:/backups
```

### Step 3: SSL/TLS Configuration (Reverse Proxy)

#### Option A: Using Caddy (Recommended for simplicity)

Create a `Caddyfile`:

```caddyfile
chores.yourdomain.com {
    reverse_proxy frontend:80
    encode gzip
    header Strict-Transport-Security "max-age=31536000; include-subdomains; preload"
}
```

Run Caddy alongside Chore-Ganizer:

```yaml
# Add to docker-compose.yml
services:
  caddy:
    image: caddy:latest
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - chore-ganizer-network

volumes:
  caddy_data:
  caddy_config:
```

Update `.env`:

```bash
CORS_ORIGIN=https://chores.yourdomain.com
SECURE_COOKIES=true
```

#### Option B: Using Nginx Proxy Manager

1. Deploy Nginx Proxy Manager via Docker
2. Create a proxy host for `chores.yourdomain.com`
3. Point to `http://frontend:80` (or `http://chore-ganizer-frontend:80`)
4. Enable SSL with Let's Encrypt

#### Option C: Using Traefik

```yaml
# Add labels to frontend service in docker-compose.yml
services:
  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.chores.rule=Host(`chores.yourdomain.com`)"
      - "traefik.http.routers.chores.tls.certresolver=letsencrypt"
      - "traefik.http.services.chores.loadbalancer.server.port=80"
```

### Step 4: Email Notification Setup

Chore-Ganizer uses ntfy for push notifications. For email notifications (future feature):

```bash
# SMTP Configuration (optional, for future email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

### Step 5: Security Hardening

#### Generate Strong Secrets

```bash
# Generate session secret
openssl rand -base64 32

# Or use a password manager to create a 32+ character random string
```

#### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3002/tcp  # Only if not using reverse proxy
sudo ufw enable

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3002/tcp
sudo firewall-cmd --reload
```

#### Docker Security

```yaml
# Add security options to docker-compose.yml services
services:
  backend:
    security_opt:
      - no-new-privileges:true
    read_only: false  # SQLite needs write access
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
      - DAC_OVERRIDE
      - FOWNER

  frontend:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /var/cache/nginx
      - /var/run
      - /tmp
```

---

## 🎉 Post-Installation

### First-Time Setup (Create Parent Account)

1. Open the application in your browser
2. Click "Create Account" or "First Time Setup"
3. Create a **Parent** account with:
   - Username (e.g., `parent` or `mom`/`dad`)
   - Strong password
   - Display name
4. Log in with your new account
5. Add family members (children) via **Users** menu

### Verify Installation

```bash
# Check container status
docker compose ps

# Check logs
docker compose logs -f

# Check backend health
curl http://localhost:3010/api/health
# Expected: {"status":"ok",...}

# Check frontend health
curl http://localhost:3002/health
# Expected: healthy
```

### Backup Configuration

#### Automated Backups (Built-in)

Use the backup-enabled profile:

```bash
# Start with automated backups
docker compose --profile with-backup up -d
```

This runs daily backups at 2 AM with 7-day retention.

#### Manual Backup

```bash
# Create backup manually
docker compose exec backend /app/backup.sh

# Backups are stored in ./backups/ directory
ls -la backups/
```

#### Backup to External Storage

```bash
# Sync backups to external storage (add to cron)
rsync -avz ~/chore-ganizer/backups/ user@backup-server:/backups/chore-ganizer/
```

---

## 🔄 Upgrading

### Standard Upgrade (Pre-built Images)

If using `docker-compose.prod.yml` with pre-built images:

```bash
# Navigate to application directory
cd ~/chore-ganizer

# Pull new Docker images
docker compose -f docker-compose.prod.yml pull

# Stop current containers
docker compose -f docker-compose.prod.yml down

# Start with new images
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

### Standard Upgrade (Building from Source)

If using `docker-compose.yml` and building from source:

```bash
# Navigate to application directory
cd ~/chore-ganizer

# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose down
docker compose up -d --build

# Check logs
docker compose logs -f
```

### Upgrade with Database Migration

If the upgrade includes database schema changes:

```bash
# Backup before upgrading
docker compose exec backend /app/backup.sh

# Upgrade (pre-built images)
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# OR Upgrade (building from source)
docker compose down
docker compose up -d --build

# Check migration logs
docker compose logs backend | grep -i migration
```

### Rollback

If something goes wrong:

```bash
# Stop containers
docker compose down
# OR if using prod file:
# docker compose -f docker-compose.prod.yml down

# Restore database from backup
gunzip -c backups/chore-ganizer_YYYYMMDD_HHMMSS.db.gz > data/chore-ganizer.db

# Start with previous version (adjust command based on your setup)
docker compose up -d
# OR: docker compose -f docker-compose.prod.yml up -d
```

---

## 🔍 Troubleshooting

### Common Issues and Solutions

#### Container Won't Start

```bash
# Check logs
docker compose logs backend
docker compose logs frontend

# Common causes:
# - Port already in use: Change PORT in .env
# - Permission issues: Check volume permissions
# - Missing .env: Copy from .env.example
```

#### Database Errors

```bash
# Check database file
docker compose exec backend ls -la /app/data/

# Check database integrity
docker compose exec backend sqlite3 /app/data/chore-ganizer.db "PRAGMA integrity_check;"

# Re-run migrations
docker compose exec backend npx prisma migrate deploy
```

#### Session/Login Issues

```bash
# Check session secret is set
docker compose exec backend env | grep SESSION_SECRET

# Check cookie settings
# If using HTTPS, ensure SECURE_COOKIES=true
# Ensure CORS_ORIGIN matches your domain
```

#### API Connection Issues

```bash
# Check backend is running
curl http://localhost:3010/api/health

# Check frontend can reach backend
docker compose exec frontend wget -qO- http://backend:3010/api/health

# Check nginx proxy config
docker compose exec frontend cat /etc/nginx/conf.d/default.conf
```

#### Notification Issues

```bash
# Check ntfy configuration
docker compose exec backend env | grep NTFY

# Test ntfy connection
curl -d "Test message" https://ntfy.sh/your-topic
```

### Log Locations

| Log | Location |
|-----|----------|
| Backend logs | `docker compose logs backend` |
| Frontend logs | `docker compose logs frontend` |
| Backup logs | `docker compose logs backend-with-backup` |
| Cron logs | Inside container: `/var/log/backup.log` |

### Health Check Endpoints

| Endpoint | Purpose |
|----------|---------|
| `http://localhost:3002/health` | Frontend health |
| `http://localhost:3010/api/health` | Backend health |
| `http://localhost:3002/api/health` | Backend via nginx proxy |

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# In .env
LOG_LEVEL=debug
VITE_DEBUG=true

# Restart containers
docker compose restart
```

### Reset to Factory Defaults

```bash
# WARNING: This deletes all data!

# Stop containers
docker compose down

# Remove volumes
docker volume rm chore-ganizer-data

# Remove database file (if using bind mount)
rm -f data/chore-ganizer.db

# Start fresh
docker compose up -d
```

---

## 📚 Additional Resources

- [Docker Configuration Guide](./DOCKER-CONFIGURATION.md) - Detailed Docker setup
- [Backup and Restore Guide](./BACKUP-RESTORE-GUIDE.md) - Backup procedures
- [User Guide](./USER-GUIDE.md) - Using the application
- [Admin Guide](./ADMIN-GUIDE.md) - Administration tasks
- [Security Hardening](./SECURITY-HARDENING.md) - Security best practices

---

## 🆘 Getting Help

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review application logs: `docker compose logs -f`
3. Check GitHub Issues for known problems
4. Create a new issue with:
   - Docker version: `docker --version`
   - Docker Compose version: `docker compose version`
   - Relevant logs
   - Steps to reproduce

---

## 📝 Example docker-compose.yml for Production

```yaml
# Production docker-compose.yml
# Save as docker-compose.prod.yml for production overrides

services:
  frontend:
    image: chore-ganizer/frontend:latest
    # Or build from source:
    # build:
    #   context: ./frontend
    #   dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-3002}:80"
    environment:
      - VITE_API_URL=${VITE_API_URL:-}
      - VITE_DEBUG=${VITE_DEBUG:-false}
      - VITE_APP_VERSION=${APP_VERSION:-1.8.0}
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - chore-ganizer-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    security_opt:
      - no-new-privileges:true

  backend:
    image: chore-ganizer/backend:latest
    # Or build from source:
    # build:
    #   context: ./backend
    #   dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "${PORT:-3010}:3010"
    environment:
      - NODE_ENV=production
      - PORT=3010
      - APP_VERSION=${APP_VERSION:-1.8.0}
      - DATABASE_URL=${DATABASE_URL:-file:/app/data/chore-ganizer.db}
      - SESSION_SECRET=${SESSION_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN}
      - SECURE_COOKIES=${SECURE_COOKIES:-false}
      - SESSION_MAX_AGE=${SESSION_MAX_AGE:-604800000}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - NTFY_DEFAULT_SERVER_URL=${NTFY_DEFAULT_SERVER_URL:-https://ntfy.sh}
      - NTFY_DEFAULT_TOPIC=${NTFY_DEFAULT_TOPIC:-}
      - OVERDUE_PENALTY_ENABLED=${OVERDUE_PENALTY_ENABLED:-true}
      - OVERDUE_PENALTY_MULTIPLIER=${OVERDUE_PENALTY_MULTIPLIER:-2}
    volumes:
      - backend-data:/app/data
    networks:
      - chore-ganizer-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3010/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    security_opt:
      - no-new-privileges:true

volumes:
  backend-data:
    driver: local
    name: chore-ganizer-data

networks:
  chore-ganizer-network:
    driver: bridge
    name: chore-ganizer-network
```

---

*Last updated: 2026-02-23*
