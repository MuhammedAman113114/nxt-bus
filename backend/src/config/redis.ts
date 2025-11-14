import { createClient } from 'redis';

const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD || undefined,
};

// Create Redis client
export const redisClient = createClient(redisConfig);

let isRedisConnected = false;
let errorLogged = false;

// Handle Redis errors (only log once to avoid spam)
redisClient.on('error', (err) => {
  if (!errorLogged) {
    console.error('Redis Client Error:', err.message);
    errorLogged = true;
  }
  isRedisConnected = false;
});

redisClient.on('connect', () => {
  console.log('✓ Redis connected successfully');
  isRedisConnected = true;
  errorLogged = false;
});

// Connect to Redis
export async function connectRedis(): Promise<boolean> {
  try {
    await redisClient.connect();
    isRedisConnected = true;
    return true;
  } catch (error) {
    console.warn('⚠ Redis connection failed - running without cache:', error instanceof Error ? error.message : error);
    isRedisConnected = false;
    return false;
  }
}

// Check if Redis is connected
export function isRedisAvailable(): boolean {
  return isRedisConnected;
}

// Disconnect from Redis
export async function disconnectRedis(): Promise<void> {
  await redisClient.quit();
  console.log('Redis connection closed');
}

// Session management functions
export class SessionManager {
  private static SESSION_PREFIX = 'session:';
  private static BLACKLIST_PREFIX = 'blacklist:';
  private static SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  // In-memory fallback storage when Redis is unavailable
  private static memoryStore = new Map<string, { data: string; expires: number }>();

  // Store session
  static async createSession(userId: string, sessionData: object): Promise<string> {
    const sessionId = `${this.SESSION_PREFIX}${userId}:${Date.now()}`;
    
    if (isRedisAvailable()) {
      await redisClient.setEx(sessionId, this.SESSION_TTL, JSON.stringify(sessionData));
    } else {
      // Fallback to memory
      this.memoryStore.set(sessionId, {
        data: JSON.stringify(sessionData),
        expires: Date.now() + this.SESSION_TTL * 1000
      });
    }
    
    return sessionId;
  }

  // Get session
  static async getSession(sessionId: string): Promise<object | null> {
    if (isRedisAvailable()) {
      const data = await redisClient.get(sessionId);
      return data ? JSON.parse(data) : null;
    } else {
      // Fallback to memory
      const item = this.memoryStore.get(sessionId);
      if (item && item.expires > Date.now()) {
        return JSON.parse(item.data);
      }
      return null;
    }
  }

  // Delete session
  static async deleteSession(sessionId: string): Promise<void> {
    if (isRedisAvailable()) {
      await redisClient.del(sessionId);
    } else {
      this.memoryStore.delete(sessionId);
    }
  }

  // Add token to blacklist (for logout)
  static async blacklistToken(token: string, expiresIn: number): Promise<void> {
    const key = `${this.BLACKLIST_PREFIX}${token}`;
    
    if (isRedisAvailable()) {
      await redisClient.setEx(key, expiresIn, 'blacklisted');
    } else {
      this.memoryStore.set(key, {
        data: 'blacklisted',
        expires: Date.now() + expiresIn * 1000
      });
    }
  }

  // Check if token is blacklisted
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `${this.BLACKLIST_PREFIX}${token}`;
    
    if (isRedisAvailable()) {
      const result = await redisClient.get(key);
      return result !== null;
    } else {
      const item = this.memoryStore.get(key);
      return item !== undefined && item.expires > Date.now();
    }
  }

  // Store refresh token
  static async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const key = `refresh:${userId}`;
    
    if (isRedisAvailable()) {
      await redisClient.setEx(key, this.SESSION_TTL, refreshToken);
    } else {
      this.memoryStore.set(key, {
        data: refreshToken,
        expires: Date.now() + this.SESSION_TTL * 1000
      });
    }
  }

  // Get refresh token
  static async getRefreshToken(userId: string): Promise<string | null> {
    const key = `refresh:${userId}`;
    
    if (isRedisAvailable()) {
      return await redisClient.get(key);
    } else {
      const item = this.memoryStore.get(key);
      if (item && item.expires > Date.now()) {
        return item.data;
      }
      return null;
    }
  }

  // Delete refresh token
  static async deleteRefreshToken(userId: string): Promise<void> {
    const key = `refresh:${userId}`;
    
    if (isRedisAvailable()) {
      await redisClient.del(key);
    } else {
      this.memoryStore.delete(key);
    }
  }

  // Cache data with TTL
  static async cache(key: string, data: object, ttl: number = 300): Promise<void> {
    if (isRedisAvailable()) {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } else {
      this.memoryStore.set(key, {
        data: JSON.stringify(data),
        expires: Date.now() + ttl * 1000
      });
    }
  }

  // Get cached data
  static async getCached(key: string): Promise<object | null> {
    if (isRedisAvailable()) {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } else {
      const item = this.memoryStore.get(key);
      if (item && item.expires > Date.now()) {
        return JSON.parse(item.data);
      }
      return null;
    }
  }

  // Delete cached data
  static async deleteCached(key: string): Promise<void> {
    if (isRedisAvailable()) {
      await redisClient.del(key);
    } else {
      this.memoryStore.delete(key);
    }
  }

  // Clean up expired entries from memory store
  static cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, value] of this.memoryStore.entries()) {
      if (value.expires < now) {
        this.memoryStore.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired session(s) from memory`);
    }
  }

  // Start periodic cleanup (call this on server start)
  static startPeriodicCleanup(intervalMinutes: number = 15): NodeJS.Timeout {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    return setInterval(() => {
      this.cleanupExpiredSessions();
    }, intervalMs);
  }
}
