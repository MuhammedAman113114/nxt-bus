class NotificationService {
  private permission: NotificationPermission = 'default';
  private listeners: Map<string, Set<(notification: any) => void>> = new Map();

  constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  // Request permission for browser notifications
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Check if notifications are supported and permitted
  isSupported(): boolean {
    return 'Notification' in window;
  }

  isPermitted(): boolean {
    return this.permission === 'granted';
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }

  // Show a browser notification
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Notifications not supported');
      return;
    }

    if (!this.isPermitted()) {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('Notification permission denied');
        return;
      }
    }

    try {
      const notification = new Notification(title, {
        icon: '/bus-icon.png',
        badge: '/bus-badge.png',
        vibrate: [200, 100, 200],
        ...options
      });

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);

      // Emit to listeners
      this.emit('notification:shown', { title, options });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  // Show arrival reminder notification
  async showArrivalReminder(busId: string, stopName: string, eta: number): Promise<void> {
    const title = '🚌 Bus Arriving Soon!';
    const body = `Bus ${busId.slice(0, 8)} will arrive at ${stopName} in ${eta} minutes`;
    
    await this.showNotification(title, {
      body,
      tag: `arrival-${busId}-${stopName}`,
      requireInteraction: false,
      data: { type: 'arrival', busId, stopName, eta }
    });
  }

  // Show delay alert notification
  async showDelayAlert(busId: string, routeName: string, delayMinutes: number): Promise<void> {
    const title = '⚠️ Bus Delayed';
    const body = `Bus ${busId.slice(0, 8)} on ${routeName} is delayed by ${delayMinutes} minutes`;
    
    await this.showNotification(title, {
      body,
      tag: `delay-${busId}`,
      requireInteraction: false,
      data: { type: 'delay', busId, routeName, delayMinutes }
    });
  }

  // Show route status notification
  async showRouteStatus(routeName: string, status: string, message: string): Promise<void> {
    const title = `🛣️ ${routeName} - ${status}`;
    
    await this.showNotification(title, {
      body: message,
      tag: `route-${routeName}`,
      requireInteraction: false,
      data: { type: 'route-status', routeName, status }
    });
  }

  // In-app notification system
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Clear all listeners
  clearListeners(): void {
    this.listeners.clear();
  }
}

export default new NotificationService();
