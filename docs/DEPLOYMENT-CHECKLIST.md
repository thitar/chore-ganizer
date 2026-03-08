# ✅ Chore-Ganizer Deployment Checklist

Use this checklist when deploying Chore-Ganizer to your homelab for the first time.

> **📖 For ongoing operations, maintenance, and troubleshooting, see:** [POST-DEPLOYMENT-GUIDE.md](./POST-DEPLOYMENT-GUIDE.md)
> **🔧 For Docker configuration details, see:** [DOCKER-CONFIGURATION.md](./DOCKER-CONFIGURATION.md)
> **💾 For backup/restore procedures, see:** [BACKUP-RESTORE-GUIDE.md](./BACKUP-RESTORE-GUIDE.md)

---

## 📋 Pre-Deployment

### Server Requirements
- [ ] Docker installed (version 20.10+)
  ```bash
  docker --version
  ```
- [ ] Docker Compose installed (version 2.0+)
  ```bash
  docker-compose --version
  ```
- [ ] Git installed
  ```bash
  git --version
  ```
- [ ] Sufficient disk space (at least 2GB free)
  ```bash
  df -h
  ```
- [ ] Ports 3002 and 3010 available
  ```bash
  sudo netstat -tulpn | grep -E ':(3002|3010)'
  ```

### Network Configuration
- [ ] Know your server's IP address
  ```bash
  hostname -I | awk '{print $1}'
  ```
- [ ] Firewall configured (if applicable)
  ```bash
  sudo ufw allow 3002
  sudo ufw allow 3010
  ```
- [ ] Family devices can reach the server
  ```bash
  # From phone/tablet, ping: YOUR_SERVER_IP
  ```

---

## 🚀 Initial Setup

### 1. Get the Code
- [ ] Clone or upload the repository
  ```bash
  cd ~/apps
  git clone https://github.com/thitar/chore-ganizer.git chore-ganizer
  cd chore-ganizer
  ```

### 2. Create Required Directories
- [ ] Create data directories
  ```bash
  mkdir -p data/backups data/uploads
  ```
- [ ] Set permissions
  ```bash
  chmod 755 data data/backups data/uploads
  ```
- [ ] Create .gitkeep files
  ```bash
  touch data/backups/.gitkeep data/uploads/.gitkeep
  ```

### 3. Configure Environment
- [ ] Copy .env.example to .env
  ```bash
  cp .env.example .env
  ```
- [ ] Generate strong SESSION_SECRET
  ```bash
  openssl rand -base64 32
  ```
- [ ] Edit .env file with your values
  ```bash
  nano .env
  ```
  
  **Required changes:**
  - [ ] Set `SESSION_SECRET` to generated value
  - [ ] Set `CORS_ORIGIN` to your frontend URL
  - [ ] Set `VITE_API_URL` to your backend URL
  
  **Example for local network:**
  ```bash
  SESSION_SECRET=your-generated-secret-here
  CORS_ORIGIN=http://192.168.1.100:3002
  VITE_API_URL=http://192.168.1.100:3010
  ```

### 4. Customize Family Data
- [ ] Edit backend/prisma/seed.ts
- [ ] Update family member names
- [ ] Change default passwords
- [ ] Update email addresses
  
  **Example:**
  ```typescript
  {
    email: 'dad@home',
    password: await bcrypt.hash('your-secure-password', 10),
    name: 'John',
    role: UserRole.PARENT,
  }
  ```

---

## 🐳 Docker Deployment

### 5. Build and Start Containers
- [ ] Build Docker images
  ```bash
  docker-compose build
  ```
- [ ] Start containers
  ```bash
  docker-compose up -d
  ```
- [ ] Verify containers are running
  ```bash
  docker-compose ps
  ```
  ✅ Both containers should show "Up" status

### 6. Initialize Database
- [ ] Run database migrations
  ```bash
  docker-compose exec backend npx prisma migrate deploy
  ```
  ✅ Should see: "Migration applied successfully"
  
- [ ] Seed initial data
  ```bash
  docker-compose exec backend npx prisma db seed
  ```
  ✅ Should see: "Database seeded successfully"

### 7. Verify Backend
- [ ] Check backend health
  ```bash
  curl http://localhost:3010/health
  ```
  ✅ Should return: `{"status":"ok","timestamp":"..."}`
  
- [ ] Check backend logs
  ```bash
  docker-compose logs backend --tail=50
  ```
  ✅ No errors, should see: "Server running on port 3010"

### 8. Verify Frontend
- [ ] Check frontend is accessible
  ```bash
  curl http://localhost:3002/
  ```
  ✅ Should return HTML content
  
- [ ] Check frontend logs
  ```bash
  docker-compose logs frontend --tail=50
  ```
  ✅ No errors

---

## 🧪 Testing

### 9. Test from Server
- [ ] Open browser on server
- [ ] Navigate to `http://localhost:3002`
- [ ] Should see login page
- [ ] Login as parent (dad@home / your-password)
- [ ] Should see dashboard
- [ ] Create a test chore
- [ ] Logout
- [ ] Login as child (alice@home / your-password)
- [ ] Should see the test chore
- [ ] Mark chore as complete
- [ ] Verify points were awarded

### 10. Test from Network Devices
- [ ] Open browser on phone/tablet
- [ ] Navigate to `http://YOUR_SERVER_IP:3002`
- [ ] Login works
- [ ] All features work
- [ ] Responsive design looks good
- [ ] No errors in browser console (F12)

---

## 💾 Backup Configuration

### 11. Setup Automated Backups
- [ ] Make backup script executable
  ```bash
  chmod +x backup.sh
  ```
- [ ] Test backup script
  ```bash
  ./backup.sh
  ```
- [ ] Verify backup was created
  ```bash
  ls -lh data/backups/
  ```
  ✅ Should see a .db.gz file
  
- [ ] Add to crontab for daily backups
  ```bash
  crontab -e
  ```
  Add line:
  ```
  0 2 * * * /full/path/to/chore-ganizer/backup.sh >> /full/path/to/chore-ganizer/data/backups/backup.log 2>&1
  ```
- [ ] Verify crontab entry
  ```bash
  crontab -l
  ```

### 12. Test Backup Restore
- [ ] Stop backend
  ```bash
  docker-compose stop backend
  ```
- [ ] Backup current database
  ```bash
  cp data/chore-ganizer.db data/chore-ganizer.db.test-backup
  ```
- [ ] Restore from backup
  ```bash
  gunzip -c data/backups/chore-ganizer_*.db.gz | head -1 > data/chore-ganizer.db
  ```
- [ ] Start backend
  ```bash
  docker-compose start backend
  ```
- [ ] Verify data is intact
  ```bash
  docker-compose exec backend npx prisma studio
  ```
  ✅ Should see all your data

---

## 🔒 Security Checks

### 13. Security Verification
- [ ] SESSION_SECRET is strong (32+ characters)
  ```bash
  docker-compose exec backend printenv SESSION_SECRET | wc -c
  ```
  ✅ Should be > 32
  
- [ ] Default passwords changed in seed.ts
- [ ] .env file is NOT committed to git
  ```bash
  git status
  ```
  ✅ .env should NOT appear in untracked files
  
- [ ] Database file is NOT committed to git
  ```bash
  git status
  ```
  ✅ *.db files should NOT appear
  
- [ ] Firewall configured (if exposing publicly)
- [ ] HTTPS configured (if exposing publicly)

---

## 📊 Monitoring Setup

### 14. Integration with Homelab Dashboard (Optional)
- [ ] Add to Portainer (if using)
- [ ] Add to Traefik (if using)
- [ ] Add to monitoring stack (Prometheus/Grafana)
- [ ] Configure health check endpoints
- [ ] Set up alerts for downtime

---

## 📝 Documentation

### 15. Document Your Setup
- [ ] Note your server IP address: `___________________`
- [ ] Note ports used: Frontend `_____` Backend `_____`
- [ ] Save family login credentials securely
- [ ] Document any customizations made
- [ ] Create a "How to Use" guide for family members

---

## 👥 Family Onboarding

### 16. Introduce to Family
- [ ] Show family members how to access the app
- [ ] Demonstrate login process
- [ ] Show parents how to create chores
- [ ] Show kids how to complete chores
- [ ] Explain the points system
- [ ] Create first week of real chores together
- [ ] Bookmark the app on everyone's devices

---

## 🎉 Post-Deployment

### 17. First Week Monitoring
- [ ] Check logs daily
  ```bash
  docker-compose logs --tail=100
  ```
- [ ] Monitor family usage
- [ ] Fix any usability issues
- [ ] Gather feedback from family
- [ ] Make adjustments as needed

### 18. Week 2 Check
- [ ] Verify backups are running
  ```bash
  ls -lht data/backups/ | head -10
  ```
- [ ] Check disk space usage
  ```bash
  du -sh data/
  ```
- [ ] Review any errors in logs
- [ ] Ensure all family members are using it
- [ ] Celebrate success! 🎊

---

## 🆘 Troubleshooting Checklist

If something doesn't work:
- [ ] Check container status: `docker-compose ps`
- [ ] Check logs: `docker-compose logs -f`
- [ ] Verify health endpoint: `curl http://localhost:3010/health`
- [ ] Check firewall: `sudo ufw status`
- [ ] Verify .env configuration
- [ ] Restart containers: `docker-compose restart`
- [ ] Consult CHORE-GANIZER-DEVELOPMENT-PLAN.md troubleshooting section

---

## ✅ Completion Checklist

**You're done when:**
- [ ] ✅ All containers running (`docker-compose ps`)
- [ ] ✅ Backend health check passes
- [ ] ✅ Frontend accessible from all devices
- [ ] ✅ All family members can login
- [ ] ✅ Chores can be created and completed
- [ ] ✅ Points are awarded correctly
- [ ] ✅ Notifications appear
- [ ] ✅ Backups are configured and working
- [ ] ✅ .env and .db files are gitignored
- [ ] ✅ Family is using it daily!

---

**Congratulations! Your Chore-Ganizer is deployed and ready! 🎉**

**Next Steps:**
1. Use it for at least 2 weeks to work out any kinks
2. Consider adding rewards system (see development plan)
3. Set up recurring chores (see development plan)
4. Share your success on r/homelab!

**Remember:**
- Keep backups updated
- Monitor disk space
- Check logs occasionally
- Update when new features are added

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Server IP:** _______________  
**Notes:** _______________________________________________
