/**
 * PWA utilities for handling installation, updates, and offline status
 */

// Check if app is running as PWA
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

// Check if app can be installed
export function canInstall(): boolean {
  return 'BeforeInstallPromptEvent' in window;
}

// Handle PWA installation
let deferredPrompt: any = null;

export function setupPWAInstall(onInstallable: (canInstall: boolean) => void): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing
    e.preventDefault();
    // Store the event for later use
    deferredPrompt = e;
    // Notify that app can be installed
    onInstallable(true);
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully');
    deferredPrompt = null;
    onInstallable(false);
  });
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user's response
  const { outcome } = await deferredPrompt.userChoice;
  
  console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);
  
  // Clear the deferred prompt
  deferredPrompt = null;

  return outcome === 'accepted';
}

// Handle service worker updates
export function setupServiceWorkerUpdate(onUpdate: () => void): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              onUpdate();
            }
          });
        }
      });
    });
  }
}

export function updateServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    });
  }
}

// Online/Offline status
export function setupOnlineStatus(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  const handleOnline = () => {
    console.log('App is online');
    onOnline();
  };

  const handleOffline = () => {
    console.log('App is offline');
    onOffline();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Check initial status
  if (!navigator.onLine) {
    onOffline();
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

// Show notification
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  const permission = await requestNotificationPermission();

  if (permission === 'granted') {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options,
      });
    } else {
      new Notification(title, options);
    }
  }
}

// Cache management
export async function clearCache(): Promise<void> {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((cacheName) => caches.delete(cacheName))
    );
    console.log('All caches cleared');
  }
}

export async function getCacheSize(): Promise<number> {
  if ('caches' in window && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
  return 0;
}

// Background sync
export function registerBackgroundSync(tag: string): void {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      return (registration as any).sync.register(tag);
    }).catch((error) => {
      console.error('Background sync registration failed:', error);
    });
  }
}
