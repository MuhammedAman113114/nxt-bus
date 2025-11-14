import { Server } from 'socket.io';
import { ETA } from '../types';
import { MessageOptimizer } from '../utils/message-optimizer';

export class BroadcastService {
  private io: Server;
  private messageQueue: Map<string, any[]> = new Map();
  private batchInterval: NodeJS.Timeout | null = null;

  constructor(io: Server) {
    this.io = io;
    this.startBatchProcessing();
  }

  // Start batch processing for message optimization
  private startBatchProcessing() {
    // Process queued messages every 100ms
    this.batchInterval = setInterval(() => {
      this.processBatchedMessages();
    }, 100);
  }

  // Process and send batched messages
  private processBatchedMessages() {
    this.messageQueue.forEach((messages, room) => {
      if (messages.length > 0) {
        const batched = MessageOptimizer.batchMessages(messages);
        if (batched) {
          this.io.to(room).emit('batch:update', batched);
        }
        this.messageQueue.set(room, []);
      }
    });
  }

  // Add message to batch queue
  private queueMessage(room: string, message: any) {
    if (!this.messageQueue.has(room)) {
      this.messageQueue.set(room, []);
    }
    this.messageQueue.get(room)!.push(message);
  }

  // Broadcast bus location update to route subscribers (optimized)
  broadcastBusLocation(routeId: string, data: {
    busId: string;
    location: { latitude: number; longitude: number };
    heading?: number;
    speed?: number;
    timestamp: string;
  }) {
    // Create delta update
    const delta = MessageOptimizer.createDeltaUpdate(data.busId, data);
    
    // Only broadcast if there's a significant change
    if (delta) {
      this.io.to(`route:${routeId}`).emit('bus:location', delta);
    }
  }

  // Broadcast ETA update to stop subscribers
  broadcastETAUpdate(stopId: string, etas: ETA[]) {
    this.io.to(`stop:${stopId}`).emit('bus:eta', {
      stopId,
      etas,
      timestamp: new Date().toISOString(),
    });
  }

  // Broadcast delay notification
  broadcastDelay(routeId: string, data: {
    busId: string;
    delayMinutes: number;
    message: string;
  }) {
    this.io.to(`route:${routeId}`).emit('bus:delay', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Broadcast arrival reminder
  broadcastArrival(stopId: string, data: {
    busId: string;
    routeName: string;
    eta: ETA;
    message: string;
  }) {
    this.io.to(`stop:${stopId}`).emit('bus:arrival', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Broadcast route status change
  broadcastRouteStatus(routeId: string, data: {
    status: 'active' | 'inactive';
    activeBuses: number;
    message: string;
  }) {
    this.io.to(`route:${routeId}`).emit('route:status', {
      routeId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Broadcast bus online status
  broadcastBusOnline(routeId: string, busId: string) {
    this.io.to(`route:${routeId}`).emit('bus:online', {
      busId,
      routeId,
      timestamp: new Date().toISOString(),
    });
  }

  // Broadcast bus offline status
  broadcastBusOffline(routeId: string, busId: string) {
    this.io.to(`route:${routeId}`).emit('bus:offline', {
      busId,
      routeId,
      timestamp: new Date().toISOString(),
    });
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.io.sockets.sockets.size;
  }

  // Get clients in a specific room
  getRoomClientsCount(room: string): number {
    const roomSockets = this.io.sockets.adapter.rooms.get(room);
    return roomSockets ? roomSockets.size : 0;
  }

  // Cleanup when bus goes offline
  cleanupBusData(busId: string) {
    MessageOptimizer.clearBusData(busId);
  }

  // Cleanup on shutdown
  cleanup() {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
    MessageOptimizer.clearAll();
    this.messageQueue.clear();
  }

  // Get optimization statistics
  getStats() {
    return {
      ...MessageOptimizer.getStats(),
      queuedMessages: Array.from(this.messageQueue.values()).reduce((sum, arr) => sum + arr.length, 0)
    };
  }
}
