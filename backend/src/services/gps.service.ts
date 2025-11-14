import { pool } from '../config/database';

interface LocationData {
  busId: string;
  driverId: string;
  routeId?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  altitude?: number;
}

interface ETAResult {
  stopId: string;
  stopName: string;
  predictedArrival: Date;
  estimatedMinutes: number;
  distanceKm: number;
  confidenceScore: number;
}

export class GPSService {
  // Update bus location
  static async updateBusLocation(data: LocationData): Promise<any> {
    const {
      busId,
      driverId,
      routeId,
      latitude,
      longitude,
      speed,
      heading,
      accuracy,
      altitude
    } = data;

    const result = await pool.query(
      `INSERT INTO bus_locations (
        bus_id, driver_id, route_id, location, latitude, longitude,
        speed, heading, accuracy, altitude, recorded_at
      )
      VALUES (
        $1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326), $4, $5,
        $6, $7, $8, $9, NOW()
      )
      RETURNING id, bus_id as "busId", latitude, longitude, speed, heading, recorded_at as "recordedAt"`,
      [busId, driverId, routeId, latitude, longitude, speed, heading, accuracy, altitude]
    );

    return result.rows[0];
  }

  // Get current location of a bus
  static async getCurrentBusLocation(busId: string): Promise<any> {
    const result = await pool.query(
      `SELECT 
        id,
        bus_id as "busId",
        driver_id as "driverId",
        route_id as "routeId",
        latitude,
        longitude,
        speed,
        heading,
        accuracy,
        recorded_at as "recordedAt"
       FROM bus_locations
       WHERE bus_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [busId]
    );

    return result.rows[0] || null;
  }

  // Get all active buses with their current locations
  static async getAllActiveBusLocations(): Promise<any[]> {
    const result = await pool.query(
      `SELECT DISTINCT ON (bl.bus_id)
        bl.id,
        bl.bus_id as "busId",
        b.bus_number as "busNumber",
        bl.driver_id as "driverId",
        bl.route_id as "routeId",
        r.name as "routeName",
        bl.latitude,
        bl.longitude,
        bl.speed,
        bl.heading,
        bl.recorded_at as "recordedAt"
       FROM bus_locations bl
       JOIN buses b ON bl.bus_id = b.id
       LEFT JOIN routes r ON bl.route_id = r.id
       WHERE bl.recorded_at > NOW() - INTERVAL '5 minutes'
       ORDER BY bl.bus_id, bl.recorded_at DESC`
    );

    return result.rows;
  }

  // Calculate distance between two points (Haversine formula)
  static calculateDistance(
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
    const distance = R * c;
    
    return distance;
  }

  private static toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Calculate ETA for all upcoming stops on a route
  static async calculateETAForRoute(busId: string, routeId: string): Promise<ETAResult[]> {
    // Get current bus location
    const busLocation = await this.getCurrentBusLocation(busId);
    if (!busLocation) {
      throw new Error('Bus location not found');
    }

    // Get all stops for this route
    const stopsResult = await pool.query(
      `SELECT 
        s.id,
        s.name,
        ST_Y(s.location::geometry) as latitude,
        ST_X(s.location::geometry) as longitude,
        rs.stop_sequence
       FROM route_stops rs
       JOIN bus_stops s ON rs.stop_id = s.id
       WHERE rs.route_id = $1
       ORDER BY rs.stop_sequence ASC`,
      [routeId]
    );

    const stops = stopsResult.rows;
    const etas: ETAResult[] = [];
    let cumulativeTime = 0;

    // Current speed or default to 30 km/h
    const currentSpeed = busLocation.speed || 30;

    for (const stop of stops) {
      // Calculate distance from current bus location to this stop
      const distance = this.calculateDistance(
        busLocation.latitude,
        busLocation.longitude,
        stop.latitude,
        stop.longitude
      );

      // Get historical average speed for this segment (if available)
      const historicalSpeed = await this.getHistoricalSpeed(routeId, stop.id);
      const effectiveSpeed = historicalSpeed || currentSpeed;

      // Calculate time to reach this stop
      const timeInHours = distance / effectiveSpeed;
      const timeInMinutes = timeInHours * 60;

      // Add dwell time (1 minute per stop)
      const dwellTime = 1;
      cumulativeTime += timeInMinutes + dwellTime;

      // Calculate predicted arrival time
      const predictedArrival = new Date(Date.now() + cumulativeTime * 60000);

      // Confidence score based on data quality
      const confidenceScore = this.calculateConfidenceScore(
        busLocation.accuracy,
        historicalSpeed !== null,
        distance
      );

      etas.push({
        stopId: stop.id,
        stopName: stop.name,
        predictedArrival,
        estimatedMinutes: Math.round(cumulativeTime),
        distanceKm: parseFloat(distance.toFixed(2)),
        confidenceScore
      });

      // Save ETA prediction to database
      await this.saveETAPrediction({
        busId,
        routeId,
        stopId: stop.id,
        predictedArrival,
        estimatedMinutes: Math.round(cumulativeTime),
        distanceKm: distance,
        confidenceScore,
        calculationMethod: historicalSpeed ? 'hybrid' : 'gps_based'
      });
    }

    return etas;
  }

  // Get historical average speed for a route segment
  private static async getHistoricalSpeed(routeId: string, stopId: string): Promise<number | null> {
    const hour = new Date().getHours();
    let timeOfDay = 'afternoon';
    
    if (hour >= 6 && hour < 10) timeOfDay = 'morning_peak';
    else if (hour >= 17 && hour < 20) timeOfDay = 'evening_peak';
    else if (hour >= 22 || hour < 6) timeOfDay = 'night';

    const result = await pool.query(
      `SELECT avg_speed_kmh
       FROM route_segment_speeds
       WHERE route_id = $1
         AND to_stop_id = $2
         AND time_of_day = $3
       LIMIT 1`,
      [routeId, stopId, timeOfDay]
    );

    return result.rows[0]?.avg_speed_kmh || null;
  }

  // Calculate confidence score for ETA prediction
  private static calculateConfidenceScore(
    accuracy: number | null,
    hasHistoricalData: boolean,
    distance: number
  ): number {
    let score = 0.5; // Base score

    // Better accuracy = higher confidence
    if (accuracy) {
      if (accuracy < 10) score += 0.3;
      else if (accuracy < 50) score += 0.2;
      else score += 0.1;
    }

    // Historical data increases confidence
    if (hasHistoricalData) score += 0.15;

    // Closer stops = higher confidence
    if (distance < 1) score += 0.05;
    else if (distance > 10) score -= 0.1;

    return Math.min(Math.max(score, 0), 1); // Clamp between 0 and 1
  }

  // Save ETA prediction to database
  private static async saveETAPrediction(data: {
    busId: string;
    routeId: string;
    stopId: string;
    predictedArrival: Date;
    estimatedMinutes: number;
    distanceKm: number;
    confidenceScore: number;
    calculationMethod: string;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO eta_predictions (
        bus_id, route_id, stop_id, predicted_arrival, estimated_minutes,
        distance_km, confidence_score, calculation_method, calculated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        data.busId,
        data.routeId,
        data.stopId,
        data.predictedArrival,
        data.estimatedMinutes,
        data.distanceKm,
        data.confidenceScore,
        data.calculationMethod
      ]
    );
  }

  // Get ETA for a specific stop
  static async getETAForStop(stopId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        ep.id,
        ep.bus_id as "busId",
        b.bus_number as "busNumber",
        ep.route_id as "routeId",
        r.name as "routeName",
        ep.predicted_arrival as "predictedArrival",
        ep.estimated_minutes as "estimatedMinutes",
        ep.distance_km as "distanceKm",
        ep.confidence_score as "confidenceScore",
        ep.calculation_method as "calculationMethod",
        ep.calculated_at as "calculatedAt"
       FROM eta_predictions ep
       JOIN buses b ON ep.bus_id = b.id
       JOIN routes r ON ep.route_id = r.id
       WHERE ep.stop_id = $1
         AND ep.calculated_at > NOW() - INTERVAL '2 minutes'
         AND ep.predicted_arrival > NOW()
       ORDER BY ep.predicted_arrival ASC`,
      [stopId]
    );

    return result.rows;
  }

  // Record actual arrival at a stop
  static async recordStopArrival(data: {
    busId: string;
    routeId: string;
    stopId: string;
    scheduledArrival?: Date;
    actualArrival: Date;
  }): Promise<void> {
    const delayMinutes = data.scheduledArrival
      ? Math.round((data.actualArrival.getTime() - data.scheduledArrival.getTime()) / 60000)
      : null;

    await pool.query(
      `INSERT INTO stop_arrivals (
        bus_id, route_id, stop_id, scheduled_arrival, actual_arrival, delay_minutes
      )
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        data.busId,
        data.routeId,
        data.stopId,
        data.scheduledArrival,
        data.actualArrival,
        delayMinutes
      ]
    );
  }

  // Record departure from a stop
  static async recordStopDeparture(busId: string, stopId: string): Promise<void> {
    await pool.query(
      `UPDATE stop_arrivals
       SET actual_departure = NOW(),
           dwell_time_seconds = EXTRACT(EPOCH FROM (NOW() - actual_arrival))
       WHERE bus_id = $1
         AND stop_id = $2
         AND actual_departure IS NULL
       ORDER BY actual_arrival DESC
       LIMIT 1`,
      [busId, stopId]
    );
  }

  // Get buses near a location
  static async getBusesNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): Promise<any[]> {
    const result = await pool.query(
      `SELECT DISTINCT ON (bl.bus_id)
        bl.id,
        bl.bus_id as "busId",
        b.bus_number as "busNumber",
        bl.route_id as "routeId",
        r.name as "routeName",
        bl.latitude,
        bl.longitude,
        bl.speed,
        bl.heading,
        ST_Distance(
          bl.location,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)
        ) / 1000 as "distanceKm",
        bl.recorded_at as "recordedAt"
       FROM bus_locations bl
       JOIN buses b ON bl.bus_id = b.id
       LEFT JOIN routes r ON bl.route_id = r.id
       WHERE bl.recorded_at > NOW() - INTERVAL '5 minutes'
         AND ST_DWithin(
           bl.location,
           ST_SetSRID(ST_MakePoint($2, $1), 4326),
           $3 * 1000
         )
       ORDER BY bl.bus_id, bl.recorded_at DESC`,
      [latitude, longitude, radiusKm]
    );

    return result.rows;
  }

  // Update historical speed data
  static async updateHistoricalSpeed(
    routeId: string,
    fromStopId: string,
    toStopId: string,
    actualSpeed: number,
    durationSeconds: number
  ): Promise<void> {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    let timeOfDay = 'afternoon';
    
    if (hour >= 6 && hour < 10) timeOfDay = 'morning_peak';
    else if (hour >= 17 && hour < 20) timeOfDay = 'evening_peak';
    else if (hour >= 22 || hour < 6) timeOfDay = 'night';

    // Check if record exists
    const existing = await pool.query(
      `SELECT id, avg_speed_kmh, avg_duration_seconds, sample_count
       FROM route_segment_speeds
       WHERE route_id = $1
         AND from_stop_id = $2
         AND to_stop_id = $3
         AND time_of_day = $4
         AND day_of_week = $5`,
      [routeId, fromStopId, toStopId, timeOfDay, dayOfWeek]
    );

    if (existing.rows.length > 0) {
      // Update existing record with moving average
      const record = existing.rows[0];
      const newSampleCount = record.sample_count + 1;
      const newAvgSpeed = (record.avg_speed_kmh * record.sample_count + actualSpeed) / newSampleCount;
      const newAvgDuration = (record.avg_duration_seconds * record.sample_count + durationSeconds) / newSampleCount;

      await pool.query(
        `UPDATE route_segment_speeds
         SET avg_speed_kmh = $1,
             avg_duration_seconds = $2,
             sample_count = $3,
             last_updated = NOW()
         WHERE id = $4`,
        [newAvgSpeed, newAvgDuration, newSampleCount, record.id]
      );
    } else {
      // Insert new record
      await pool.query(
        `INSERT INTO route_segment_speeds (
          route_id, from_stop_id, to_stop_id, avg_speed_kmh, avg_duration_seconds,
          time_of_day, day_of_week, sample_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
        [routeId, fromStopId, toStopId, actualSpeed, durationSeconds, timeOfDay, dayOfWeek]
      );
    }
  }
}
