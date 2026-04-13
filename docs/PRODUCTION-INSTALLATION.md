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

This option downloads pre-built Docker images from the registry. No source code or build process required.

```bash
# Create application directory
mkdir -p ~/chore-ganizer
cd ~/chore-ganizer

# Download docker-compose.yml and .env.example
curl -O https://raw.githubusercontent.com/thitar/chore-ganizer/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/thitar/chore-ganizer/main/.env.example
mv .env.example .env

# Edit configuration (IMPORTANT!)
nano .env
# At minimum, change SESSION_SECRET to a random 32+ character string

# Create the data directory (must exist before starting)
mkdir -p /opt/app-data/chore-ganizer backups

# Pull and start the application
docker compose up -d

# Check status
docker compose ps
```

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

# Data directory (host path for bind mount)
DATA_DIR=/opt/app-data/chore-ganizer

# Container user/group IDs (match your host user to avoid permission issues)
PUID=1000
PGID=1000

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

### Step 2: Data Directory Configuration

The application uses a bind mount for persistent data. By default, data is stored at `/opt/app-data/chore-ganizer`. To use a custom path, set `DATA_DIR` in your `.env`:

```bash
# Custom data directory
DATA_DIR=/srv/chore-ganizer/data
```

The bind mount maps the host path to the same path inside the container. Ensure the directory exists and is accessible before starting:

```bash
mkdir -p "${DATA_DIR:-/opt/app-data/chore-ganizer}"
```

#### Volume Permissions

When using bind mounts, files created by the container will be owned by your host user if you set `PUID` and `PGID` to match:

```bash
# Find your host UID and GID
id -u && id -g

# Set them in .env
PUID=1000
PGID=1000
```

The container adjusts the internal `appuser` UID/GID at startup to match your host user.

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

### Standard Upgrade

```bash
# Navigate to application directory
cd ~/chore-ganizer

# Pull new Docker images
docker compose pull

# Stop current containers
docker compose down

# Start with new images
docker compose up -d

# Check logs
docker compose logs -f
```

### Upgrade with Database Migration

If the upgrade includes database schema changes:

```bash
# Backup before upgrading
docker compose exec backend /app/backup.sh

# Upgrade
docker compose pull
docker compose down
docker compose up -d

# Check migration logs
docker compose logs backend | grep -i migration
```

### Rollback

If something goes wrong:

```bash
# Stop containers
docker compose down

# Restore database from backup
gunzip -c backups/chore-ganizer_YYYYMMDD_HHMMSS.db.gz > "${DATA_DIR:-/opt/app-data/chore-ganizer}/chore-ganizer.db"

# Start with previous version
docker compose up -d
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
docker compose exec backend ls -la "${DATA_DIR:-/opt/app-data/chore-ganizer}/"

# Check database integrity
docker compose exec backend sqlite3 "${DATA_DIR:-/opt/app-data/chore-ganizer}/chore-ganizer.db" "PRAGMA integrity_check;"

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

# Remove data directory
rm -rf "${DATA_DIR:-/opt/app-data/chore-ganizer}"/*

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

*Last updated: 2026-04-01*
