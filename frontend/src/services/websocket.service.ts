import { io, Socket } from 'socket.io-client';
import { ETA } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

type EventCallback = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, EventCallback[]> = new Map();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        console.error('No access token found');
        reject(new Error('No access token'));
        return;
      }

      // If already connected, resolve immediately
      if (this.socket?.connected) {
        console.log('✓ WebSocket already connected');
        resolve();
        return;
      }

      this.socket = io(WS_URL, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('✓ WebSocket connected');
        resolve();
      });

      this.socket.on('disconnect', () => {
        console.log('✗ WebSocket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error.message);
        reject(error);
      });

      // Setup event forwarding
      this.setupEventForwarding();

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Subscribe to route updates
  subscribeToRoute(routeId: string) {
    if (!this.socket) return;
    this.socket.emit('passenger:subscribe', { routeId });
  }

  // Subscribe to stop updates
  subscribeToStop(stopId: string) {
    if (!this.socket) return;
    this.socket.emit('passenger:subscribe', { stopId });
  }

  // Unsubscribe from route
  unsubscribeFromRoute(routeId: string) {
    if (!this.socket) return;
    this.socket.emit('passenger:unsubscribe', { routeId });
  }

  // Unsubscribe from stop
  unsubscribeFromStop(stopId: string) {
    if (!this.socket) return;
    this.socket.emit('passenger:unsubscribe', { stopId });
  }

  // Request current ETAs
  requestETAs(stopId: string) {
    if (!this.socket) return;
    this.socket.emit('passenger:request:etas', { stopId });
  }

  // Request current buses
  requestBuses(routeId: string) {
    if (!this.socket) return;
    this.socket.emit('passenger:request:buses', { routeId });
  }

  // Driver: Start tracking
  startTracking(busId: string, routeId: string) {
    if (!this.socket) return;
    this.socket.emit('driver:connect', { busId, routeId });
  }

  // Driver: Send location
  sendLocation(latitude: number, longitude: number, heading?: number, speed?: number) {
    if (!this.socket) return;
    this.socket.emit('driver:location', { latitude, longitude, heading, speed });
  }

  // Driver: Stop tracking
  stopTracking() {
    if (!this.socket) return;
    this.socket.emit('driver:disconnect');
  }

  // Generic emit method for any event
  emit(event: string, data?: any) {
    if (!this.socket) {
      console.warn('Socket not connected, cannot emit:', event);
      return;
    }
    this.socket.emit(event, data);
  }

  // Event listener management
  on(event: string, callback: EventCallback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);

    // If socket is already connected, attach listener
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: EventCallback) {
    if (callback) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.eventListeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  // Setup event forwarding from socket to listeners
  private setupEventForwarding() {
    if (!this.socket) return;

    const events = [
      'bus:location',
      'bus:eta',
      'bus:delay',
      'bus:arrival',
      'bus:online',
      'bus:offline',
      'route:status',
      'route:buses',
      'stop:etas',
      'passenger:subscribed',
      'passenger:unsubscribed',
      'passenger:error',
      'driver:connected',
      'driver:disconnected',
      'driver:location:ack',
      'driver:error',
    ];

    events.forEach((event) => {
      this.socket!.on(event, (data) => {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
          listeners.forEach((callback) => callback(data));
        }
      });
    });
  }
}

export default new WebSocketService();
