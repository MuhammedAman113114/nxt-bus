import { pool } from '../config/database';
import { SessionManager } from '../config/redis';
import { GeoCoordinates } from '../types';

interface LocationUpdate {
  busId: string;
  location: GeoCoordinates;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class LocationService {
  private static readonly MAX_SPEED_KMH = 150; // Maximum realistic bus speed
  private static readonly LOCATION_CACHE_TTL = 30; // 30 seconds

  // Validate GPS coordinates
  static validateCoordinates(location: GeoCoordinates): ValidationResult {
    const { latitude, longitude } = location;

    // Check latitude bounds (-90 to 90)
    if (latitude < -90 || latitude > 90) {
      return { valid: false, error: 'Invalid latitude: must be between -90 and 90' };
    }

    // Check longitude bounds (-180 to 180)
    if (longitude < -180 || longitude > 180) {
      return { valid: false, error: 'Invalid longitude: must be between -180 and 180' };
    }

    return { valid: true };
  }

  // Calculate distance between two points using Haversine formula (in kilometers)
  static calculateDistance(from: GeoCoordinates, to: GeoCoordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.latitude)) *
        Math.cos(this.toRadians(to.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  // Convert degrees to radians
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Calculate bearing/heading between two points (in degrees)
  static calculateBearing(from: GeoCoordinates, to: GeoCoordinates): number {
    const dLon = this.toRadians(to.longitude - from.longitude);
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const bearing = Math.atan2(y, x);
    const degrees = (bearing * 180) / Math.PI;

    return (degrees + 360) % 360; // Normalize to 0-360
  }

  // Detect suspicious location jumps (teleportation)
  static async detectTeleportation(
    busId: string,
    newLocation: GeoCoordinates,
    timestamp: Date
  ): Promise<ValidationResult> {
    try {
      // Get last known location
      const result = await pool.query(
        `SELECT location, recorded_at, speed
         FROM bus_locations
         WHERE bus_id = $1
         ORDER BY recorded_at DESC
         LIMIT 1`,
        [busId]
      );

      if (result.rows.length === 0) {
        return { valid: true }; // First location, no comparison
      }

      const lastLocation = result.rows[0];
      const lastCoords: GeoCoordinates = {
        latitude: lastLocation.location.coordinates[1],
        longitude: lastLocation.location.coordinates[0],
      };

      const lastTime = new Date(lastLocation.recorded_at);
      const timeDiffSeconds = (timestamp.getTime() - lastTime.getTime()) / 1000;

      if (timeDiffSeconds <= 0) {
        return { valid: false, error: 'Timestamp must be after last recorded location' };
      }

      // Calculate distance moved
      const distance = this.calculateDistance(lastCoords, newLocation);

      // Calculate implied speed (km/h)
      const impliedSpeed = (distance / timeDiffSeconds) * 3600;

      // Check if speed is realistic
      if (impliedSpeed > this.MAX_SPEED_KMH) {
        return {
          valid: false,
          error: `Suspicious location jump detected: implied speed ${Math.round(impliedSpeed)} km/h exceeds maximum ${this.MAX_SPEED_KMH} km/h`,
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error detecting teleportation:', error);
      return { valid: true }; // Allow on error to not block legitimate updates
    }
  }

  // Process and store location update
  static async processLocationUpdate(update: LocationUpdate): Promise<void> {
    const { busId, location, heading, speed, timestamp } = update;

    // Validate coordinates
    const coordValidation = this.validateCoordinates(location);
    if (!coordValidation.valid) {
      throw new Error(coordValidation.error);
    }

    // Detect teleportation
    const teleportValidation = await this.detectTeleportation(busId, location, timestamp);
    if (!teleportValidation.valid) {
      throw new Error(teleportValidation.error);
    }

    // Store location in database
    await pool.query(
      `INSERT INTO bus_locations (bus_id, location, heading, speed, recorded_at)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6)`,
      [busId, location.longitude, location.latitude, heading, speed, timestamp]
    );

    // Cache latest location in Redis
    try {
      const cacheKey = `bus:location:${busId}`;
      await SessionManager.cache(
        cacheKey,
        {
          busId,
          location,
          heading,
          speed,
          timestamp: timestamp.toISOString(),
        },
        this.LOCATION_CACHE_TTL
      );
    } catch (error) {
      console.warn('Failed to cache location in Redis:', error);
    }
  }

  // Get latest location for a bus
  static async getLatestLocation(busId: string): Promise<LocationUpdate | null> {
    // Try cache first
    try {
      const cacheKey = `bus:location:${busId}`;
      const cached = await SessionManager.getCached(cacheKey);
      if (cached) {
        return cached as LocationUpdate;
      }
    } catch (error) {
      console.warn('Failed to get cached location:', error);
    }

    // Query database
    const result = await pool.query(
      `SELECT 
        bus_id,
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude,
        heading,
        speed,
        recorded_at
       FROM bus_locations
       WHERE bus_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [busId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      busId: row.bus_id,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
      },
      heading: row.heading,
      speed: row.speed,
      timestamp: row.recorded_at,
    };
  }

  // Get active bus locations for a route
  static async getActiveBusLocations(routeId: string): Promise<LocationUpdate[]> {
    const result = await pool.query(
      `SELECT DISTINCT ON (bl.bus_id)
        bl.bus_id,
        ST_X(bl.location::geometry) as longitude,
        ST_Y(bl.location::geometry) as latitude,
        bl.heading,
        bl.speed,
        bl.recorded_at
       FROM bus_locations bl
       JOIN bus_assignments ba ON bl.bus_id = ba.bus_id
       WHERE ba.route_id = $1
         AND ba.status = 'active'
         AND bl.recorded_at > NOW() - INTERVAL '5 minutes'
       ORDER BY bl.bus_id, bl.recorded_at DESC`,
      [routeId]
    );

    return result.rows.map((row) => ({
      busId: row.bus_id,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
      },
      heading: row.heading,
      speed: row.speed,
      timestamp: row.recorded_at,
    }));
  }

  // Get buses near a location (within radius in kilometers)
  static async getBusesNearLocation(
    location: GeoCoordinates,
    radiusKm: number = 5
  ): Promise<LocationUpdate[]> {
    const result = await pool.query(
      `SELECT DISTINCT ON (bl.bus_id)
        bl.bus_id,
        ST_X(bl.location::geometry) as longitude,
        ST_Y(bl.location::geometry) as latitude,
        bl.heading,
        bl.speed,
        bl.recorded_at,
        ST_Distance(
          bl.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)
        ) / 1000 as distance_km
       FROM bus_locations bl
       JOIN bus_assignments ba ON bl.bus_id = ba.bus_id
       WHERE ba.status = 'active'
         AND bl.recorded_at > NOW() - INTERVAL '5 minutes'
         AND ST_DWithin(
           bl.location,
           ST_SetSRID(ST_MakePoint($1, $2), 4326),
           $3
         )
       ORDER BY bl.bus_id, bl.recorded_at DESC`,
      [location.longitude, location.latitude, radiusKm * 1000] // Convert km to meters
    );

    return result.rows.map((row) => ({
      busId: row.bus_id,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
      },
      heading: row.heading,
      speed: row.speed,
      timestamp: row.recorded_at,
    }));
  }

  // Get location history for a bus
  static async getLocationHistory(
    busId: string,
    limit: number = 50
  ): Promise<LocationUpdate[]> {
    const result = await pool.query(
      `SELECT 
        bus_id,
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude,
        heading,
        speed,
        recorded_at
       FROM bus_locations
       WHERE bus_id = $1
       ORDER BY recorded_at DESC
       LIMIT $2`,
      [busId, limit]
    );

    return result.rows.map((row) => ({
      busId: row.bus_id,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
      },
      heading: row.heading,
      speed: row.speed,
      timestamp: row.recorded_at,
    }));
  }
}
