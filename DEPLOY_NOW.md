# Quick Deployment Guide

## Prerequisites

1. **Start Docker Desktop**
   - Open Docker Desktop application
   - Wait until it shows "Docker Desktop is running"
   - You should see the Docker icon in your system tray

## Deployment Steps

### Option 1: Automated Deployment (Recommended)

Run the deployment script:

```powershell
.\deploy.ps1
```

This script will:
- Check Docker status
- Load environment variables
- Build Docker images
- Start all services
- Run database migrations
- Perform health checks

### Option 2: Manual Deployment

If you prefer manual control:

#### Step 1: Start Docker Desktop
Make sure Docker Desktop is running.

#### Step 2: Build Images
```powershell
docker-compose -f docker-compose.prod.yml build
```

#### Step 3: Start Services
```powershell
docker-compose -f docker-compose.prod.yml up -d
```

#### Step 4: Run Migrations
```powershell
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

#### Step 5: Check Status
```powershell
docker-compose -f docker-compose.prod.yml ps
```

## Verify Deployment

1. **Check Services**
   ```powershell
   docker-compose -f docker-compose.prod.yml ps
   ```
   All services should show "Up" status.

2. **Test Backend**
   Open browser: http://localhost:3000/health
   Should return: `{"status":"ok"}`

3. **Test Frontend**
   Open browser: http://localhost
   Should load the NXT Bus application.

## Access Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **Database**: localhost:5432 (PostgreSQL)
- **Redis**: localhost:6379

## Default Credentials

The system uses the credentials from `.env.production`. You'll need to create admin users through the API or seed script.

## View Logs

```powershell
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

## Stop Services

```powershell
docker-compose -f docker-compose.prod.yml down
```

## Restart Services

```powershell
docker-compose -f docker-compose.prod.yml restart
```

## Troubleshooting

### Docker Not Running
**Error**: `error during connect: ... The system cannot find the file specified`

**Solution**: Start Docker Desktop and wait for it to fully initialize.

### Port Already in Use
**Error**: `port is already allocated`

**Solution**: 
```powershell
# Check what's using the port
netstat -ano | findstr :80
netstat -ano | findstr :3000

# Stop the conflicting service or change ports in docker-compose.prod.yml
```

### Environment Variables Not Loading
**Error**: `variable is not set. Defaulting to a blank string`

**Solution**: Use the `deploy.ps1` script which loads variables automatically, or set them manually:
```powershell
$env:DB_PASSWORD="NxtBus123Production"
$env:REDIS_PASSWORD="NxtBusRedis123"
# ... etc
```

### Database Connection Failed
**Solution**: 
```powershell
# Check if postgres is running
docker-compose -f docker-compose.prod.yml ps postgres

# Check logs
docker-compose -f docker-compose.prod.yml logs postgres

# Restart postgres
docker-compose -f docker-compose.prod.yml restart postgres
```

### Build Fails
**Solution**:
```powershell
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose -f docker-compose.prod.yml build --no-cache
```

## Next Steps

1. **Seed Initial Data** (Optional)
   ```powershell
   docker-compose -f docker-compose.prod.yml exec backend npm run seed
   ```

2. **Create Admin User**
   Use the API endpoint or create through database.

3. **Configure Domain** (For production)
   - Update `CORS_ORIGIN` in `.env.production`
   - Configure SSL certificates
   - Update nginx configuration for HTTPS

4. **Set Up Monitoring**
   - Configure Sentry (optional)
   - Set up log aggregation
   - Configure alerts

## Production Deployment

For actual production deployment on a server:

1. Update `.env.production` with production values
2. Configure domain and SSL certificates
3. Update `CORS_ORIGIN` to your domain
4. Use strong passwords for DB and Redis
5. Generate secure JWT secrets
6. Configure firewall rules
7. Set up automated backups

See `DEPLOYMENT.md` for complete production deployment guide.

---

**Need Help?**
- Check logs: `docker-compose -f docker-compose.prod.yml logs -f`
- Check service status: `docker-compose -f docker-compose.prod.yml ps`
- Restart everything: `docker-compose -f docker-compose.prod.yml restart`
