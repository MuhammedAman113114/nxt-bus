# 🚌 NXT Bus - Real-Time Bus Tracking System

[![Status](https://img.shields.io/badge/status-production--ready-green)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

> A comprehensive real-time bus tracking system with GPS tracking, live ETAs, QR code integration, and PWA support.

## ✨ Features

- 🗺️ **Real-Time Tracking** - Live bus locations with WebSocket updates
- ⏱️ **Accurate ETAs** - OSRM-powered routing with fallback calculations
- 📱 **QR Code Integration** - Scan codes at bus stops for instant info
- 🔔 **Push Notifications** - Arrival reminders and delay alerts
- 📴 **Offline Support** - PWA with service worker caching
- 👥 **Multi-Role System** - Passengers, drivers, and administrators
- 🌐 **Low-Bandwidth Optimized** - Works on slow connections
- 🔒 **Secure** - JWT authentication, RBAC, HTTPS

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ with PostGIS
- Redis 7+
- Docker & Docker Compose (for production)

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/nxt-bus.git
cd nxt-bus

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# Start database
docker-compose up -d postgres redis

# Run migrations
cd backend && npm run migrate

# Start development servers
cd backend && npm run dev
cd frontend && npm run dev
```

Access the app at `http://localhost:5173`

### Production Deployment

```bash
# Configure production environment
cp .env.production.example .env.production
nano .env.production

# Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# Initialize database
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 📱 User Roles

### Passengers
- Search and track buses
- Scan QR codes at stops
- View real-time ETAs
- Subscribe to routes
- Receive notifications

### Drivers
- Share GPS location
- View assigned routes
- Track route progress
- Start/stop tracking

### Administrators
- Manage stops and routes
- Generate QR codes
- Assign drivers to buses
- Monitor system health
- View live map

## 🏗️ Architecture

```
Frontend (React + TypeScript)
    ↓
Backend API (Node.js + Express)
    ↓
PostgreSQL + PostGIS + Redis
```

**Key Technologies:**
- React 18, TypeScript, Vite
- Node.js, Express, Socket.IO
- PostgreSQL with PostGIS
- Redis for caching
- OSRM for routing
- Docker for deployment

## 📚 Documentation

- [📖 Deployment Guide](DEPLOYMENT.md)
- [🎯 Project Summary](PROJECT_SUMMARY.md)
- [📱 QR Code Usage](QR_CODE_USAGE_GUIDE.md)
- [⏱️ ETA System](backend/ETA_README.md)
- [🔧 Fixes Applied](FIXES_APPLIED.md)

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/nxtbus
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Bus Tracking
- `GET /api/stops` - List bus stops
- `GET /api/routes` - List routes
- `POST /api/scan` - Get ETA for stop
- `POST /api/update-location` - Update bus location

### Admin
- `POST /api/stops` - Create stop
- `POST /api/routes` - Create route
- `GET /api/admin/qr-generator` - Generate QR codes

See full API documentation in [API.md](API.md)

## 🔐 Security

- JWT authentication with refresh tokens
- Role-based access control
- Password hashing (bcrypt)
- HTTPS/SSL encryption
- Security headers
- Rate limiting
- Input validation

## 📈 Performance

- **ETA Calculation:** <500ms (OSRM), <1ms (fallback)
- **WebSocket Latency:** <100ms
- **Page Load:** <2s (3G connection)
- **Offline Support:** Full functionality with cached data

## 🐛 Troubleshooting

### Common Issues

**"No active buses found"**
- Ensure driver has started GPS tracking
- Check bus location was updated within 2 minutes
- Verify route ID is correct

**Camera permission denied**
- Enable camera in browser settings
- Use manual QR code entry as fallback

**Database connection failed**
- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Ensure PostGIS extension is enabled

See [DEPLOYMENT.md](DEPLOYMENT.md) for more troubleshooting.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## 👥 Team

- **Development:** Full-stack team
- **Design:** UI/UX designers
- **DevOps:** Infrastructure team

## 📞 Support

- **Email:** support@nxtbus.com
- **Issues:** [GitHub Issues](https://github.com/your-org/nxt-bus/issues)
- **Docs:** [Documentation](https://docs.nxtbus.com)

## 🙏 Acknowledgments

- OSRM for routing engine
- OpenStreetMap for map data
- All open-source contributors

---

**Made with ❤️ for better public transportation**

**Status:** ✅ Production Ready | **Version:** 1.0.0 | **Last Updated:** November 13, 2025
