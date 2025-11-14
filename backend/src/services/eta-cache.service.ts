interface CacheEntry {
  data: any;
  expiresAt: number;
}

export class ETACacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_TTL = 10000; // 10 seconds

  /**
   * Generate cache key from bus ID and user location
   */
  private generateKey(busId: string, userLat: number, userLon: number): string {
    // Round to 5 decimal places (~1.1m precision)
    const lat = userLat.toFixed(5);
    const lon = userLon.toFixed(5);
    return `${busId}:${lat}:${lon}`;
  }

  /**
   * Get cached ETA result
   */
  get(busId: string, userLat: number, userLon: number): any | null {
    const key = this.generateKey(busId, userLat, userLon);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[Cache] HIT for key: ${key}`);
    return entry.data;
  }

  /**
   * Set cache entry with TTL
   */
  set(
    busId: string,
    userLat: number,
    userLon: number,
    data: any,
    ttlMs: number = this.DEFAULT_TTL
  ): void {
    const key = this.generateKey(busId, userLat, userLon);
    const expiresAt = Date.now() + ttlMs;

    this.cache.set(key, { data, expiresAt });
    console.log(`[Cache] SET for key: ${key}, TTL: ${ttlMs}ms`);
  }

  /**
   * Clear expired entries (cleanup)
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Cache] Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log('[Cache] Cleared all entries');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const etaCache = new ETACacheService();

// Run cleanup every 30 seconds
setInterval(() => {
  etaCache.cleanup();
}, 30000);
