/**
 * Cached API Wrapper
 * Implements stale-while-revalidate pattern
 */

import apiService from '../services/api.service';
import { offlineCache, STORES } from './offline-cache';

export class CachedAPI {
  /**
   * Get all routes (with cache)
   */
  static async getAllRoutes() {
    try {
      // Try to get from cache first
      const cached = await offlineCache.getAll(STORES.ROUTES);
      
      // If we have cached data, return it immediately
      if (cached.length > 0) {
        // Revalidate in background
        this.revalidateRoutes();
        return { routes: cached, fromCache: true };
      }

      // No cache, fetch from API
      const response = await apiService.getAllRoutes();
      
      // Cache the response
      if (response.routes) {
        await offlineCache.setMany(STORES.ROUTES, response.routes);
      }

      return { ...response, fromCache: false };
    } catch (error) {
      // If offline, try to return cached data even if expired
      const cached = await offlineCache.getAll(STORES.ROUTES);
      if (cached.length > 0) {
        return { routes: cached, fromCache: true, stale: true };
      }
      throw error;
    }
  }

  /**
   * Revalidate routes in background
   */
  private static async revalidateRoutes() {
    try {
      const response = await apiService.getAllRoutes();
      if (response.routes) {
        await offlineCache.setMany(STORES.ROUTES, response.routes);
      }
    } catch (error) {
      console.warn('Failed to revalidate routes:', error);
    }
  }

  /**
   * Get all stops (with cache)
   */
  static async getAllStops() {
    try {
      const cached = await offlineCache.getAll(STORES.STOPS);
      
      if (cached.length > 0) {
        this.revalidateStops();
        return { stops: cached, fromCache: true };
      }

      const response = await apiService.getAllStops();
      
      if (response.stops) {
        await offlineCache.setMany(STORES.STOPS, response.stops);
      }

      return { ...response, fromCache: false };
    } catch (error) {
      const cached = await offlineCache.getAll(STORES.STOPS);
      if (cached.length > 0) {
        return { stops: cached, fromCache: true, stale: true };
      }
      throw error;
    }
  }

  /**
   * Revalidate stops in background
   */
  private static async revalidateStops() {
    try {
      const response = await apiService.getAllStops();
      if (response.stops) {
        await offlineCache.setMany(STORES.STOPS, response.stops);
      }
    } catch (error) {
      console.warn('Failed to revalidate stops:', error);
    }
  }

  /**
   * Get stop by ID (with cache)
   */
  static async getStopById(id: string) {
    try {
      const cached = await offlineCache.get(STORES.STOPS, id);
      
      if (cached) {
        this.revalidateStop(id);
        return { stop: cached, fromCache: true };
      }

      const response = await apiService.getStopById(id);
      
      if (response.stop) {
        await offlineCache.set(STORES.STOPS, response.stop);
      }

      return { ...response, fromCache: false };
    } catch (error) {
      const cached = await offlineCache.get(STORES.STOPS, id);
      if (cached) {
        return { stop: cached, fromCache: true, stale: true };
      }
      throw error;
    }
  }

  /**
   * Revalidate stop in background
   */
  private static async revalidateStop(id: string) {
    try {
      const response = await apiService.getStopById(id);
      if (response.stop) {
        await offlineCache.set(STORES.STOPS, response.stop);
      }
    } catch (error) {
      console.warn('Failed to revalidate stop:', error);
    }
  }

  /**
   * Get route by ID (with cache)
   */
  static async getRouteById(id: string) {
    try {
      const cached = await offlineCache.get(STORES.ROUTES, id);
      
      if (cached) {
        this.revalidateRoute(id);
        return { route: cached, fromCache: true };
      }

      const response = await apiService.getRouteById(id);
      
      if (response.route) {
        await offlineCache.set(STORES.ROUTES, response.route);
      }

      return { ...response, fromCache: false };
    } catch (error) {
      const cached = await offlineCache.get(STORES.ROUTES, id);
      if (cached) {
        return { route: cached, fromCache: true, stale: true };
      }
      throw error;
    }
  }

  /**
   * Revalidate route in background
   */
  private static async revalidateRoute(id: string) {
    try {
      const response = await apiService.getRouteById(id);
      if (response.route) {
        await offlineCache.set(STORES.ROUTES, response.route);
      }
    } catch (error) {
      console.warn('Failed to revalidate route:', error);
    }
  }

  /**
   * Get active buses on route (short cache)
   */
  static async getActiveBusesOnRoute(id: string) {
    try {
      // Always try to fetch fresh data for buses
      const response = await apiService.getActiveBusesOnRoute(id);
      
      // Cache for offline fallback
      if (response.buses) {
        await offlineCache.setMany(STORES.BUSES, response.buses);
      }

      return { ...response, fromCache: false };
    } catch (error) {
      // If offline, return cached buses
      const cached = await offlineCache.getAll(STORES.BUSES);
      if (cached.length > 0) {
        return { buses: cached, fromCache: true, stale: true };
      }
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  static async clearAllCaches() {
    await offlineCache.clear(STORES.ROUTES);
    await offlineCache.clear(STORES.STOPS);
    await offlineCache.clear(STORES.BUSES);
    await offlineCache.clear(STORES.ETAS);
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats() {
    return await offlineCache.getStats();
  }

  /**
   * Clear expired data
   */
  static async clearExpired() {
    await offlineCache.clearExpired();
  }
}
