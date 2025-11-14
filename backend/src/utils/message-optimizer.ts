/**
 * Message Optimizer for WebSocket communications
 * Implements delta updates and message compression
 */

interface LocationData {
  busId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  heading?: number;
  speed?: number;
  timestamp: string;
}

interface OptimizedLocation {
  id: string; // Shortened busId
  lat: number;
  lng: number;
  h?: number; // heading
  s?: number; // speed
  t: number; // timestamp as unix time
}

// Store last sent location for each bus
const lastLocations = new Map<string, LocationData>();

export class MessageOptimizer {
  /**
   * Convert location data to optimized format with shorter property names
   */
  static optimizeLocation(location: LocationData): OptimizedLocation {
    return {
      id: location.busId.slice(0, 8), // Use first 8 chars of UUID
      lat: Math.round(location.location.latitude * 1000000) / 1000000, // 6 decimal places
      lng: Math.round(location.location.longitude * 1000000) / 1000000,
      h: location.heading ? Math.round(location.heading) : undefined,
      s: location.speed ? Math.round(location.speed * 10) / 10 : undefined, // 1 decimal place
      t: new Date(location.timestamp).getTime()
    };
  }

  /**
   * Create delta update - only send changed fields
   */
  static createDeltaUpdate(busId: string, newLocation: LocationData): OptimizedLocation | null {
    const lastLocation = lastLocations.get(busId);

    if (!lastLocation) {
      // First update, send full data
      lastLocations.set(busId, newLocation);
      return this.optimizeLocation(newLocation);
    }

    // Check if location has changed significantly (more than 10 meters)
    const distance = this.calculateDistance(
      lastLocation.location.latitude,
      lastLocation.location.longitude,
      newLocation.location.latitude,
      newLocation.location.longitude
    );

    // If no significant change, don't send update
    if (distance < 0.01) { // Less than 10 meters
      return null;
    }

    // Create delta with only changed fields
    const delta: any = {
      id: busId.slice(0, 8),
      t: new Date(newLocation.timestamp).getTime()
    };

    // Only include changed location
    if (
      lastLocation.location.latitude !== newLocation.location.latitude ||
      lastLocation.location.longitude !== newLocation.location.longitude
    ) {
      delta.lat = Math.round(newLocation.location.latitude * 1000000) / 1000000;
      delta.lng = Math.round(newLocation.location.longitude * 1000000) / 1000000;
    }

    // Only include heading if changed significantly (more than 10 degrees)
    if (newLocation.heading !== undefined) {
      const headingDiff = Math.abs((lastLocation.heading || 0) - newLocation.heading);
      if (headingDiff > 10) {
        delta.h = Math.round(newLocation.heading);
      }
    }

    // Only include speed if changed significantly (more than 2 km/h)
    if (newLocation.speed !== undefined) {
      const speedDiff = Math.abs((lastLocation.speed || 0) - newLocation.speed);
      if (speedDiff > 2) {
        delta.s = Math.round(newLocation.speed * 10) / 10;
      }
    }

    // Update last location
    lastLocations.set(busId, newLocation);

    return delta;
  }

  /**
   * Optimize ETA data
   */
  static optimizeETA(eta: any): any {
    return {
      id: eta.busId.slice(0, 8),
      sid: eta.stopId.slice(0, 8),
      eta: Math.round(eta.estimatedArrival),
      d: Math.round(eta.distance * 10) / 10, // distance in km, 1 decimal
      c: eta.confidence.charAt(0) // 'h', 'm', or 'l'
    };
  }

  /**
   * Batch multiple messages into one
   */
  static batchMessages(messages: any[]): any {
    if (messages.length === 0) return null;
    if (messages.length === 1) return messages[0];

    // Group by message type
    const grouped: { [key: string]: any[] } = {};
    
    messages.forEach(msg => {
      const type = msg.type || 'unknown';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(msg.data || msg);
    });

    return {
      batch: true,
      messages: grouped
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Clear stored location data for a bus (when it goes offline)
   */
  static clearBusData(busId: string): void {
    lastLocations.delete(busId);
  }

  /**
   * Clear all stored data
   */
  static clearAll(): void {
    lastLocations.clear();
  }

  /**
   * Get statistics about optimization
   */
  static getStats(): any {
    return {
      trackedBuses: lastLocations.size,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
    };
  }
}
