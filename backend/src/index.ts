import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { testConnection, closePool } from './config/database';
import { connectRedis, disconnectRedis, SessionManager } from './config/redis';
import { WebSocketServer } from './websocket/socket';
import { DriverHandler } from './websocket/driver.handler';
import { PassengerHandler } from './websocket/passenger.handler';
import { BroadcastService } from './websocket/broadcast.service';
import authRoutes from './routes/auth.routes';
import stopsRoutes from './routes/stops.routes';
import routesRoutes from './routes/routes.routes';
import busesRoutes from './routes/buses.routes';
import subscriptionsRoutes from './routes/subscriptions.routes';
import ownersRoutes from './routes/owners.routes';
import tripsRoutes from './routes/trips.routes';
import ownerRoutes from './routes/owner.routes';
import gpsRoutes from './routes/gps.routes';
import driverAssignmentRoutes from './routes/driver-assignment.routes';
import etaRoutes from './routes/eta.routes';
import logger, { stream } from './utils/logger';
import { errorHandler, notFoundHandler, ErrorTracker } from './middleware/errorHandler';
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './utils/sentry';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Sentry (must be first)
initSentry(app);

// Sentry request handler (must be before other middleware)
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// Middleware
app.use(helmet()); // Security headers
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' })); // CORS
app.use(compression()); // Response compression
app.use(express.json()); // JSON body parser
app.use(morgan('combined', { stream })); // HTTP request logging

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stops', stopsRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/buses', busesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/owners', ownersRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/driver-assignment', driverAssignmentRoutes);
app.use('/api', etaRoutes);

// Health check endpoint
const startTime = Date.now();
app.get('/health', async (_req, res) => {
  try {
    const dbConnected = await testConnection();
    const redisConnected = await connectRedis().catch(() => false);
    
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const status = dbConnected && redisConnected ? 'ok' : dbConnected ? 'degraded' : 'error';
    
    res.status(status === 'error' ? 503 : 200).json({ 
      status,
      version: process.env.npm_package_version || '1.0.0',
      uptime: `${uptime}s`,
      timestamp: new Date().toISOString(),
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
        redis: redisConnected ? 'connected' : 'disconnected',
        websocket: 'active'
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Error tracking endpoint (admin only)
app.get('/api/errors', (_req, res) => {
  res.json({
    count: ErrorTracker.getErrorCount(),
    recent: ErrorTracker.getRecentErrors(20)
  });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Sentry error handler - must be before custom error handler
app.use(sentryErrorHandler());

// Global error handler - must be last
app.use(errorHandler);

// Initialize WebSocket server
const wsServer = new WebSocketServer(httpServer);
const io = wsServer.getIO();
export const broadcastService = new BroadcastService(io);

// Make io available to routes for real-time updates
app.set('io', io);

// Setup WebSocket handlers
io.on('connection', (socket) => {
  DriverHandler.setupDriverHandlers(socket);
  PassengerHandler.setupPassengerHandlers(socket);
});

// Start server
httpServer.listen(PORT, async () => {
  logger.info(`nxt-bus backend server running on port ${PORT}`);
  logger.info(`WebSocket server ready`);
  
  // Test database connection on startup
  const dbConnected = await testConnection();
  if (!dbConnected) {
    logger.warn('Server started but database connection failed');
  } else {
    logger.info('Database connection established');
  }

  // Connect to Redis
  const redisConnected = await connectRedis();
  if (!redisConnected) {
    logger.warn('Redis connection failed - session management will be limited');
  } else {
    logger.info('Redis connection established');
  }

  // Start periodic cleanup for in-memory sessions (every 15 minutes)
  SessionManager.startPeriodicCleanup(15);
  logger.info('Session cleanup scheduler started');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(async () => {
    io.close();
    await closePool();
    await disconnectRedis();
    logger.info('Server shut down gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  httpServer.close(async () => {
    io.close();
    await closePool();
    await disconnectRedis();
    logger.info('Server shut down gracefully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
