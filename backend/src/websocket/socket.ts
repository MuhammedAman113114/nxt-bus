import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../services/auth.service';
import logger from '../utils/logger';

export class WebSocketServer {
  private io: Server;

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST'],
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  // Setup authentication middleware
  private setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const payload = AuthService.verifyAccessToken(token);

        // Attach user info to socket
        socket.data.user = {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
        };

        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  // Setup event handlers
  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id} (${socket.data.user.email}, role: ${socket.data.user.role})`);

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  // Get Socket.IO instance
  getIO(): Server {
    return this.io;
  }

  // Broadcast to a specific room
  broadcastToRoom(room: string, event: string, data: any) {
    this.io.to(room).emit(event, data);
  }

  // Broadcast to all clients
  broadcastToAll(event: string, data: any) {
    this.io.emit(event, data);
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.io.sockets.sockets.size;
  }
}
