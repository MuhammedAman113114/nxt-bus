import { pool } from '../config/database';
import { SessionManager } from '../config/redis';
import { Route, BusStop, GeoCoordinates } from '../types';
import { LocationService } from './location.service';

interface RouteWithStops extends Route {
  stops: BusStop[];
  totalDistance: number;
}

export class RouteService {
  private static readonly ROUTE_CACHE_TTL = 300; // 5 minutes

  // Get route by ID with all stops
  static async getRoute(routeId: string): Promise<RouteWithStops | null> {
    // Try cache first
    try {
      const cacheKey = `route:${routeId}`;
      const cached = await SessionManager.getCached(cacheKey);
      if (cached) {
        return cached as RouteWithStops;
      }
    } catch (error) {
      console.warn('Failed to get cached route:', error);
    }

    // Query database
    const routeResult = await pool.query(
      `SELECT r.id, r.name, r.description, r.from_location, r.to_location, 
              r.departure_time, r.reaching_time, r.is_active, r.created_at,
              r.bus_id, b.bus_number
       FROM routes r
       LEFT JOIN buses b ON r.bus_id = b.id
       WHERE r.id = $1`,
      [routeId]
    );

    if (routeResult.rows.length === 0) {
      return null;
    }

    const route = routeResult.rows[0];

    // Get stops for this route
    const stopsResult = await pool.query(
      `SELECT 
        bs.id,
        bs.name,
        ST_X(bs.location::geometry) as longitude,
        ST_Y(bs.location::geometry) as latitude,
        bs.qr_code,
        rs.stop_order,
        rs.distance_from_previous
       FROM bus_stops bs
       JOIN route_stops rs ON bs.id = rs.stop_id
       WHERE rs.route_id = $1
       ORDER BY rs.stop_order ASC`,
      [routeId]
    );

    const stops: BusStop[] = stopsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
      },
      qrCode: row.qr_code,
      routes: [routeId],
    }));

    // Calculate total distance
    const totalDistance = stopsResult.rows.reduce(
      (sum, row) => sum + (parseFloat(row.distance_from_previous) || 0),
      0
    );

    // Get active bus count
    const busCountResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM bus_assignments
       WHERE route_id = $1 AND status = 'active'`,
      [routeId]
    );

    const activeBuses = parseInt(busCountResult.rows[0].count);

    const routeWithStops: RouteWithStops = {
      id: route.id,
      name: route.name,
      description: route.description,
      busId: route.bus_id,
      busNumber: route.bus_number,
      stops,
      activeBuses,
      totalDistance,
    };

    // Cache the result
    try {
      const cacheKey = `route:${routeId}`;
      await SessionManager.cache(cacheKey, routeWithStops, this.ROUTE_CACHE_TTL);
    } catch (error) {
      console.warn('Failed to cache route:', error);
    }

    return routeWithStops;
  }

  // Get all routes
  static async getAllRoutes(): Promise<Route[]> {
    const result = await pool.query(
      `SELECT 
        r.id,
        r.name,
        r.description,
        r.from_location,
        r.to_location,
        r.departure_time,
        r.reaching_time,
        r.is_active,
        r.bus_id,
        b.bus_number,
        COUNT(DISTINCT ba.id) FILTER (WHERE ba.status = 'active') as active_buses
       FROM routes r
       LEFT JOIN buses b ON r.bus_id = b.id
       LEFT JOIN bus_assignments ba ON r.id = ba.route_id
       WHERE r.is_active = true
       GROUP BY r.id, r.from_location, r.to_location, r.departure_time, r.reaching_time, r.bus_id, b.bus_number
       ORDER BY r.name ASC`
    );

    // Load stops for each route
    const routes = await Promise.all(result.rows.map(async (row) => {
      const stopsResult = await pool.query(
        `SELECT 
          s.id,
          s.name,
          ST_X(s.location::geometry) as longitude,
          ST_Y(s.location::geometry) as latitude,
          rs.stop_sequence
         FROM route_stops rs
         JOIN bus_stops s ON rs.stop_id = s.id
         WHERE rs.route_id = $1
         ORDER BY rs.stop_sequence ASC`,
        [row.id]
      );

      const stops = stopsResult.rows.map((stopRow) => ({
        id: stopRow.id,
        name: stopRow.name,
        location: {
          latitude: stopRow.latitude,
          longitude: stopRow.longitude,
        },
      }));

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        fromLocation: row.from_location,
        toLocation: row.to_location,
        departureTime: row.departure_time,
        reachingTime: row.reaching_time,
        busId: row.bus_id,
        busNumber: row.bus_number,
        stops,
        activeBuses: parseInt(row.active_buses),
      };
    }));

    return routes;
  }

  // Get routes that serve a specific stop
  static async getRoutesForStop(stopId: string): Promise<Route[]> {
    const result = await pool.query(
      `SELECT DISTINCT
        r.id,
        r.name,
        r.description,
        COUNT(DISTINCT ba.id) FILTER (WHERE ba.status = 'active') as active_buses
       FROM routes r
       JOIN route_stops rs ON r.id = rs.route_id
       LEFT JOIN bus_assignments ba ON r.id = ba.route_id
       WHERE rs.stop_id = $1 AND r.is_active = true
       GROUP BY r.id
       ORDER BY r.name ASC`,
      [stopId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      stops: [],
      activeBuses: parseInt(row.active_buses),
    }));
  }

  // Calculate total route distance
  static async calculateRouteDistance(routeId: string): Promise<number> {
    const result = await pool.query(
      `SELECT SUM(distance_from_previous) as total_distance
       FROM route_stops
       WHERE route_id = $1`,
      [routeId]
    );

    return parseFloat(result.rows[0].total_distance) || 0;
  }

  // Get next stops for a bus based on current location
  static async getNextStops(
    busId: string,
    currentLocation: GeoCoordinates,
    limit: number = 5
  ): Promise<BusStop[]> {
    // Get the route for this bus
    const assignmentResult = await pool.query(
      `SELECT route_id
       FROM bus_assignments
       WHERE bus_id = $1 AND status = 'active'
       LIMIT 1`,
      [busId]
    );

    if (assignmentResult.rows.length === 0) {
      return [];
    }

    const routeId = assignmentResult.rows[0].route_id;

    // Get all stops on the route with distances from current location
    const result = await pool.query(
      `SELECT 
        bs.id,
        bs.name,
        ST_X(bs.location::geometry) as longitude,
        ST_Y(bs.location::geometry) as latitude,
        bs.qr_code,
        rs.stop_order,
        ST_Distance(
          bs.location,
          ST_SetSRID(ST_MakePoint($2, $3), 4326)
        ) / 1000 as distance_km
       FROM bus_stops bs
       JOIN route_stops rs ON bs.id = rs.stop_id
       WHERE rs.route_id = $1
       ORDER BY rs.stop_order ASC`,
      [routeId, currentLocation.longitude, currentLocation.latitude]
    );

    if (result.rows.length === 0) {
      return [];
    }

    // Find the closest stop ahead
    let closestStopIndex = 0;
    let minDistance = Infinity;

    result.rows.forEach((row, index) => {
      const distance = parseFloat(row.distance_km);
      if (distance < minDistance) {
        minDistance = distance;
        closestStopIndex = index;
      }
    });

    // Return the next stops starting from the closest one
    const nextStops = result.rows.slice(closestStopIndex, closestStopIndex + limit);

    return nextStops.map((row) => ({
      id: row.id,
      name: row.name,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
      },
      qrCode: row.qr_code,
      routes: [routeId],
    }));
  }

  // Get stop by ID
  static async getStopById(stopId: string): Promise<BusStop | null> {
    const result = await pool.query(
      `SELECT 
        id,
        name,
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude,
        qr_code
       FROM bus_stops
       WHERE id = $1`,
      [stopId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Get routes serving this stop
    const routesResult = await pool.query(
      `SELECT DISTINCT route_id
       FROM route_stops
       WHERE stop_id = $1`,
      [stopId]
    );

    const routes = routesResult.rows.map((r) => r.route_id);

    return {
      id: row.id,
      name: row.name,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
      },
      qrCode: row.qr_code,
      routes,
    };
  }

  // Get stop by QR code
  static async getStopByQRCode(qrCode: string): Promise<BusStop | null> {
    const result = await pool.query(
      `SELECT 
        id,
        name,
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude,
        qr_code
       FROM bus_stops
       WHERE qr_code = $1`,
      [qrCode]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Get routes serving this stop
    const routesResult = await pool.query(
      `SELECT DISTINCT route_id
       FROM route_stops
       WHERE stop_id = $1`,
      [row.id]
    );

    const routes = routesResult.rows.map((r) => r.route_id);

    return {
      id: row.id,
      name: row.name,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
      },
      qrCode: row.qr_code,
      routes,
    };
  }

  // Get all stops
  static async getAllStops(): Promise<BusStop[]> {
    const result = await pool.query(
      `SELECT 
        id,
        name,
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude,
        qr_code
       FROM bus_stops
       ORDER BY name ASC`
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
      },
      qrCode: row.qr_code,
      routes: [],
    }));
  }

  // Get stops near a location
  static async getStopsNearLocation(
    location: GeoCoordinates,
    radiusKm: number = 1
  ): Promise<BusStop[]> {
    const result = await pool.query(
      `SELECT 
        id,
        name,
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude,
        qr_code,
        ST_Distance(
          location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)
        ) / 1000 as distance_km
       FROM bus_stops
       WHERE ST_DWithin(
         location,
         ST_SetSRID(ST_MakePoint($1, $2), 4326),
         $3
       )
       ORDER BY distance_km ASC`,
      [location.longitude, location.latitude, radiusKm * 1000]
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
      },
      qrCode: row.qr_code,
      routes: [],
    }));
  }

  // Create new route
  static async createRoute(
    name: string,
    description: string,
    fromLocation: string,
    toLocation: string,
    departureTime: string,
    reachingTime: string,
    stops: any[],
    serviceStartTime?: string,
    serviceEndTime?: string,
    baseFare?: number,
    farePerKm?: number
  ): Promise<any> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create route
      const routeResult = await client.query(
        `INSERT INTO routes (name, description, from_location, to_location, departure_time, reaching_time, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id, name, description, from_location, to_location, departure_time, reaching_time, created_at`,
        [name, description, fromLocation, toLocation, departureTime, reachingTime]
      );

      const route = routeResult.rows[0];

      // Add stops to route
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        await client.query(
          `INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_previous_km, expected_dwell_time_seconds)
           VALUES ($1, $2, $3, $4, $5)`,
          [route.id, stop.stopId || stop, i + 1, stop.distanceFromPrevious || 0, stop.expectedDwellTime || 60]
        );
      }

      await client.query('COMMIT');
      return route;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Update route
  static async updateRoute(
    routeId: string,
    name?: string,
    description?: string,
    fromLocation?: string,
    toLocation?: string,
    departureTime?: string,
    reachingTime?: string,
    stops?: any[]
  ): Promise<any> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update route details
      const routeResult = await client.query(
        `UPDATE routes
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             from_location = COALESCE($3, from_location),
             to_location = COALESCE($4, to_location),
             departure_time = COALESCE($5, departure_time),
             reaching_time = COALESCE($6, reaching_time)
         WHERE id = $7
         RETURNING id, name, description, from_location, to_location, departure_time, reaching_time`,
        [name, description, fromLocation, toLocation, departureTime, reachingTime, routeId]
      );

      if (routeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Update stops if provided
      if (stops && stops.length > 0) {
        // Delete existing stops
        await client.query('DELETE FROM route_stops WHERE route_id = $1', [routeId]);

        // Add new stops
        for (let i = 0; i < stops.length; i++) {
          const stop = stops[i];
          await client.query(
            `INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_previous_km, expected_dwell_time_seconds)
             VALUES ($1, $2, $3, $4, $5)`,
            [routeId, stop.stopId || stop, i + 1, stop.distanceFromPrevious || 0, stop.expectedDwellTime || 60]
          );
        }
      }

      await client.query('COMMIT');
      return routeResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete route
  static async deleteRoute(routeId: string): Promise<void> {
    await pool.query('DELETE FROM routes WHERE id = $1', [routeId]);
  }

  // Create new stop
  static async createStop(name: string, latitude: number, longitude: number): Promise<any> {
    const qrCode = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await pool.query(
      `INSERT INTO bus_stops (name, location, qr_code)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4)
       RETURNING id, name, ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude, qr_code as "qrCode", created_at as "createdAt"`,
      [name, longitude, latitude, qrCode]
    );

    return result.rows[0];
  }

  // Update stop
  static async updateStop(stopId: string, name?: string, latitude?: number, longitude?: number): Promise<any> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (latitude !== undefined && longitude !== undefined) {
      updates.push(`location = ST_SetSRID(ST_MakePoint($${paramCount++}, $${paramCount++}), 4326)`);
      values.push(longitude, latitude);
    }

    if (updates.length === 0) {
      return null;
    }

    values.push(stopId);

    const result = await pool.query(
      `UPDATE bus_stops
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude, qr_code as "qrCode"`,
      values
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Delete stop
  static async deleteStop(stopId: string): Promise<void> {
    await pool.query('DELETE FROM bus_stops WHERE id = $1', [stopId]);
  }

  // Create new route
  static async createRoute(
    name: string,
    description: string,
    busId: string | null,
    fromLocation: string,
    toLocation: string,
    departureTime: string,
    reachingTime: string,
    stops: any[],
    serviceStartTime?: string,
    serviceEndTime?: string,
    baseFare?: number,
    farePerKm?: number
  ): Promise<any> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert route
      const routeResult = await client.query(
        `INSERT INTO routes (
          name, description, bus_id, from_location, to_location,
          departure_time, reaching_time, service_start_time, service_end_time,
          base_fare, fare_per_km, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
        RETURNING id, name, description, bus_id, from_location, to_location, departure_time, reaching_time`,
        [name, description, busId, fromLocation, toLocation, departureTime, reachingTime,
         serviceStartTime || '06:00:00', serviceEndTime || '22:00:00',
         baseFare || 0, farePerKm || 0]
      );
      
      const route = routeResult.rows[0];
      
      // Insert route stops
      for (let i = 0; i < stops.length; i++) {
        await client.query(
          `INSERT INTO route_stops (route_id, stop_id, stop_sequence, expected_dwell_time_seconds, distance_from_previous_km)
           VALUES ($1, $2, $3, $4, $5)`,
          [route.id, stops[i].stopId, i + 1, stops[i].expectedDwellTime || 60, stops[i].distanceFromPrevious || 0]
        );
      }
      
      await client.query('COMMIT');
      return route;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Update route
  static async updateRoute(
    routeId: string,
    name: string,
    description: string,
    busId: string | null,
    fromLocation: string,
    toLocation: string,
    departureTime: string,
    reachingTime: string,
    stops?: any[]
  ): Promise<any> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update route
      const routeResult = await client.query(
        `UPDATE routes 
         SET name = $1, description = $2, bus_id = $3, from_location = $4, to_location = $5,
             departure_time = $6, reaching_time = $7
         WHERE id = $8
         RETURNING id, name, description, bus_id, from_location, to_location, departure_time, reaching_time`,
        [name, description, busId, fromLocation, toLocation, departureTime, reachingTime, routeId]
      );
      
      if (routeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      
      const route = routeResult.rows[0];
      
      // Update stops if provided
      if (stops && stops.length > 0) {
        // Delete existing stops
        await client.query('DELETE FROM route_stops WHERE route_id = $1', [routeId]);
        
        // Insert new stops
        for (let i = 0; i < stops.length; i++) {
          await client.query(
            `INSERT INTO route_stops (route_id, stop_id, stop_sequence, expected_dwell_time_seconds, distance_from_previous_km)
             VALUES ($1, $2, $3, $4, $5)`,
            [routeId, stops[i].stopId, i + 1, stops[i].expectedDwellTime || 60, stops[i].distanceFromPrevious || 0]
          );
        }
      }
      
      await client.query('COMMIT');
      return route;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete route
  static async deleteRoute(routeId: string): Promise<void> {
    await pool.query('DELETE FROM routes WHERE id = $1', [routeId]);
  }
}
