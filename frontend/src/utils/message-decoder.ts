/**
 * Message Decoder for optimized WebSocket messages
 * Handles delta updates and short property names
 */

interface OptimizedLocation {
  id: string;
  lat?: number;
  lng?: number;
  h?: number;
  s?: number;
  t: number;
}

interface FullLocation {
  busId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  heading?: number;
  speed?: number;
  timestamp: string;
}

// Store last known full state for each bus
const busStates = new Map<string, FullLocation>();

export class MessageDecoder {
  /**
   * Decode optimized location message to full format
   */
  static decodeLocation(optimized: OptimizedLocation): FullLocation {
    const busId = optimized.id;
    const lastState = busStates.get(busId);

    // Build full location from delta + last state
    const fullLocation: FullLocation = {
      busId: busId,
      location: {
        latitude: optimized.lat ?? lastState?.location.latitude ?? 0,
        longitude: optimized.lng ?? lastState?.location.longitude ?? 0
      },
      heading: optimized.h ?? lastState?.heading,
      speed: optimized.s ?? lastState?.speed,
      timestamp: new Date(optimized.t).toISOString()
    };

    // Update stored state
    busStates.set(busId, fullLocation);

    return fullLocation;
  }

  /**
   * Decode optimized ETA message
   */
  static decodeETA(optimized: any): any {
    return {
      busId: optimized.id,
      stopId: optimized.sid,
      estimatedArrival: optimized.eta,
      distance: optimized.d,
      confidence: optimized.c === 'h' ? 'high' : optimized.c === 'm' ? 'medium' : 'low'
    };
  }

  /**
   * Decode batched messages
   */
  static decodeBatch(batch: any): any[] {
    if (!batch.batch || !batch.messages) {
      return [batch];
    }

    const decoded: any[] = [];

    Object.entries(batch.messages).forEach(([type, messages]: [string, any]) => {
      if (Array.isArray(messages)) {
        messages.forEach(msg => {
          decoded.push({
            type,
            data: msg
          });
        });
      }
    });

    return decoded;
  }

  /**
   * Clear stored state for a bus
   */
  static clearBusState(busId: string): void {
    busStates.delete(busId);
  }

  /**
   * Clear all stored states
   */
  static clearAll(): void {
    busStates.clear();
  }

  /**
   * Get statistics
   */
  static getStats(): any {
    return {
      trackedBuses: busStates.size
    };
  }
}
