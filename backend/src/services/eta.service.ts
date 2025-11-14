import { pool } from '../config/database';
import { OSRMService } from './osrm.service';
import { etaCache } from './eta-cache.service';
import { DateTime } from 'luxon';

const ACTIVE_BUS_THRESHOLD_SECONDS = 120;

interface BusLocation {
  busId: string;
  busNumber: string;
  driverName: string;
  latitude: number;
  longitude: number;
  updatedAt: Date;
  routeId: string;
  routeName: string;
}

interface ETAResult {
  routeId: string;
  routeName: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  userLocation: {
    lat: number;
    lon: number;
    label: string;
  };
  busId: string;
  busNumber: string;
  driverName: string;
  etaIso: string;
  etaLocal: string;
  inMinutes: number;
  travelSeconds: number;
  source: 'osrm' | 'fallback';
  message: string;
}

export class ETAService {
  static async updateBusLocation(
    busId: string,
    latitude: number,
    longitude: number,
    timestamp?: number
  ): Promise<void> {
    const updatedAt = timestamp ? new Date(timestamp) : new Date();
    await pool.query(
      `UPDATE buses SET last_latitude = $1, last_longitude = $2, last_location_update = $3 WHERE id = $4`,
      [latitude, longitude, updatedAt, busId]
    );
    console.log(`[Location] Updated bus ${busId}`);
  }

  static async getActiveBuses(routeId: string): Promise<BusLocation[]> {
    const thresholdTime = new Date(Date.now() - ACTIVE_BUS_THRESHOLD_SECONDS * 1000);
    const result = await pool.query(
      `SELECT b.id as bus_id, b.bus_number, b.last_latitude, b.last_longitude, 
              b.last_location_update, r.id as route_id, r.name as route_name,
              COALESCE(u.email, 'Unknown') as driver_name
       FROM buses b
       JOIN routes r ON b.id = r.bus_id
       LEFT JOIN driver_bus_assignments_new dba ON b.id = dba.bus_id AND dba.status = 'active'
       LEFT JOIN users u ON dba.driver_id = u.id
       WHERE r.id = $1 AND b.last_location_update >= $2 
         AND b.last_latitude IS NOT NULL AND b.last_longitude IS NOT NULL
       ORDER BY b.last_location_update DESC`,
      [routeId, thresholdTime]
    );
    return result.rows.map((row) => ({
      busId: row.bus_id,
      busNumber: row.bus_number,
      driverName: row.driver_name || 'Unknown',
      latitude: parseFloat(row.last_latitude),
      longitude: parseFloat(row.last_longitude),
      updatedAt: row.last_location_update,
      routeId: row.route_id,
      routeName: row.route_name,
    }));
  }

  static async calculateETA(
    routeId: string,
    userLat: number,
    userLon: number,
    scheduledFrom?: string,
    scheduledTo?: string,
    timeZone: string = 'Asia/Kolkata'
  ): Promise<ETAResult> {
    const activeBuses = await this.getActiveBuses(routeId);
    if (activeBuses.length === 0) throw new Error('NO_ACTIVE_BUSES');

    let bestBus: BusLocation | null = null;
    let bestTravelSeconds = Infinity;
    let bestSource: 'osrm' | 'fallback' = 'fallback';

    for (const bus of activeBuses) {
      const cached = etaCache.get(bus.busId, userLat, userLon);
      if (cached) return cached;

      const osrmDuration = await OSRMService.getRouteDuration(
        bus.longitude, bus.latitude, userLon, userLat
      );

      let travelSeconds: number;
      let source: 'osrm' | 'fallback';

      if (osrmDuration !== null) {
        travelSeconds = osrmDuration;
        source = 'osrm';
      } else {
        const distance = OSRMService.haversineDistance(
          bus.latitude, bus.longitude, userLat, userLon
        );
        travelSeconds = OSRMService.estimateTravelTime(distance, 30);
        source = 'fallback';
      }

      if (travelSeconds < bestTravelSeconds) {
        bestTravelSeconds = travelSeconds;
        bestBus = bus;
        bestSource = source;
      }
    }

    if (!bestBus) throw new Error('NO_VALID_BUS_FOUND');

    const now = DateTime.now().setZone(timeZone);
    const eta = now.plus({ seconds: bestTravelSeconds });
    const inMinutes = Math.round(bestTravelSeconds / 60);

    const result: ETAResult = {
      routeId,
      routeName: bestBus.routeName,
      scheduledFrom,
      scheduledTo,
      userLocation: { lat: userLat, lon: userLon, label: 'Your location (scan)' },
      busId: bestBus.busId,
      busNumber: bestBus.busNumber,
      driverName: bestBus.driverName,
      etaIso: eta.toISO() || '',
      etaLocal: eta.toFormat('HH:mm'),
      inMinutes,
      travelSeconds: bestTravelSeconds,
      source: bestSource,
      message: this.buildMessage(bestBus.routeName, scheduledFrom, scheduledTo, eta.toFormat('HH:mm'), inMinutes),
    };

    etaCache.set(bestBus.busId, userLat, userLon, result, 10000);
    return result;
  }

  private static buildMessage(
    routeName: string,
    scheduledFrom?: string,
    scheduledTo?: string,
    etaLocal?: string,
    inMinutes?: number
  ): string {
    let message = routeName;
    if (scheduledFrom && scheduledTo) message += ` ${scheduledFrom} → ${scheduledTo}`;
    if (etaLocal && inMinutes !== undefined) message += ` — Real-time ETA: ${etaLocal} (in ${inMinutes}m)`;
    return message;
  }

  /**
   * Get ETAs for all buses approaching a stop (legacy method for compatibility)
   */
  static async getETAsForStop(stopId: string): Promise<any[]> {
    // This is a placeholder for backward compatibility
    // Returns empty array for now - can be implemented later if needed
    return [];
  }
}
