# Deployment Scripts Guide

This directory contains PowerShell scripts to simplify deployment and management of the NXT Bus application.

## Available Scripts

### 1. `deploy.ps1` - Full Deployment
Automated deployment script that handles the entire deployment process.

**Usage:**
```powershell
.\deploy.ps1
```

**What it does:**
- ✓ Checks if Docker is running
- ✓ Loads environment variables from `.env.production`
- ✓ Stops existing containers
- ✓ Builds Docker images
- ✓ Starts all services
- ✓ Runs database migrations
- ✓ Performs health checks
- ✓ Displays access information

**Requirements:**
- Docker Desktop must be running
- `.env.production` file must exist

---

### 2. `check-status.ps1` - Health Check
Quick status check for all services.

**Usage:**
```powershell
.\check-status.ps1
```

**What it shows:**
- Docker status
- Container status (running/stopped)
- Backend health check
- Frontend health check
- Database connectivity
- Redis connectivity
- Resource usage (CPU, Memory)
- Access URLs

---

### 3. `view-logs.ps1` - Log Viewer
Easy access to service logs with filtering options.

**Usage:**
```powershell
# View all logs (last 100 lines)
.\view-logs.ps1

# View specific service logs
.\view-logs.ps1 backend
.\view-logs.ps1 frontend
.\view-logs.ps1 postgres
.\view-logs.ps1 redis

# Follow logs in real-time
.\view-logs.ps1 -Follow
.\view-logs.ps1 backend -Follow

# Show more lines
.\view-logs.ps1 -Lines 500
.\view-logs.ps1 backend -Lines 200 -Follow
```

**Parameters:**
- `Service`: Which service to view (all, backend, frontend, postgres, redis)
- `Lines`: Number of log lines to show (default: 100)
- `Follow`: Follow logs in real-time (like `tail -f`)

---

## Quick Start

### First Time Deployment

1. **Start Docker Desktop**
   ```powershell
   # Open Docker Desktop and wait for it to start
   ```

2. **Configure Environment**
   ```powershell
   # The .env.production file is already configured
   # Review and update if needed
   notepad .env.production
   ```

3. **Deploy**
   ```powershell
   .\deploy.ps1
   ```

4. **Verify**
   ```powershell
   .\check-status.ps1
   ```

### Daily Operations

**Check if everything is running:**
```powershell
.\check-status.ps1
```

**View recent logs:**
```powershell
.\view-logs.ps1 backend -Lines 50
```

**Follow logs in real-time:**
```powershell
.\view-logs.ps1 -Follow
```

**Restart services:**
```powershell
docker-compose -f docker-compose.prod.yml restart
```

**Stop services:**
```powershell
docker-compose -f docker-compose.prod.yml down
```

**Start services:**
```powershell
docker-compose -f docker-compose.prod.yml up -d
```

---

## Common Scenarios

### Scenario 1: Fresh Deployment
```powershell
# 1. Start Docker Desktop
# 2. Run deployment
.\deploy.ps1

# 3. Check status
.\check-status.ps1

# 4. Access application
# Frontend: http://localhost
# Backend: http://localhost:3000
```

### Scenario 2: Update Application
```powershell
# 1. Pull latest code
git pull

# 2. Redeploy
.\deploy.ps1

# 3. Verify
.\check-status.ps1
```

### Scenario 3: Troubleshooting
```powershell
# 1. Check status
.\check-status.ps1

# 2. View logs
.\view-logs.ps1 backend -Lines 200

# 3. Check specific service
docker-compose -f docker-compose.prod.yml logs backend

# 4. Restart if needed
docker-compose -f docker-compose.prod.yml restart backend
```

### Scenario 4: Database Issues
```powershell
# Check database status
docker-compose -f docker-compose.prod.yml ps postgres

# View database logs
.\view-logs.ps1 postgres -Lines 100

# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d nxtbus

# Restart database
docker-compose -f docker-compose.prod.yml restart postgres
```

### Scenario 5: Clean Restart
```powershell
# Stop everything
docker-compose -f docker-compose.prod.yml down

# Remove volumes (WARNING: This deletes data!)
docker-compose -f docker-compose.prod.yml down -v

# Redeploy
.\deploy.ps1
```

---

## Troubleshooting

### Script Execution Policy Error
```
.\deploy.ps1 : File cannot be loaded because running scripts is disabled
```

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Docker Not Running
```
error during connect: ... The system cannot find the file specified
```

**Solution:**
1. Open Docker Desktop
2. Wait for "Docker Desktop is running" message
3. Run script again

### Port Already in Use
```
port is already allocated
```

**Solution:**
```powershell
# Find what's using the port
netstat -ano | findstr :80
netstat -ano | findstr :3000

# Stop the process or change ports in docker-compose.prod.yml
```

### Environment Variables Not Set
```
The "DB_PASSWORD" variable is not set
```

**Solution:**
Use `deploy.ps1` script which automatically loads variables, or manually set them:
```powershell
$env:DB_PASSWORD="NxtBus123Production"
$env:REDIS_PASSWORD="NxtBusRedis123"
# etc...
```

### Build Fails
```powershell
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose -f docker-compose.prod.yml build --no-cache

# Redeploy
.\deploy.ps1
```

---

## Manual Commands Reference

If you prefer not to use scripts:

```powershell
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps

# Restart service
docker-compose -f docker-compose.prod.yml restart backend

# Execute command in container
docker-compose -f docker-compose.prod.yml exec backend npm run migrate

# View resource usage
docker stats

# Clean up
docker system prune -a
```

---

## Production Deployment

For production deployment on a server:

1. **Update Configuration**
   - Set strong passwords in `.env.production`
   - Configure domain and CORS
   - Set up SSL certificates

2. **Security**
   - Use firewall rules
   - Enable HTTPS
   - Secure database access
   - Use secrets management

3. **Monitoring**
   - Set up log aggregation
   - Configure alerts
   - Monitor resource usage
   - Set up backups

See `DEPLOYMENT.md` for complete production deployment guide.

---

## Support

- **Documentation**: See `DEPLOYMENT.md` for detailed deployment guide
- **Quick Start**: See `DEPLOY_NOW.md` for quick deployment steps
- **Issues**: Check logs with `.\view-logs.ps1`
- **Status**: Run `.\check-status.ps1` to verify all services

---

**Last Updated:** November 13, 2025
