import { Socket } from 'socket.io';
import { LocationService } from '../services/location.service';
import { pool } from '../config/database';
import logger from '../utils/logger';

interface DriverLocationUpdate {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

export class DriverHandler {
  static setupDriverHandlers(socket: Socket) {
    const userId = socket.data.user.userId;
    const userRole = socket.data.user.role;

    // Only drivers can use these handlers
    if (userRole !== 'driver' && userRole !== 'admin') {
      socket.emit('error', { message: 'Only drivers can send location updates' });
      return;
    }

    // Driver connects and starts tracking
    socket.on('driver:connect', async (data: { busId: string }) => {
      try {
        const { busId } = data;

        // Verify driver is assigned to this bus
        const assignment = await pool.query(
          `SELECT id, route_id
           FROM bus_assignments
           WHERE bus_id = $1 AND driver_id = $2 AND status = 'active'
           LIMIT 1`,
          [busId, userId]
        );

        if (assignment.rows.length === 0) {
          socket.emit('driver:error', {
            message: 'You are not assigned to this bus or assignment is not active',
          });
          return;
        }

        const routeId = assignment.rows[0].route_id;

        // Store driver session info
        socket.data.busId = busId;
        socket.data.routeId = routeId;
        socket.data.tracking = true;

        // Join route room for broadcasting
        socket.join(`route:${routeId}`);

        logger.info(`Driver ${userId} started tracking bus ${busId} on route ${routeId}`);

        socket.emit('driver:connected', {
          busId,
          routeId,
          message: 'Tracking started successfully',
        });

        // Broadcast to passengers that bus is now active
        socket.to(`route:${routeId}`).emit('bus:online', {
          busId,
          routeId,
        });
      } catch (error) {
        logger.error('Error in driver:connect:', error);
        socket.emit('driver:error', { message: 'Failed to start tracking' });
      }
    });

    // Driver sends location update
    socket.on('driver:location', async (data: DriverLocationUpdate) => {
      try {
        if (!socket.data.tracking || !socket.data.busId) {
          socket.emit('driver:error', { message: 'Tracking not started' });
          return;
        }

        const { latitude, longitude, heading, speed } = data;

        // Validate coordinates
        const validation = LocationService.validateCoordinates({ latitude, longitude });
        if (!validation.valid) {
          socket.emit('driver:error', { message: validation.error });
          return;
        }

        // Process and store location update
        await LocationService.processLocationUpdate({
          busId: socket.data.busId,
          location: { latitude, longitude },
          heading,
          speed,
          timestamp: new Date(),
        });

        // Broadcast location to passengers subscribed to this route
        socket.to(`route:${socket.data.routeId}`).emit('bus:location', {
          busId: socket.data.busId,
          location: { latitude, longitude },
          heading,
          speed,
          timestamp: new Date().toISOString(),
        });

        // Acknowledge to driver
        socket.emit('driver:location:ack', {
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        logger.error('Error in driver:location:', error);
        socket.emit('driver:error', {
          message: error.message || 'Failed to process location update',
        });
      }
    });

    // Driver disconnects
    socket.on('driver:disconnect', async () => {
      try {
        if (socket.data.busId && socket.data.routeId) {
          logger.info(`Driver ${userId} stopped tracking bus ${socket.data.busId}`);

          // Broadcast to passengers that bus went offline
          socket.to(`route:${socket.data.routeId}`).emit('bus:offline', {
            busId: socket.data.busId,
            routeId: socket.data.routeId,
          });

          // Cleanup optimization data for this bus
          this.broadcastService.cleanupBusData(socket.data.busId);

          // Leave route room
          socket.leave(`route:${socket.data.routeId}`);

          // Clear tracking data
          socket.data.tracking = false;
          socket.data.busId = null;
          socket.data.routeId = null;
        }

        socket.emit('driver:disconnected', {
          message: 'Tracking stopped successfully',
        });
      } catch (error) {
        logger.error('Error in driver:disconnect:', error);
      }
    });

    // Handle socket disconnect
    socket.on('disconnect', async () => {
      if (socket.data.busId && socket.data.routeId) {
        console.log(`Driver ${userId} disconnected unexpectedly`);

        // Broadcast to passengers
        socket.to(`route:${socket.data.routeId}`).emit('bus:offline', {
          busId: socket.data.busId,
          routeId: socket.data.routeId,
        });
      }
    });
  }
}
