# NXT Bus - Quick Reference Card

## 🚀 Deploy in 3 Steps

```powershell
# 1. Start Docker Desktop (wait for it to fully start)

# 2. Deploy
.\deploy.ps1

# 3. Access
# http://localhost
```

---

## 📋 Essential Commands

### Deployment
```powershell
.\deploy.ps1                    # Full deployment
.\check-status.ps1              # Check health
.\view-logs.ps1                 # View logs
```

### Docker Commands
```powershell
# Status
docker-compose -f docker-compose.prod.yml ps

# Start
docker-compose -f docker-compose.prod.yml up -d

# Stop
docker-compose -f docker-compose.prod.yml down

# Restart
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Logs
docker-compose -f docker-compose.prod.yml logs -f
docker-compose -f docker-compose.prod.yml logs -f backend

# Execute command
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

---

## 🔍 Monitoring

### Check Status
```powershell
.\check-status.ps1              # All services
docker ps                       # Running containers
docker stats                    # Resource usage
```

### View Logs
```powershell
.\view-logs.ps1                 # All logs
.\view-logs.ps1 backend         # Backend only
.\view-logs.ps1 -Follow         # Follow mode
.\view-logs.ps1 backend -Lines 200  # Last 200 lines
```

### Health Checks
```powershell
# Backend
curl http://localhost:3000/health

# Frontend
curl http://localhost/health

# Database
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

---

## 🌐 Access URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost | Main application |
| Backend | http://localhost:3000 | API endpoints |
| Health | http://localhost:3000/health | Health check |
| Database | localhost:5432 | PostgreSQL |
| Redis | localhost:6379 | Cache |

---

## 🐛 Troubleshooting

### Docker Not Running
```powershell
# Start Docker Desktop and wait
# Then run: .\deploy.ps1
```

### Port Already in Use
```powershell
# Check what's using port 80
netstat -ano | findstr :80

# Check what's using port 3000
netstat -ano | findstr :3000

# Kill process or change ports in docker-compose.prod.yml
```

### Service Won't Start
```powershell
# View logs
.\view-logs.ps1 [service]

# Restart service
docker-compose -f docker-compose.prod.yml restart [service]

# Full restart
docker-compose -f docker-compose.prod.yml down
.\deploy.ps1
```

### Clean Restart
```powershell
# Stop and remove everything
docker-compose -f docker-compose.prod.yml down -v

# Clean Docker
docker system prune -a

# Redeploy
.\deploy.ps1
```

---

## 💾 Database Operations

### Access Database
```powershell
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d nxtbus
```

### Backup Database
```powershell
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres nxtbus > backup.sql
```

### Restore Database
```powershell
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres nxtbus
```

### Run Migrations
```powershell
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

---

## 🔄 Update Application

```powershell
# 1. Pull latest code
git pull origin main

# 2. Redeploy
.\deploy.ps1

# 3. Verify
.\check-status.ps1
```

---

## 📊 Service Status

### Check All Services
```powershell
docker-compose -f docker-compose.prod.yml ps
```

Expected output:
```
NAME                STATUS              PORTS
nxtbus-backend      Up (healthy)        0.0.0.0:3000->3000/tcp
nxtbus-frontend     Up (healthy)        0.0.0.0:80->80/tcp
nxtbus-postgres     Up (healthy)        0.0.0.0:5432->5432/tcp
nxtbus-redis        Up (healthy)        0.0.0.0:6379->6379/tcp
```

---

## 🔐 Environment Variables

Located in: `.env.production`

### Key Variables
```env
DB_PASSWORD=<database-password>
REDIS_PASSWORD=<redis-password>
JWT_SECRET=<jwt-secret>
REFRESH_TOKEN_SECRET=<refresh-secret>
CORS_ORIGIN=http://localhost
```

### Update Variables
1. Edit `.env.production`
2. Run `.\deploy.ps1`

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `deploy.ps1` | Deployment script |
| `check-status.ps1` | Status checker |
| `view-logs.ps1` | Log viewer |
| `docker-compose.prod.yml` | Docker config |
| `.env.production` | Environment vars |
| `DEPLOYMENT.md` | Full guide |

---

## 🎯 Common Tasks

### Start Fresh
```powershell
docker-compose -f docker-compose.prod.yml down -v
.\deploy.ps1
```

### View Backend Logs
```powershell
.\view-logs.ps1 backend -Follow
```

### Restart Backend
```powershell
docker-compose -f docker-compose.prod.yml restart backend
```

### Check Resource Usage
```powershell
docker stats
```

### Access Backend Shell
```powershell
docker-compose -f docker-compose.prod.yml exec backend sh
```

### Access Database Shell
```powershell
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d nxtbus
```

---

## ⚡ Performance

### Expected Resource Usage
- **Memory**: ~850 MB total
- **CPU**: ~5% idle, ~50% under load
- **Disk**: ~2 GB for images + data

### Expected Response Times
- Static assets: < 50ms
- API calls: < 200ms
- ETA calculations: < 500ms (cached: < 50ms)

---

## 📞 Get Help

### Documentation
- **Quick Start**: READY_TO_DEPLOY.md
- **Step-by-Step**: DEPLOY_NOW.md
- **Full Guide**: DEPLOYMENT.md
- **Architecture**: ARCHITECTURE.md
- **Scripts**: DEPLOYMENT_SCRIPTS.md

### Diagnostics
```powershell
.\check-status.ps1              # Check all services
.\view-logs.ps1                 # View logs
docker-compose -f docker-compose.prod.yml ps  # Container status
docker stats                    # Resource usage
```

---

## ✅ Success Checklist

- [ ] Docker Desktop running
- [ ] All containers show "Up (healthy)"
- [ ] Frontend loads at http://localhost
- [ ] Backend health check returns OK
- [ ] Can search for routes
- [ ] No errors in logs

---

## 🚨 Emergency Commands

### Everything Broken?
```powershell
# Nuclear option - clean everything
docker-compose -f docker-compose.prod.yml down -v
docker system prune -a
.\deploy.ps1
```

### Service Crashed?
```powershell
# Check logs first
.\view-logs.ps1 [service]

# Then restart
docker-compose -f docker-compose.prod.yml restart [service]
```

### Out of Disk Space?
```powershell
# Clean Docker
docker system prune -a

# Remove old images
docker image prune -a
```

---

## 💡 Pro Tips

1. **Always check logs first**: `.\view-logs.ps1`
2. **Use -Follow for real-time logs**: `.\view-logs.ps1 -Follow`
3. **Check status regularly**: `.\check-status.ps1`
4. **Keep Docker Desktop running**
5. **Backup before major changes**

---

## 🎓 Learning Resources

1. **First Time?** → READY_TO_DEPLOY.md
2. **Need Steps?** → DEPLOY_NOW.md
3. **Production?** → DEPLOYMENT.md
4. **Understanding System?** → ARCHITECTURE.md
5. **Script Help?** → DEPLOYMENT_SCRIPTS.md

---

**Print this page and keep it handy! 📄**

---

**Version**: 1.0  
**Last Updated**: November 13, 2025
