/**
 * Offline Cache using IndexedDB
 * Stores route, stop, and bus data for offline access
 */

const DB_NAME = 'nxt-bus-cache';
const DB_VERSION = 1;

// Store names
const STORES = {
  ROUTES: 'routes',
  STOPS: 'stops',
  BUSES: 'buses',
  ETAS: 'etas',
  METADATA: 'metadata'
};

// Cache expiration times (in milliseconds)
const CACHE_DURATION = {
  ROUTES: 24 * 60 * 60 * 1000, // 24 hours
  STOPS: 24 * 60 * 60 * 1000,  // 24 hours
  BUSES: 5 * 60 * 1000,         // 5 minutes
  ETAS: 1 * 60 * 1000           // 1 minute
};

class OfflineCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.ROUTES)) {
          db.createObjectStore(STORES.ROUTES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.STOPS)) {
          db.createObjectStore(STORES.STOPS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.BUSES)) {
          db.createObjectStore(STORES.BUSES, { keyPath: 'busId' });
        }
        if (!db.objectStoreNames.contains(STORES.ETAS)) {
          db.createObjectStore(STORES.ETAS, { keyPath: 'stopId' });
        }
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get data from cache
   */
  async get<T>(store: string, key: string): Promise<T | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);

      request.onsuccess = () => {
        const data = request.result;
        if (data && this.isDataFresh(data, store)) {
          resolve(data);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('Error reading from cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all data from a store
   */
  async getAll<T>(store: string): Promise<T[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        const data = request.result.filter((item: any) => 
          this.isDataFresh(item, store)
        );
        resolve(data);
      };

      request.onerror = () => {
        console.error('Error reading all from cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Save data to cache
   */
  async set(store: string, data: any): Promise<void> {
    await this.init();
    if (!this.db) return;

    // Add timestamp
    const dataWithTimestamp = {
      ...data,
      _cachedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(dataWithTimestamp);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Error writing to cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Save multiple items to cache
   */
  async setMany(store: string, items: any[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);

      items.forEach(item => {
        const dataWithTimestamp = {
          ...item,
          _cachedAt: Date.now()
        };
        objectStore.put(dataWithTimestamp);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        console.error('Error writing many to cache:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Delete data from cache
   */
  async delete(store: string, key: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Error deleting from cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all data from a store
   */
  async clear(store: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Error clearing cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check if cached data is still fresh
   */
  private isDataFresh(data: any, store: string): boolean {
    if (!data._cachedAt) return false;

    const age = Date.now() - data._cachedAt;
    const maxAge = this.getMaxAge(store);

    return age < maxAge;
  }

  /**
   * Get maximum age for a store
   */
  private getMaxAge(store: string): number {
    switch (store) {
      case STORES.ROUTES:
        return CACHE_DURATION.ROUTES;
      case STORES.STOPS:
        return CACHE_DURATION.STOPS;
      case STORES.BUSES:
        return CACHE_DURATION.BUSES;
      case STORES.ETAS:
        return CACHE_DURATION.ETAS;
      default:
        return 5 * 60 * 1000; // 5 minutes default
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    await this.init();
    if (!this.db) return null;

    const stats: any = {};

    for (const store of Object.values(STORES)) {
      const count = await this.getCount(store);
      stats[store] = count;
    }

    return stats;
  }

  /**
   * Get count of items in a store
   */
  private async getCount(store: string): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('Error counting cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all expired data
   */
  async clearExpired(): Promise<void> {
    await this.init();
    if (!this.db) return;

    for (const store of Object.values(STORES)) {
      const allData = await this.getAll(store);
      const transaction = this.db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);

      allData.forEach((item: any) => {
        if (!this.isDataFresh(item, store)) {
          objectStore.delete(item.id || item.busId || item.stopId || item.key);
        }
      });
    }
  }
}

// Export singleton instance
export const offlineCache = new OfflineCache();

// Export store names for convenience
export { STORES };
