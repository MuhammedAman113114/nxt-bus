# NXT Bus - System Architecture

## 🏗️ Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Host                           │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Frontend Container                     │    │
│  │  ┌──────────────────────────────────────────┐     │    │
│  │  │         Nginx Web Server                  │     │    │
│  │  │  - Serves React SPA                       │     │    │
│  │  │  - Proxies API requests to backend        │     │    │
│  │  │  - Handles static assets                  │     │    │
│  │  │  - Port: 80                               │     │    │
│  │  └──────────────────────────────────────────┘     │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          │ HTTP Proxy                        │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Backend Container                      │    │
│  │  ┌──────────────────────────────────────────┐     │    │
│  │  │      Node.js + Express API                │     │    │
│  │  │  - REST API endpoints                     │     │    │
│  │  │  - Real-time GPS tracking                 │     │    │
│  │  │  - ETA calculations (OSRM)                │     │    │
│  │  │  - Authentication (JWT)                   │     │    │
│  │  │  - Port: 3000                             │     │    │
│  │  └──────────────────────────────────────────┘     │    │
│  └────────────────────────────────────────────────────┘    │
│              │                    │                          │
│              │                    │                          │
│              ▼                    ▼                          │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │   PostgreSQL     │  │      Redis       │               │
│  │   Container      │  │    Container     │               │
│  │                  │  │                  │               │
│  │  - PostGIS ext   │  │  - Caching       │               │
│  │  - Route data    │  │  - Sessions      │               │
│  │  - User data     │  │  - ETA cache     │               │
│  │  - Port: 5432    │  │  - Port: 6379    │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Request Flow

### Passenger Search Flow
```
User Browser
    │
    │ 1. Search request (From/To locations)
    ▼
Nginx (Frontend Container)
    │
    │ 2. Proxy to /api/*
    ▼
Express API (Backend Container)
    │
    ├─► 3a. Query routes from PostgreSQL
    │   └─► Returns matching routes
    │
    ├─► 3b. Get cached ETA from Redis
    │   └─► Returns ETA if cached
    │
    └─► 3c. Calculate ETA via OSRM
        └─► Cache result in Redis
        └─► Return to user
```

### Real-time GPS Tracking Flow
```
Driver App
    │
    │ 1. Send GPS coordinates
    ▼
Backend API
    │
    ├─► 2a. Store in PostgreSQL
    │   └─► Update bus location
    │
    ├─► 2b. Update Redis cache
    │   └─► Store latest position
    │
    └─► 2c. Calculate new ETAs
        └─► Update ETA cache
        └─► Notify passengers (future: WebSocket)
```

### Authentication Flow
```
User Login
    │
    │ 1. POST /api/auth/login
    ▼
Backend API
    │
    ├─► 2. Verify credentials (PostgreSQL)
    │
    ├─► 3. Generate JWT tokens
    │   ├─► Access token (15 min)
    │   └─► Refresh token (7 days)
    │
    └─► 4. Store session in Redis
        └─► Return tokens to user
```

## 📦 Container Details

### Frontend Container
- **Base Image**: nginx:alpine
- **Size**: ~50 MB
- **Purpose**: Serve React SPA and proxy API requests
- **Health Check**: HTTP GET /health
- **Restart Policy**: unless-stopped

**Key Files:**
- `/usr/share/nginx/html/*` - React build files
- `/etc/nginx/conf.d/default.conf` - Nginx configuration

### Backend Container
- **Base Image**: node:20-alpine
- **Size**: ~200 MB
- **Purpose**: REST API, business logic, real-time tracking
- **Health Check**: HTTP GET /health
- **Restart Policy**: unless-stopped

**Key Features:**
- TypeScript compiled to JavaScript
- Express.js framework
- JWT authentication
- OSRM integration for routing
- Redis caching
- PostgreSQL with PostGIS

### PostgreSQL Container
- **Base Image**: postgis/postgis:15-3.3-alpine
- **Size**: ~300 MB
- **Purpose**: Primary data store with geospatial support
- **Health Check**: pg_isready
- **Restart Policy**: unless-stopped

**Extensions:**
- PostGIS - Geospatial queries
- UUID - Unique identifiers

**Data Stored:**
- Users (passengers, drivers, admins)
- Routes and stops
- Buses and assignments
- GPS tracking history
- Trip records

### Redis Container
- **Base Image**: redis:7-alpine
- **Size**: ~30 MB
- **Purpose**: Caching and session management
- **Health Check**: redis-cli ping
- **Restart Policy**: unless-stopped

**Data Cached:**
- ETA calculations
- Route search results
- User sessions
- Real-time GPS positions

## 🌐 Network Architecture

```
┌─────────────────────────────────────────┐
│         nxtbus-network (bridge)         │
│                                         │
│  frontend:80 ◄──┐                      │
│                  │                      │
│  backend:3000 ◄──┼──► postgres:5432    │
│                  │                      │
│  redis:6379 ◄────┘                      │
│                                         │
└─────────────────────────────────────────┘
         │
         │ Port Mapping
         ▼
┌─────────────────────────────────────────┐
│            Host Machine                  │
│                                         │
│  localhost:80 ──► frontend:80           │
│  localhost:3000 ──► backend:3000        │
│  localhost:5432 ──► postgres:5432       │
│  localhost:6379 ──► redis:6379          │
│                                         │
└─────────────────────────────────────────┘
```

## 💾 Data Persistence

### Volumes
```
postgres_data/
├── Database files
├── PostGIS data
└── WAL logs

redis_data/
├── RDB snapshots
└── AOF logs

backend_logs/
└── Application logs
```

### Backup Strategy
- **PostgreSQL**: Daily pg_dump
- **Redis**: RDB snapshots every 5 minutes
- **Logs**: Rotated daily, kept for 7 days

## 🔐 Security Layers

### 1. Network Security
- Internal Docker network (bridge)
- Only necessary ports exposed to host
- No direct database access from outside

### 2. Application Security
- JWT authentication
- Password hashing (bcrypt)
- CORS configuration
- Rate limiting (future)
- Input validation

### 3. Container Security
- Non-root users in containers
- Read-only file systems where possible
- Security headers in Nginx
- Minimal base images (Alpine)

### 4. Data Security
- Encrypted passwords in database
- Redis authentication
- Environment variable secrets
- No secrets in code

## 📊 Performance Characteristics

### Response Times (Expected)
- Static assets: < 50ms
- API health check: < 10ms
- Route search: < 200ms
- ETA calculation: < 500ms (cached: < 50ms)
- GPS update: < 100ms

### Throughput
- Frontend: 1000+ req/sec
- Backend API: 500+ req/sec
- Database: 1000+ queries/sec
- Redis: 10,000+ ops/sec

### Resource Usage
```
Service     | CPU (idle) | CPU (load) | Memory
------------|------------|------------|--------
Frontend    | < 1%       | 5-10%      | 50 MB
Backend     | 2-5%       | 20-40%     | 200 MB
PostgreSQL  | 1-2%       | 10-20%     | 500 MB
Redis       | < 1%       | 5-10%      | 100 MB
------------|------------|------------|--------
Total       | ~5%        | ~50%       | ~850 MB
```

## 🔄 Scaling Strategy

### Horizontal Scaling
```
Load Balancer (Nginx)
    │
    ├─► Backend Instance 1
    ├─► Backend Instance 2
    └─► Backend Instance 3
         │
         ├─► PostgreSQL Primary
         │   └─► PostgreSQL Replica(s)
         │
         └─► Redis Cluster
```

### Vertical Scaling
- Increase container resources
- Optimize database queries
- Implement caching strategies
- Use CDN for static assets

## 🔍 Monitoring Points

### Health Checks
- Frontend: `http://localhost/health`
- Backend: `http://localhost:3000/health`
- Database: `pg_isready`
- Redis: `redis-cli ping`

### Metrics to Monitor
- Container CPU/Memory usage
- API response times
- Database connection pool
- Redis cache hit rate
- Error rates
- Request rates

### Logging
- Application logs: `/app/logs/`
- Nginx access logs
- PostgreSQL logs
- Redis logs

## 🚀 Deployment Workflow

```
1. Code Changes
   │
   ▼
2. Git Push
   │
   ▼
3. Build Docker Images
   │
   ▼
4. Run Tests (future)
   │
   ▼
5. Stop Old Containers
   │
   ▼
6. Start New Containers
   │
   ▼
7. Run Migrations
   │
   ▼
8. Health Checks
   │
   ▼
9. Live!
```

## 📈 Future Enhancements

### Planned Improvements
- [ ] WebSocket for real-time updates
- [ ] Redis Cluster for high availability
- [ ] PostgreSQL replication
- [ ] Kubernetes deployment
- [ ] CI/CD pipeline
- [ ] Monitoring dashboard (Grafana)
- [ ] Log aggregation (ELK stack)
- [ ] API rate limiting
- [ ] CDN integration
- [ ] Mobile app support

### Scalability Roadmap
1. **Phase 1**: Single server deployment (current)
2. **Phase 2**: Load balanced backend
3. **Phase 3**: Database replication
4. **Phase 4**: Microservices architecture
5. **Phase 5**: Multi-region deployment

---

**Architecture Version**: 1.0  
**Last Updated**: November 13, 2025  
**Status**: Production Ready
