# 📢 NTFY Setup Guide for Chore-Ganizer

Complete guide to set up ntfy server for push notifications in your homelab.

---

## 📋 Table of Contents

1. [Understanding ntfy](#understanding-ntfy)
2. [Server Setup](#server-setup)
3. [Chore-Ganizer Configuration](#chore-ganizer-configuration)
4. [Client Setup](#client-setup)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## 🔍 Understanding ntfy

### What is ntfy?

**ntfy** is a simple HTTP-based push notification service. It works like this:

```
Your app (Chore-Ganizer) → POST to ntfy → ntfy server → User's phone/browser
```

### How Chore-Ganizer uses ntfy

- Each **user** gets their own **notification topic** (like a channel)
- When a chore event happens, app sends notification to that topic
- User subscribes to their topic and receives notifications
- **Parents** can have a shared topic to get all children's updates

### Topic Structure (Example)

```
Children:
  - alice.chores     (Alice's notifications)
  - bob.chores       (Bob's notifications)

Parents:
  - family.updates   (Shared parent channel)
```

---

## 🚀 Server Setup

### Option 1: Docker Container (Recommended for Homelab)

#### Prerequisites
- Docker and Docker Compose installed
- Port 80 (HTTP) available on homelab server

#### Step 1: Create docker-compose.yml entry

Add to your existing `docker-compose.yml` or create a new one:

```yaml
services:
  ntfy:
    image: binwiederhier/ntfy:latest
    container_name: chore-ganizer-ntfy
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ntfy-data:/var/cache/ntfy
    environment:
      - NTFY_LISTEN_HTTP=0.0.0.0:80
      - NTFY_LISTEN_HTTPS=
      - NTFY_AUTH_DEFAULT=deny
      - NTFY_AUTH_FILE=/etc/ntfy/auth.db
      - NTFY_VISITOR_SUBSCRIPTION_LIMIT=10
    networks:
      - chore-ganizer-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  ntfy-data:
    driver: local

networks:
  chore-ganizer-network:
    driver: bridge
```

#### Step 2: Start ntfy

```bash
# If using separate docker-compose for ntfy:
docker-compose -f docker-compose.ntfy.yml up -d

# OR if adding to existing docker-compose.yml:
docker-compose up -d ntfy

# Verify it's running
docker-compose logs ntfy
# Should see: "Listening on 0.0.0.0:80"
```

#### Step 3: Verify ntfy is accessible

```bash
# From your homelab server:
curl http://localhost:8080/health
# Should return: ok

# From another device on your network:
curl http://192.168.1.100:8080/health
# Replace with your homelab server IP
```

---

### Option 2: Standalone Binary (Advanced)

If you prefer to run ntfy directly on your server:

```bash
# Download latest binary
wget https://github.com/binwiederhier/ntfy/releases/download/v2.8.0/ntfy-v2.8.0-linux-x86_64.tar.gz
tar xzvf ntfy-v2.8.0-linux-x86_64.tar.gz
sudo mv ntfy-v2.8.0-linux-x86_64/ntfy /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/ntfy.service > /dev/null <<EOF
[Unit]
Description=ntfy - push notifications service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/ntfy serve --listen 0.0.0.0:8080
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable ntfy
sudo systemctl start ntfy

# Verify
sudo systemctl status ntfy
curl http://localhost:8080/health
```

---

## ⚙️ Chore-Ganizer Configuration

### Step 1: Update .env file

Set the ntfy server URL for Chore-Ganizer:

```bash
# .env file (in root of chore-ganizer directory)

# ===== NTFY Configuration =====

# Your ntfy server (homelab IP)
NTFY_DEFAULT_SERVER_URL=http://192.168.1.100:8080
# OR if ntfy is in same docker network:
NTFY_DEFAULT_SERVER_URL=http://ntfy:80

# Enable notifications by default
NTFY_DEFAULT_NOTIFY_CHORE_ASSIGNED=true
NTFY_DEFAULT_NOTIFY_CHORE_DUE_SOON=true
NTFY_DEFAULT_NOTIFY_CHORE_COMPLETED=true
NTFY_DEFAULT_NOTIFY_CHORE_OVERDUE=true
NTFY_DEFAULT_NOTIFY_POINTS_EARNED=true

# Reminder hours before due date
NTFY_DEFAULT_REMINDER_HOURS=2

# Quiet hours (optional - no notifications between 22:00 and 07:00)
NTFY_DEFAULT_QUIET_HOURS_START=22
NTFY_DEFAULT_QUIET_HOURS_END=7

# Overdue penalty notifications
OVERDUE_PENALTY_ENABLED=true
OVERDUE_PENALTY_MULTIPLIER=2
NOTIFY_PARENT_ON_OVERDUE=true
```

### Step 2: Restart Chore-Ganizer backend

```bash
docker compose restart backend

# Verify backend can reach ntfy
docker compose logs backend | grep -i ntfy
```

---

## 👥 Client Setup (Configure User Topics)

Each user must set their notification topic. Users can do this in the **Settings** page.

### For Children (Individual Topics)

Each child should have their own topic.

**Via UI (Recommended)**:
1. Child logs in
2. Go to **Profile** → **Notification Settings**
3. Enter ntfy topic: `alice.chores` (or use their name)
4. Click "Test Connection" to verify
5. Save settings

**Via Database (Manual)**:
```bash
# If you need to configure before they log in:
docker-compose exec backend npx prisma studio
# Open http://localhost:5555
# Go to UserNotificationSettings table
# For Alice:
#   - userId: 1 (or Alice's ID)
#   - ntfyTopic: alice.chores
#   - ntfyServerUrl: http://ntfy:80 (or your server URL)
```

### For Parents (Shared Topic)

Parents can subscribe to a shared topic to see all family updates.

**Via UI**:
1. Parent logs in
2. Go to **Profile** → **Notification Settings**
3. Enter ntfy topic: `family.updates`
4. Click "Test Connection"
5. Save settings

**Via Database**:
```bash
docker-compose exec backend npx prisma studio
# For Dad (parent):
#   - userId: 2
#   - ntfyTopic: family.updates
#   - ntfyServerUrl: http://ntfy:80
```

### Example Configuration

| User | Role | Topic | Server URL |
|------|------|-------|-----------|
| Alice | CHILD | `alice.chores` | `http://192.168.1.100:8080` |
| Bob | CHILD | `bob.chores` | `http://192.168.1.100:8080` |
| Dad | PARENT | `family.updates` | `http://192.168.1.100:8080` |
| Mom | PARENT | `family.updates` | `http://192.168.1.100:8080` |

---

## 📱 Client Setup (Receiving Notifications)

Users subscribe to their topics to receive notifications.

### Option 1: ntfy Web App (Easiest)

1. Open browser: `http://192.168.1.100:8080`
2. Enter your topic (e.g., `alice.chores`)
3. Subscribe
4. Notifications appear in browser
5. Bookmark for quick access

### Option 2: Native Apps

**iOS** (iPhone/iPad):
- Download: [ntfy iOS app](https://apps.apple.com/us/app/ntfy/id1625396347)
- Open app → "+" → Enter your topic
- Will receive push notifications even when app is closed

**Android**:
- Download: [ntfy Android app](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
- Open app → "+" → Enter your topic
- Will receive push notifications

**Desktop** (Windows/Mac/Linux):
- Web browser: `http://192.168.1.100:8080`
- Bookmark for quick access

### Option 3: ntfy Android App (For Kids' Devices)

1. Install from Play Store
2. Tap "+" to add subscription
3. Enter topic: `alice.chores`
4. Enable notifications
5. Done!

---

## 🧪 Testing

### Test 1: Direct ntfy Test

```bash
# Send a test notification directly to ntfy
curl -d "Test notification from command line" \
  -H "Title: Test Title" \
  -H "Priority: high" \
  http://192.168.1.100:8080/alice.chores

# Then:
# - Open ntfy web: http://192.168.1.100:8080/?alice.chores
# - Should see notification appear
# - Check Android/iOS app if subscribed
```

### Test 2: From Chore-Ganizer

#### Test via API

```bash
# Get CSRF token
curl -c cookies.txt http://localhost:3002/api/csrf-token

# Send test notification (requires auth)
curl -b cookies.txt \
  -X POST http://localhost:3010/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <your-csrf-token>" \
  -d '{"userId": 1}'
```

#### Test via UI

1. Login to Chore-Ganizer as a user
2. Go to Profile → Notification Settings
3. Click "Test Connection"
4. Should see success message
5. Open ntfy web and subscribe to topic
6. Should see test notification

### Test 3: Create Chore and Trigger Notification

1. Parent logs in
2. Create a chore assigned to a child
3. Set due date to today or tomorrow
4. Child should receive "CHORE_ASSIGNED" notification
5. Check ntfy web app or mobile app

### Test 4: Complete Chore and Trigger Parent Notification

1. Child logs in
2. Complete an assigned chore
3. Parent should receive "CHORE_COMPLETED" notification
4. Check parent's ntfy subscription

---

## 🔍 Troubleshooting

### Issue: ntfy server not starting

**Symptom**: Container won't start or keeps restarting

**Diagnosis**:
```bash
docker-compose logs ntfy
# Look for error messages
```

**Solutions**:
1. Check port 8080 is not in use:
   ```bash
   sudo lsof -i :8080
   # If in use, stop conflicting service or change port
   ```

2. Check Docker image exists:
   ```bash
   docker pull binwiederhier/ntfy:latest
   docker-compose up -d ntfy
   ```

### Issue: Backend can't reach ntfy

**Symptom**: Notifications fail to send, logs show connection errors

**Diagnosis**:
```bash
# Check ntfy is running
docker-compose ps ntfy

# Test from backend container
docker-compose exec backend curl http://ntfy:80/health
# Should return: ok

# Check .env has correct URL
docker-compose exec backend printenv | grep NTFY_DEFAULT_SERVER_URL
```

**Solutions**:
1. Ensure ntfy is running: `docker-compose up -d ntfy`
2. If using container: Use `http://ntfy:80` in .env (not IP)
3. If using external: Use full URL `http://192.168.1.100:8080`
4. Restart backend: `docker-compose restart backend`

### Issue: User not receiving notifications

**Symptom**: Chore assigned but no notification received

**Diagnosis**:
```bash
# Check user has topic configured
docker-compose exec backend npx prisma studio
# Go to UserNotificationSettings table
# Verify user has ntfyTopic and ntfyServerUrl filled in

# Check backend logs
docker-compose logs backend | grep -i notification | tail -20
```

**Solutions**:
1. User must configure ntfy topic in Profile → Notification Settings
2. Test connection from UI (click "Test" button)
3. User must subscribe to topic in ntfy app/web
4. Check quiet hours aren't blocking notifications

### Issue: User configured topic but can't see notifications

**Symptom**: Topic configured in app but nothing arrives

**Diagnosis**:
```bash
# Check if backend successfully sends notification
docker-compose logs backend | grep -i "ntfy.*notification"

# Manually test topic
curl -d "test message" \
  -H "Title: Test" \
  http://192.168.1.100:8080/alice.chores

# Then open: http://192.168.1.100:8080/?alice.chores
# Should see test notification
```

**Solutions**:
1. Ensure user clicked "Test Connection" (tests the topic exists)
2. User must subscribe to topic in ntfy (separate from Chore-Ganizer)
3. Check quiet hours aren't blocking (Quiet Hours Start/End in settings)
4. Verify notification types are enabled (checkboxes in Notification Settings)

### Issue: Quiet hours not working

**Symptom**: Getting notifications outside quiet hours

**Diagnosis**:
```bash
# Check quiet hours configuration
docker-compose exec backend printenv | grep QUIET_HOURS
```

**Note**: Current implementation stores quiet hours per user but doesn't enforce them. This is a known limitation.

**Workaround**: Users can manually disable notifications outside quiet hours.

### Issue: Different notifications not arriving

**Symptom**: Some notifications work (e.g., CHORE_ASSIGNED) but others don't (e.g., CHORE_COMPLETED)

**Diagnosis**:
Check if notification type is enabled:
```bash
docker-compose exec backend npx prisma studio
# UserNotificationSettings table
# Check these booleans:
#   - notifyChoreAssigned
#   - notifyChoreCompleted
#   - notifyChoreOverdue
#   - notifyPointsEarned
```

**Solutions**:
1. Enable the notification type in Profile → Notification Settings
2. Ensure correct NTFY_DEFAULT_NOTIFY_* env vars set in .env
3. Restart backend after env changes

---

## 📊 Notification Types Reference

| Type | Sent To | Trigger | Priority |
|------|---------|---------|----------|
| CHORE_ASSIGNED | Child | Parent assigns chore | Normal (3) |
| CHORE_DUE_SOON | Child | 2 hours before due (configurable) | High (4) |
| CHORE_OVERDUE | Child | Chore passes due date | Urgent (5) |
| CHORE_COMPLETED | Parent | Child marks chore done | Low (2) |
| POINTS_EARNED | Child | Chore completed | Low (2) |

---

## 🔐 Security Notes

### Topics are Public

⚠️ **Important**: ntfy topics are **public by default**. Anyone who knows the topic name can subscribe.

This is fine for homelab use, but be aware:
- Don't use sensitive info in topic names
- Use non-obvious topic names (avoid `alice`, use `alice-chores-2026`)
- If you need authentication, ntfy supports it (see Advanced section below)

### Running on Public Internet

If exposing ntfy externally:

1. **Use HTTPS**:
   ```yaml
   environment:
     - NTFY_LISTEN_HTTPS=0.0.0.0:443
     # Add TLS cert/key paths
   ```

2. **Enable auth**:
   ```bash
   # Only authenticated users can subscribe
   docker-compose exec ntfy ntfy user add alice
   ```

---

## 🚀 Advanced: Adding Authentication

If you want to restrict who can subscribe to topics:

```bash
# Add a user
docker-compose exec ntfy ntfy user add alice

# User will be prompted for password
# Then topics are only accessible to authenticated users
```

Then in Chore-Ganizer, users provide username/password in Notification Settings.

---

## 📚 Additional Resources

- [ntfy Documentation](https://docs.ntfy.sh/)
- [ntfy Docker Image](https://docs.ntfy.sh/install/#docker)
- [ntfy Android App](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
- [ntfy iOS App](https://apps.apple.com/us/app/ntfy/id1625396347)

---

**Last Updated**: 2026-03-30
**Version**: 1.0
