# NXT Bus - Deployment Documentation Index

Welcome to the NXT Bus deployment documentation! This guide will help you deploy and manage the NXT Bus application.

## 🚀 Quick Start

**New to deployment?** Start here:

1. **[READY_TO_DEPLOY.md](READY_TO_DEPLOY.md)** - Overview and quick deployment checklist
2. **[DEPLOY_NOW.md](DEPLOY_NOW.md)** - Step-by-step deployment guide
3. Run `.\deploy.ps1` - Automated deployment script

**Estimated time**: 10-15 minutes for first deployment

## 📚 Documentation Structure

### Essential Guides

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[READY_TO_DEPLOY.md](READY_TO_DEPLOY.md)** | Deployment overview and checklist | Before starting deployment |
| **[DEPLOY_NOW.md](DEPLOY_NOW.md)** | Quick deployment steps | During deployment |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Complete production guide | For production deployment |
| **[DEPLOYMENT_SCRIPTS.md](DEPLOYMENT_SCRIPTS.md)** | Scripts reference | When using deployment scripts |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System architecture | Understanding the system |

### Reference Documents

| Document | Purpose |
|----------|---------|
| **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** | Project overview and features |
| **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** | Development setup guide |
| **docker-compose.prod.yml** | Production Docker configuration |
| **.env.production.example** | Environment variables template |

## 🛠️ Deployment Scripts

### Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| **deploy.ps1** | Full automated deployment | `.\deploy.ps1` |
| **check-status.ps1** | Health check all services | `.\check-status.ps1` |
| **view-logs.ps1** | View service logs | `.\view-logs.ps1 [service]` |

### Script Examples

```powershell
# Deploy application
.\deploy.ps1

# Check if everything is running
.\check-status.ps1

# View backend logs
.\view-logs.ps1 backend -Follow

# View all logs (last 200 lines)
.\view-logs.ps1 -Lines 200
```

## 🎯 Deployment Paths

### Path 1: Local Development/Testing
```
1. Read READY_TO_DEPLOY.md
2. Start Docker Desktop
3. Run .\deploy.ps1
4. Access http://localhost
```

### Path 2: Production Server
```
1. Read DEPLOYMENT.md
2. Configure .env.production with production values
3. Set up SSL certificates
4. Configure firewall
5. Run .\deploy.ps1
6. Set up monitoring and backups
```

### Path 3: Manual Deployment
```
1. Read DEPLOY_NOW.md
2. Follow manual deployment steps
3. Run commands individually
4. Verify each step
```

## 📋 Pre-Deployment Checklist

### Required
- [ ] Docker Desktop installed and running
- [ ] `.env.production` file configured
- [ ] Minimum 2GB RAM available
- [ ] Ports 80, 3000, 5432, 6379 available

### Recommended
- [ ] Review ARCHITECTURE.md
- [ ] Understand the system components
- [ ] Have backup strategy planned
- [ ] Know how to view logs

## 🔍 Common Tasks

### Deployment
```powershell
# First time deployment
.\deploy.ps1

# Update deployment
git pull
.\deploy.ps1

# Clean deployment
docker-compose -f docker-compose.prod.yml down -v
.\deploy.ps1
```

### Monitoring
```powershell
# Check status
.\check-status.ps1

# View logs
.\view-logs.ps1 -Follow

# Check resources
docker stats
```

### Maintenance
```powershell
# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres nxtbus > backup.sql
```

## 🏗️ System Architecture

```
User Browser
    │
    ▼
Frontend (Nginx) :80
    │
    ▼
Backend (Node.js) :3000
    │
    ├─► PostgreSQL :5432
    └─► Redis :6379
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture.

## 🔐 Security Considerations

### Development/Testing
- Basic passwords in `.env.production`
- HTTP only (no SSL)
- CORS set to localhost
- Suitable for local testing

### Production
- **Must update** `.env.production` with:
  - Strong database passwords
  - Secure JWT secrets
  - Production domain
  - SSL certificates
- See [DEPLOYMENT.md](DEPLOYMENT.md) for security guide

## 📊 What Gets Deployed

### Services
1. **Frontend** - React SPA served by Nginx
2. **Backend** - Node.js/Express API
3. **PostgreSQL** - Database with PostGIS
4. **Redis** - Caching and sessions

### Features
- Passenger route search
- Real-time GPS tracking
- ETA calculations
- Driver dashboard
- Admin management
- QR code generation

## 🐛 Troubleshooting

### Quick Fixes

**Docker not running?**
```powershell
# Start Docker Desktop and wait for it to initialize
```

**Port already in use?**
```powershell
# Check what's using the port
netstat -ano | findstr :80
netstat -ano | findstr :3000
```

**Service not starting?**
```powershell
# View logs
.\view-logs.ps1 [service]

# Restart service
docker-compose -f docker-compose.prod.yml restart [service]
```

**Need to start fresh?**
```powershell
# Clean everything
docker-compose -f docker-compose.prod.yml down -v
docker system prune -a

# Redeploy
.\deploy.ps1
```

### Detailed Troubleshooting
See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive troubleshooting guide.

## 📈 Performance

### Expected Metrics
- Build time (first): 5-10 minutes
- Build time (cached): 1-2 minutes
- Startup time: 30-60 seconds
- Memory usage: ~850 MB total
- CPU usage (idle): ~5%

### Optimization
- Images use multi-stage builds
- Alpine Linux base images
- Production dependencies only
- Nginx caching enabled
- Redis caching for ETAs

## 🔄 Update Process

```powershell
# 1. Pull latest code
git pull origin main

# 2. Redeploy
.\deploy.ps1

# 3. Verify
.\check-status.ps1
```

## 📞 Getting Help

### Documentation
1. Check relevant guide from index above
2. Review [ARCHITECTURE.md](ARCHITECTURE.md) for system understanding
3. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed procedures

### Diagnostics
```powershell
# Check status
.\check-status.ps1

# View logs
.\view-logs.ps1

# Check containers
docker-compose -f docker-compose.prod.yml ps

# Check resources
docker stats
```

### Common Issues
- **Docker not running**: Start Docker Desktop
- **Port conflicts**: Check `netstat -ano | findstr :PORT`
- **Build failures**: Run `docker system prune -a` and retry
- **Service crashes**: Check logs with `.\view-logs.ps1 [service]`

## 🎓 Learning Path

### Beginner
1. Read [READY_TO_DEPLOY.md](READY_TO_DEPLOY.md)
2. Follow [DEPLOY_NOW.md](DEPLOY_NOW.md)
3. Use `.\deploy.ps1` script
4. Learn `.\check-status.ps1` and `.\view-logs.ps1`

### Intermediate
1. Understand [ARCHITECTURE.md](ARCHITECTURE.md)
2. Learn manual Docker commands
3. Explore [DEPLOYMENT_SCRIPTS.md](DEPLOYMENT_SCRIPTS.md)
4. Practice troubleshooting

### Advanced
1. Study [DEPLOYMENT.md](DEPLOYMENT.md) production guide
2. Implement monitoring
3. Set up CI/CD
4. Configure scaling

## ✅ Success Criteria

Your deployment is successful when:
- [ ] All containers show "Up" status
- [ ] Frontend accessible at http://localhost
- [ ] Backend health check returns OK
- [ ] Can search for routes
- [ ] Can view real-time tracking
- [ ] No errors in logs

## 🚀 Ready to Deploy?

1. **Start Docker Desktop**
2. **Open PowerShell in project directory**
3. **Run deployment script:**
   ```powershell
   .\deploy.ps1
   ```
4. **Verify deployment:**
   ```powershell
   .\check-status.ps1
   ```
5. **Access application:**
   - Frontend: http://localhost
   - Backend: http://localhost:3000

## 📝 Quick Reference

### Essential Commands
```powershell
# Deploy
.\deploy.ps1

# Status
.\check-status.ps1

# Logs
.\view-logs.ps1 [service] [-Follow]

# Restart
docker-compose -f docker-compose.prod.yml restart

# Stop
docker-compose -f docker-compose.prod.yml down

# Start
docker-compose -f docker-compose.prod.yml up -d
```

### Essential URLs
- Frontend: http://localhost
- Backend: http://localhost:3000
- Health: http://localhost:3000/health
- API Docs: http://localhost:3000/api-docs (if configured)

### Essential Files
- `docker-compose.prod.yml` - Service configuration
- `.env.production` - Environment variables
- `deploy.ps1` - Deployment script
- `DEPLOYMENT.md` - Complete guide

---

## 🎉 You're Ready!

Everything is documented and ready for deployment. Choose your path:

- **Quick Start**: [READY_TO_DEPLOY.md](READY_TO_DEPLOY.md)
- **Step-by-Step**: [DEPLOY_NOW.md](DEPLOY_NOW.md)
- **Production**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)

**Happy Deploying! 🚀**

---

**Documentation Version**: 1.0  
**Last Updated**: November 13, 2025  
**Status**: Complete and Ready
