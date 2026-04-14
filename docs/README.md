# 📚 Chore-Ganizer Documentation

**Version:** 2.1.9  
**Last Updated:** March 2026

Welcome to the Chore-Ganizer documentation. This index helps you find the right guide for your needs.

---

## 🚀 Quick Links

| Need | Document |
|------|----------|
| Deploy for the first time | [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md) |
| Manage running application | [POST-DEPLOYMENT-GUIDE.md](./POST-DEPLOYMENT-GUIDE.md) |
| User guide (children) | [USER-GUIDE.md](./USER-GUIDE.md) |
| Admin guide (parents) | [ADMIN-GUIDE.md](./ADMIN-GUIDE.md) |
| Quick reference commands | [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) |

---

## 📖 User Guides

### End Users (Children)
- **[USER-GUIDE.md](./USER-GUIDE.md)** - How to use Chore-Ganizer as a child
  - Login and dashboard
  - Viewing and completing chores
  - Checking points and pocket money
  - Profile and notification settings

### Parents/Administrators
- **[ADMIN-GUIDE.md](./ADMIN-GUIDE.md)** - Administrative tasks
  - Managing family members
  - Creating chore templates
  - Managing categories
  - Pocket money configuration
  - Statistics dashboard

---

## 🛠️ Deployment & Operations

### Getting Started
| Document | Description |
|----------|-------------|
| [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md) | Step-by-step first-time deployment |
| [DOCKER-CONFIGURATION.md](./DOCKER-CONFIGURATION.md) | Docker and docker-compose details |
| [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) | Common commands and URLs |

### Ongoing Operations
| Document | Description |
|----------|-------------|
| [POST-DEPLOYMENT-GUIDE.md](./POST-DEPLOYMENT-GUIDE.md) | Daily operations, updates, troubleshooting |
| [BACKUP-RESTORE-GUIDE.md](./BACKUP-RESTORE-GUIDE.md) | Backup and restore procedures |
| [SECURITY-HARDENING.md](./SECURITY-HARDENING.md) | Security configuration |

---

## 🔧 Technical Documentation

| Document | Description |
|----------|-------------|
| [swagger.json](./swagger.json) | **OpenAPI 3.0 spec — authoritative API reference, auto-generated from `@swagger` JSDoc in `backend/src/routes/*.ts` via `npm run docs:generate`. Do not hand-edit.** |
| [API-DOCUMENTATION.md](./API-DOCUMENTATION.md) | Hand-written REST API guide with examples (may lag behind `swagger.json`) |
| [../SWAGGER_JSDOC_GUIDE.md](../SWAGGER_JSDOC_GUIDE.md) | How to add `@swagger` JSDoc blocks when adding/changing routes |
| [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) | Database schema documentation |
| [SECURITY.md](./SECURITY.md) | Security overview |

---

## 🏗️ Development

| Document | Description |
|----------|-------------|
| [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) | Getting started with development |
| [CHORE-GANIZER-DEVELOPMENT-PLAN.md](./CHORE-GANIZER-DEVELOPMENT-PLAN.md) | Comprehensive development guide |
| [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md) | Planned features and roadmap |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |

### Archived (Historical)
| Document | Description |
|----------|-------------|
| [archive/README.md](./archive/README.md) | Historical implementation logs |
| [PHASE-1-IMPLEMENTATION-LOG.md](./PHASE-1-IMPLEMENTATION-LOG.md) | Phase 1 log |
| [PHASE-2-IMPLEMENTATION-LOG.md](./PHASE-2-IMPLEMENTATION-LOG.md) | Phase 2 log |
| [PHASE-3-IMPLEMENTATION-LOG.md](./PHASE-3-IMPLEMENTATION-LOG.md) | Phase 3 log |
| [PHASE-4-IMPLEMENTATION-LOG.md](./PHASE-4-IMPLEMENTATION-LOG.md) | Phase 4 log |
| [PHASE-5-DEPLOYMENT-LOG.md](./PHASE-5-DEPLOYMENT-LOG.md) | Phase 5 log |

---

## 🔍 Finding Information

### Port Numbers
- Frontend: **3002**
- Backend API: **3010**
- Database: `chore-ganizer.db`

### Default Credentials
| Role | Email | Password |
|------|-------|----------|
| Parent | dad@home.local | password123 |
| Parent | mom@home.local | password123 |
| Child | alice@home.local | password123 |
| Child | bob@home.local | password123 |

---

## 📋 Document Inventory

Total: **30+ documentation files**

| Category | Count |
|----------|-------|
| User Guides | 2 |
| Deployment | 4 |
| Technical | 4 |
| Development | 6 |
| Archived | 6 |
| Other | 8+ |

---

*For the main project README, see [../README.md](../README.md)*
