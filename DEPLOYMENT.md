# NXT Bus - Deployment Guide

## 📋 Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)
- Minimum 2GB RAM, 2 CPU cores
- 20GB disk space

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/nxt-bus.git
cd nxt-bus
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

**Required Variables:**
```env
DB_PASSWORD=your_strong_database_password
REDIS_PASSWORD=your_redis_password
JWT_SECRET=your_jwt_secret_min_32_chars
REFRESH_TOKEN_SECRET=your_refresh_token_secret
CORS_ORIGIN=https://your-domain.com
```

### 3. Build and Start

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migrate

# Seed initial data (optional)
docker-compose -f docker-compose.prod.yml exec backend npm run seed
```

### 5. Verify Deployment

```bash
# Check health
curl http://localhost/health
curl http://localhost:3000/health

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_NAME` | PostgreSQL database name | nxtbus | No |
| `DB_USER` | PostgreSQL username | postgres | No |
| `DB_PASSWORD` | PostgreSQL password | - | **Yes** |
| `REDIS_PASSWORD` | Redis password | - | **Yes** |
| `JWT_SECRET` | JWT signing secret | - | **Yes** |
| `REFRESH_TOKEN_SECRET` | Refresh token secret | - | **Yes** |
| `CORS_ORIGIN` | Allowed CORS origins | * | **Yes** |
| `SENTRY_DSN` | Sentry error tracking DSN | - | No |
| `NODE_ENV` | Environment | production | No |

### SSL/TLS Configuration

#### Option 1: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Update nginx config to use certificates
# Add to frontend/nginx.conf:
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

#### Option 2: Custom Certificate

Place your certificates in:
- `/etc/ssl/certs/your-domain.crt`
- `/etc/ssl/private/your-domain.key`

## 📊 Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:3000/health

# Frontend health
curl http://localhost/health

# Database health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Redis health
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

### Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

### Metrics

Access metrics at:
- Backend: `http://localhost:3000/metrics`
- Health: `http://localhost:3000/health`

## 🔄 Updates

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose -f docker-compose.prod.yml build

# Restart services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

### Rollback

```bash
# Stop current version
docker-compose -f docker-compose.prod.yml down

# Checkout previous version
git checkout <previous-commit>

# Rebuild and start
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

## 💾 Backup & Recovery

### Database Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres nxtbus > backup_$(date +%Y%m%d).sql

# Automated daily backup
0 2 * * * cd /path/to/nxt-bus && docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres nxtbus > /backups/nxtbus_$(date +\%Y\%m\%d).sql
```

### Restore Database

```bash
# Stop backend
docker-compose -f docker-compose.prod.yml stop backend

# Restore
cat backup_20251113.sql | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres nxtbus

# Start backend
docker-compose -f docker-compose.prod.yml start backend
```

### Redis Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec redis redis-cli --rdb /data/dump.rdb SAVE

# Copy backup
docker cp nxtbus-redis:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb
```

## 🔒 Security

### Firewall Configuration

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if needed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

### Security Headers

Already configured in `frontend/nginx.conf`:
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy

### Database Security

```bash
# Change default passwords
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres
ALTER USER postgres WITH PASSWORD 'new_strong_password';
```

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check container status
docker ps -a

# Restart service
docker-compose -f docker-compose.prod.yml restart backend
```

### Database Connection Issues

```bash
# Check database is running
docker-compose -f docker-compose.prod.yml ps postgres

# Test connection
docker-compose -f docker-compose.prod.yml exec backend node -e "require('./dist/config/database').testConnection()"

# Check credentials
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "\l"
```

### High Memory Usage

```bash
# Check resource usage
docker stats

# Limit container memory
# Add to docker-compose.prod.yml:
deploy:
  resources:
    limits:
      memory: 512M
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a

# Remove old logs
docker-compose -f docker-compose.prod.yml exec backend find logs -name "*.log" -mtime +7 -delete
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale backend
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Add load balancer (nginx)
# Update frontend/nginx.conf:
upstream backend {
    server backend:3000;
    server backend:3000;
    server backend:3000;
}
```

### Database Replication

For high availability, set up PostgreSQL replication:
1. Configure primary database
2. Set up replica databases
3. Update connection strings

## 🔧 Maintenance

### Regular Tasks

**Daily:**
- Check logs for errors
- Monitor disk space
- Verify backups

**Weekly:**
- Review security updates
- Check performance metrics
- Clean old logs

**Monthly:**
- Update dependencies
- Review and optimize database
- Test backup restoration

### Maintenance Mode

```bash
# Enable maintenance
docker-compose -f docker-compose.prod.yml stop backend frontend

# Show maintenance page
# Create maintenance.html and serve with nginx

# Disable maintenance
docker-compose -f docker-compose.prod.yml start backend frontend
```

## 📞 Support

- Documentation: https://docs.nxtbus.com
- Issues: https://github.com/your-org/nxt-bus/issues
- Email: support@nxtbus.com

## 📝 Checklist

### Pre-Deployment
- [ ] Domain configured
- [ ] SSL certificate obtained
- [ ] Environment variables set
- [ ] Firewall configured
- [ ] Backup strategy planned

### Deployment
- [ ] Services started
- [ ] Database migrated
- [ ] Health checks passing
- [ ] Logs reviewed
- [ ] SSL working

### Post-Deployment
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Documentation updated
- [ ] Team notified
- [ ] Smoke tests passed

---

**Last Updated:** November 13, 2025
**Version:** 1.0
