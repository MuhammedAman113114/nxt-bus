import { Socket } from 'socket.io';
import { ETAService } from '../services/eta.service';
import { LocationService } from '../services/location.service';

interface SubscribeData {
  routeId?: string;
  stopId?: string;
}

export class PassengerHandler {
  static setupPassengerHandlers(socket: Socket) {
    const userId = socket.data.user.userId;

    // Passenger subscribes to route updates
    socket.on('passenger:subscribe', async (data: SubscribeData) => {
      try {
        const { routeId, stopId } = data;

        if (routeId) {
          // Subscribe to route updates
          socket.join(`route:${routeId}`);
          console.log(`Passenger ${userId} subscribed to route ${routeId}`);

          // Send current active buses on this route
          const buses = await LocationService.getActiveBusLocations(routeId);

          socket.emit('route:buses', {
            routeId,
            buses,
          });

          socket.emit('passenger:subscribed', {
            routeId,
            message: 'Subscribed to route updates',
          });
        }

        if (stopId) {
          // Subscribe to stop updates
          socket.join(`stop:${stopId}`);
          console.log(`Passenger ${userId} subscribed to stop ${stopId}`);

          // Send current ETAs for this stop
          const etas = await ETAService.getETAsForStop(stopId);

          socket.emit('stop:etas', {
            stopId,
            etas,
          });

          socket.emit('passenger:subscribed', {
            stopId,
            message: 'Subscribed to stop updates',
          });
        }
      } catch (error) {
        console.error('Error in passenger:subscribe:', error);
        socket.emit('passenger:error', { message: 'Failed to subscribe' });
      }
    });

    // Passenger unsubscribes from route/stop
    socket.on('passenger:unsubscribe', (data: SubscribeData) => {
      try {
        const { routeId, stopId } = data;

        if (routeId) {
          socket.leave(`route:${routeId}`);
          console.log(`Passenger ${userId} unsubscribed from route ${routeId}`);

          socket.emit('passenger:unsubscribed', {
            routeId,
            message: 'Unsubscribed from route updates',
          });
        }

        if (stopId) {
          socket.leave(`stop:${stopId}`);
          console.log(`Passenger ${userId} unsubscribed from stop ${stopId}`);

          socket.emit('passenger:unsubscribed', {
            stopId,
            message: 'Unsubscribed from stop updates',
          });
        }
      } catch (error) {
        console.error('Error in passenger:unsubscribe:', error);
        socket.emit('passenger:error', { message: 'Failed to unsubscribe' });
      }
    });

    // Passenger requests current ETAs for a stop
    socket.on('passenger:request:etas', async (data: { stopId: string }) => {
      try {
        const { stopId } = data;
        const etas = await ETAService.getETAsForStop(stopId);

        socket.emit('stop:etas', {
          stopId,
          etas,
        });
      } catch (error) {
        console.error('Error in passenger:request:etas:', error);
        socket.emit('passenger:error', { message: 'Failed to fetch ETAs' });
      }
    });

    // Passenger requests current buses on a route
    socket.on('passenger:request:buses', async (data: { routeId: string }) => {
      try {
        const { routeId } = data;
        const buses = await LocationService.getActiveBusLocations(routeId);

        socket.emit('route:buses', {
          routeId,
          buses,
        });
      } catch (error) {
        console.error('Error in passenger:request:buses:', error);
        socket.emit('passenger:error', { message: 'Failed to fetch buses' });
      }
    });
  }
}
