# 🏠 Chore-Ganizer

A modern, family-friendly chore management system designed for homelab deployment. Built with React, TypeScript, Express, and SQLite.

## 📋 Features

### Current (MVP)
- ✅ **User Authentication** - Secure session-based login
- ✅ **Chore Management** - Create, edit, delete, and assign chores
- ✅ **Points System** - Earn points for completing chores
- ✅ **Role-Based Access** - Different capabilities for parents and children
- ✅ **Notifications** - In-app notifications for chore events
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile
- ✅ **Docker Deployment** - Easy deployment with Docker Compose

### Planned (Future)
- 🔜 Rewards marketplace
- 🔜 Recurring chores (daily/weekly/monthly)
- 🔜 Round-robin assignment rotation
- 🔜 Advanced analytics and charts

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- React Query
- React Router v6

**Backend:**
- Node.js 20 + Express + TypeScript
- Prisma ORM
- SQLite
- Express Session (authentication)
- Bcrypt (password hashing)
- Zod (validation)

**Deployment:**
- Docker + Docker Compose
- Nginx (frontend server)

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (for development)
- Docker & Docker Compose (for production)
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd chore-ganizer
   ```

2. **Set up backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npx prisma migrate dev
   npx prisma db seed
   npm run dev
   ```

3. **Set up frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000
   - Prisma Studio: http://localhost:5555 (run `npx prisma studio`)

### Default Login Credentials

After running the seed script:

**Parents:**
- dad@home / password123
- mom@home / password123

**Children:**
- alice@home / password123
- bob@home / password123

**⚠️ Change these passwords in `backend/prisma/seed.ts` before deploying!**

## 🐳 Production Deployment

### 1. Initial Setup

```bash
# On your homelab server
git clone <your-repo-url>
cd chore-ganizer

# Create required directories
mkdir -p data uploads data/backups

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Generate secure session secret
openssl rand -base64 32  # Copy output to SESSION_SECRET in .env
```

### 2. Deploy with Docker Compose

```bash
# Build and start containers
docker-compose up -d --build

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Seed initial data
docker-compose exec backend npx prisma db seed

# Check status
docker-compose ps
docker-compose logs -f
```

### 3. Verify Deployment

```bash
# Check backend health
curl http://localhost:3000/health

# Check frontend
curl http://localhost:3001/

# Access from browser
# Navigate to: http://YOUR_SERVER_IP:3001
```

### 4. Set Up Backups

```bash
# Make backup script executable
chmod +x backup.sh

# Test backup
./backup.sh

# Add to crontab for daily backups at 2 AM
crontab -e
# Add: 0 2 * * * /path/to/chore-ganizer/backup.sh >> /path/to/chore-ganizer/data/backups/backup.log 2>&1
```

## 📁 Project Structure

```
chore-ganizer/
├── backend/              # Express API
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Auth, validation, etc.
│   │   └── types/        # TypeScript types
│   ├── prisma/
│   │   ├── schema.prisma # Database schema
│   │   ├── seed.ts       # Initial data
│   │   └── migrations/   # Database migrations
│   └── Dockerfile
│
├── frontend/             # React app
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── api/          # API client
│   │   ├── store/        # State management
│   │   └── hooks/        # Custom hooks
│   ├── nginx.conf
│   └── Dockerfile
│
├── data/                 # Persistent data (gitignored)
│   ├── chores.db         # SQLite database
│   ├── uploads/          # User uploads
│   └── backups/          # Database backups
│
├── docker-compose.yml    # Production deployment
├── backup.sh             # Automated backup script
└── README.md             # This file
```

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```bash
NODE_ENV=production
DATABASE_URL=file:/app/data/chores.db
SESSION_SECRET=your-secret-here
PORT=3000
CORS_ORIGIN=http://localhost:3001
LOG_LEVEL=info
```

**Frontend (.env):**
```bash
VITE_API_URL=http://localhost:3000
```

See `.env.example` files for complete configuration options.

## 📊 Common Tasks

### Update Application

```bash
git pull
docker-compose up -d --build
docker-compose exec backend npx prisma migrate deploy
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100
```

### Database Management

```bash
# Open Prisma Studio (database GUI)
docker-compose exec backend npx prisma studio

# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Check migration status
docker-compose exec backend npx prisma migrate status

# Manual backup
docker-compose exec backend cp /app/data/chores.db /app/data/chores-$(date +%Y%m%d).db
```

### Restart Services

```bash
# Restart everything
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend

# Stop and start
docker-compose down
docker-compose up -d
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Missing SESSION_SECRET in .env
# 2. Database file permissions
# 3. Port 3000 already in use

# Fix permissions
chmod 755 data
chown -R 1000:1000 data
```

### Cannot connect from other devices
```bash
# Check firewall
sudo ufw status
sudo ufw allow 3000
sudo ufw allow 3001

# Update CORS_ORIGIN in .env to include your network
# CORS_ORIGIN=http://192.168.1.100:3001
```

### Database locked errors
```bash
# Restart backend
docker-compose restart backend

# If persistent, increase timeout in DATABASE_URL:
# DATABASE_URL="file:/app/data/chores.db?timeout=10000"
```

### Sessions not persisting
```bash
# Verify SESSION_SECRET is set
docker-compose exec backend printenv SESSION_SECRET

# Check cookie settings in browser DevTools
# Ensure withCredentials: true in frontend API client
```

For more detailed troubleshooting, see the [Development Plan](./CHORE-GANIZER-DEVELOPMENT-PLAN.md).

## 🔒 Security Considerations

### Before Deploying:
1. ✅ Change `SESSION_SECRET` to a strong random value
2. ✅ Update default passwords in `seed.ts`
3. ✅ Configure firewall rules
4. ✅ Set up HTTPS if exposing publicly (use reverse proxy)
5. ✅ Regular backups configured
6. ✅ Review CORS settings

### For Public Internet Access:
- Use a reverse proxy (Traefik, Nginx Proxy Manager)
- Enable HTTPS with Let's Encrypt
- Consider adding rate limiting
- Set up fail2ban for login attempts
- Use strong passwords for all accounts

## 🧪 Testing

### Manual Testing Checklist

**As Parent:**
- [ ] Login works
- [ ] Can create new chore
- [ ] Can edit chore
- [ ] Can delete chore
- [ ] Can assign chore to family member
- [ ] Notifications appear correctly

**As Child:**
- [ ] Login works
- [ ] Can view assigned chores
- [ ] Can mark chore as complete
- [ ] Points are awarded
- [ ] Cannot create/edit/delete chores
- [ ] Notifications appear correctly

**Cross-Device:**
- [ ] Works on desktop
- [ ] Works on tablet
- [ ] Works on mobile phone
- [ ] Responsive design looks good

## 📚 Documentation

### Getting Started
- **[README](./README.md)** - This file - project overview and quick start
- **[Quick Reference](./QUICK-REFERENCE.md)** - Daily operations and common commands
- **[Deployment Checklist](./DEPLOYMENT-CHECKLIST.md)** - Step-by-step deployment guide

### Implementation
- **[Development Plan](./CHORE-GANIZER-DEVELOPMENT-PLAN.md)** - Complete implementation guide with detailed milestones
- **[Docker Configuration](./DOCKER-CONFIGURATION.md)** - Docker setup, Dockerfiles, and docker-compose reference

### API Reference
- **[API Documentation](./API-DOCUMENTATION.md)** - Complete REST API reference with all endpoints

### Operations
- **[Post-Deployment Guide](./POST-DEPLOYMENT-GUIDE.md)** - User management, updates, rollbacks, and monitoring
- **[Backup & Restore Guide](./BACKUP-RESTORE-GUIDE.md)** - Backup procedures, automated backups, and disaster recovery

### Database
- **[Database Schema](./backend/prisma/schema.prisma)** - Prisma schema with comments (after implementation)

## 🤝 Contributing

This is a personal homelab project, but if you find it useful:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🎯 Roadmap

### Q2 2026
- [ ] Rewards system implementation
- [ ] Recurring chores (daily/weekly/monthly)
- [ ] Round-robin assignment rotation
- [ ] Mobile app (PWA)

### Q3 2026
- [ ] Advanced analytics dashboard
- [ ] Family calendar integration
- [ ] Chore templates
- [ ] Dark mode

### Future
- [ ] Multi-household support
- [ ] Email notifications
- [ ] API for third-party integrations
- [ ] Voice assistant integration (Alexa/Google Home)

## 💬 Support

Having issues? Check these resources:

1. **[Troubleshooting Guide](./CHORE-GANIZER-DEVELOPMENT-PLAN.md#troubleshooting)** in the development plan
2. Review `docker-compose logs` for error messages
3. Check [Prisma documentation](https://www.prisma.io/docs)
4. Visit [r/homelab](https://reddit.com/r/homelab) or [r/selfhosted](https://reddit.com/r/selfhosted)

## 🙏 Acknowledgments

Built with:
- [React](https://react.dev/)
- [Express](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Docker](https://www.docker.com/)

## 📧 Contact

Project Link: [https://github.com/yourusername/chore-ganizer](https://github.com/yourusername/chore-ganizer)

---

**Made with ❤️ for organized families and happy kids!**
