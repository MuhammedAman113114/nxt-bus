import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Get all trips for a specific date
router.get('/daily/:date', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    
    const result = await pool.query(`
      SELECT 
        t.id,
        t.trip_name,
        t.scheduled_start_time as "scheduledStartTime",
        t.scheduled_end_time as "scheduledEndTime",
        t.actual_start_time as "actualStartTime",
        t.actual_end_time as "actualEndTime",
        t.trip_date as "tripDate",
        t.status,
        b.id as "busId",
        b.bus_number as "busNumber",
        b.registration_number as "registrationNumber",
        r.id as "routeId",
        r.name as "routeName",
        r.description as "routeDescription",
        da.driver_id as "driverId",
        u.email as "driverEmail"
      FROM trips t
      JOIN buses b ON t.bus_id = b.id
      JOIN routes r ON t.route_id = r.id
      LEFT JOIN driver_assignments da ON t.id = da.trip_id AND da.status IN ('assigned', 'accepted', 'started')
      LEFT JOIN users u ON da.driver_id = u.id
      WHERE t.trip_date = $1
      ORDER BY t.scheduled_start_time
    `, [date]);

    res.json({ trips: result.rows });
  } catch (error) {
    console.error('Error fetching daily trips:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// Get trips for a specific driver
router.get('/driver/:driverId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { date } = req.query;
    
    let query = `
      SELECT 
        t.id,
        t.trip_name,
        t.scheduled_start_time as "scheduledStartTime",
        t.scheduled_end_time as "scheduledEndTime",
        t.actual_start_time as "actualStartTime",
        t.actual_end_time as "actualEndTime",
        t.trip_date as "tripDate",
        t.status,
        b.bus_number as "busNumber",
        b.registration_number as "registrationNumber",
        r.name as "routeName",
        r.description as "routeDescription",
        da.status as "assignmentStatus",
        da.assigned_at as "assignedAt"
      FROM driver_assignments da
      JOIN trips t ON da.trip_id = t.id
      JOIN buses b ON t.bus_id = b.id
      JOIN routes r ON t.route_id = r.id
      WHERE da.driver_id = $1
    `;
    
    const params: any[] = [driverId];
    
    if (date) {
      query += ` AND t.trip_date = $2`;
      params.push(date);
    }
    
    query += ` ORDER BY t.trip_date, t.scheduled_start_time`;
    
    const result = await pool.query(query, params);

    res.json({ trips: result.rows });
  } catch (error) {
    console.error('Error fetching driver trips:', error);
    res.status(500).json({ error: 'Failed to fetch driver trips' });
  }
});

// Get trip by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        t.id,
        t.trip_name,
        t.scheduled_start_time as "scheduledStartTime",
        t.scheduled_end_time as "scheduledEndTime",
        t.actual_start_time as "actualStartTime",
        t.actual_end_time as "actualEndTime",
        t.trip_date as "tripDate",
        t.status,
        t.created_at as "createdAt",
        b.id as "busId",
        b.bus_number as "busNumber",
        b.registration_number as "registrationNumber",
        r.id as "routeId",
        r.name as "routeName",
        r.description as "routeDescription"
      FROM trips t
      JOIN buses b ON t.bus_id = b.id
      JOIN routes r ON t.route_id = r.id
      WHERE t.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Get assigned driver
    const driverResult = await pool.query(`
      SELECT 
        da.id as "assignmentId",
        da.status as "assignmentStatus",
        da.assigned_at as "assignedAt",
        u.id as "driverId",
        u.email as "driverEmail",
        u.driver_license as "driverLicense",
        u.driver_phone as "driverPhone"
      FROM driver_assignments da
      JOIN users u ON da.driver_id = u.id
      WHERE da.trip_id = $1 AND da.status IN ('assigned', 'accepted', 'started')
      LIMIT 1
    `, [id]);

    const trip = result.rows[0];
    trip.driver = driverResult.rows[0] || null;

    res.json({ trip });
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

// Start a trip
router.put('/:id/start', authenticateToken, requireRole(['driver', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE trips
      SET 
        status = 'in_progress',
        actual_start_time = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND status = 'scheduled'
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found or already started' });
    }

    res.json({ 
      message: 'Trip started successfully',
      trip: result.rows[0]
    });
  } catch (error) {
    console.error('Error starting trip:', error);
    res.status(500).json({ error: 'Failed to start trip' });
  }
});

// End a trip
router.put('/:id/end', authenticateToken, requireRole(['driver', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE trips
      SET 
        status = 'completed',
        actual_end_time = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND status = 'in_progress'
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found or not in progress' });
    }

    res.json({ 
      message: 'Trip completed successfully',
      trip: result.rows[0]
    });
  } catch (error) {
    console.error('Error ending trip:', error);
    res.status(500).json({ error: 'Failed to end trip' });
  }
});

// Assign driver to trip (admin only)
router.post('/:id/assign-driver', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({ error: 'Driver ID is required' });
    }

    // Check if trip exists
    const tripCheck = await pool.query('SELECT id FROM trips WHERE id = $1', [id]);
    if (tripCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if driver exists and has driver role
    const driverCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND role = $2',
      [driverId, 'driver']
    );
    if (driverCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Create assignment
    const result = await pool.query(`
      INSERT INTO driver_assignments (trip_id, driver_id, assigned_by, status)
      VALUES ($1, $2, $3, 'assigned')
      ON CONFLICT (trip_id, driver_id) 
      DO UPDATE SET status = 'assigned', assigned_at = NOW()
      RETURNING *
    `, [id, driverId, req.user?.userId]);

    res.json({ 
      message: 'Driver assigned successfully',
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ error: 'Failed to assign driver' });
  }
});

// Get all trip schedules (admin only)
router.get('/schedules/all', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        ts.id,
        ts.schedule_name as "scheduleName",
        ts.start_time as "startTime",
        ts.end_time as "endTime",
        ts.days_of_week as "daysOfWeek",
        ts.valid_from as "validFrom",
        ts.valid_until as "validUntil",
        ts.is_active as "isActive",
        ts.created_at as "createdAt",
        b.id as "busId",
        b.bus_number as "busNumber",
        r.id as "routeId",
        r.name as "routeName"
      FROM trip_schedules ts
      JOIN buses b ON ts.bus_id = b.id
      JOIN routes r ON ts.route_id = r.id
      ORDER BY ts.created_at DESC
    `);

    res.json({ schedules: result.rows });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Create trip schedule (admin only)
router.post('/schedules', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { busId, routeId, scheduleName, startTime, endTime, daysOfWeek, validFrom, validUntil } = req.body;

    if (!busId || !routeId || !scheduleName || !startTime || !daysOfWeek || !validFrom) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(`
      INSERT INTO trip_schedules (
        bus_id, route_id, schedule_name, start_time, end_time, 
        days_of_week, valid_from, valid_until, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING *
    `, [busId, routeId, scheduleName, startTime, endTime, daysOfWeek, validFrom, validUntil]);

    res.status(201).json({ 
      message: 'Schedule created successfully',
      schedule: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Generate trips from schedules for a date range (admin only)
router.post('/generate', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Get active schedules
    const schedules = await pool.query(`
      SELECT * FROM trip_schedules 
      WHERE is_active = true 
      AND valid_from <= $2
      AND (valid_until IS NULL OR valid_until >= $1)
    `, [startDate, endDate]);

    let generatedCount = 0;

    for (const schedule of schedules.rows) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay(); // 0=Sunday, 6=Saturday

        if (schedule.days_of_week.includes(dayOfWeek)) {
          try {
            await pool.query(`
              INSERT INTO trips (
                bus_id, route_id, trip_name, scheduled_start_time, 
                scheduled_end_time, trip_date, status
              )
              VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
              ON CONFLICT DO NOTHING
            `, [
              schedule.bus_id,
              schedule.route_id,
              schedule.schedule_name,
              schedule.start_time,
              schedule.end_time,
              d.toISOString().split('T')[0]
            ]);
            generatedCount++;
          } catch (err) {
            // Skip duplicates
          }
        }
      }
    }

    res.json({ 
      message: `Generated ${generatedCount} trips`,
      count: generatedCount
    });
  } catch (error) {
    console.error('Error generating trips:', error);
    res.status(500).json({ error: 'Failed to generate trips' });
  }
});

export default router;
