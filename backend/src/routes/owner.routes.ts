import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Get owner's buses with assigned drivers
router.get('/buses', authenticateToken, requireRole(['owner']), async (req: Request, res: Response) => {
  try {
    const ownerId = req.user?.userId;

    const result = await pool.query(`
      SELECT 
        b.id,
        b.bus_number as "busName",
        b.registration_number as "registrationNumber",
        b.status,
        b.created_at as "createdAt",
        r.name as "routeName",
        COALESCE(
          json_agg(
            json_build_object(
              'id', dba.id,
              'driverId', u.id,
              'driverEmail', u.email,
              'status', dba.status
            )
          ) FILTER (WHERE dba.id IS NOT NULL AND dba.status = 'active'),
          '[]'
        ) as "assignedDrivers"
      FROM buses b
      LEFT JOIN routes r ON b.id = r.bus_id
      LEFT JOIN driver_bus_assignments_new dba ON b.id = dba.bus_id AND dba.status = 'active'
      LEFT JOIN users u ON dba.driver_id = u.id
      WHERE b.owner_id = $1
      GROUP BY b.id, b.bus_number, b.registration_number, b.status, b.created_at, r.name
      ORDER BY b.created_at DESC
    `, [ownerId]);

    res.json({ buses: result.rows });
  } catch (error) {
    console.error('Error fetching owner buses:', error);
    res.status(500).json({ error: 'Failed to fetch buses' });
  }
});

// Get all available drivers
router.get('/drivers', authenticateToken, requireRole(['owner']), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.created_at as "createdAt",
        COUNT(dba.id) FILTER (WHERE dba.status = 'active') as "assignedBusesCount"
      FROM users u
      LEFT JOIN driver_bus_assignments_new dba ON u.id = dba.driver_id AND dba.status = 'active'
      WHERE u.role = 'driver'
      GROUP BY u.id, u.email, u.created_at
      ORDER BY u.email
    `);

    res.json({ drivers: result.rows });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Assign driver to bus
router.post('/assign-driver', authenticateToken, requireRole(['owner']), async (req: Request, res: Response) => {
  try {
    const ownerId = req.user?.userId;
    const { busId, driverId } = req.body;

    if (!busId || !driverId) {
      return res.status(400).json({ error: 'Bus ID and Driver ID are required' });
    }

    // Verify bus belongs to owner
    const busCheck = await pool.query(
      'SELECT id FROM buses WHERE id = $1 AND owner_id = $2',
      [busId, ownerId]
    );

    if (busCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Bus not found or access denied' });
    }

    // Verify driver exists
    const driverCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND role = $2',
      [driverId, 'driver']
    );

    if (driverCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Check if assignment already exists
    const existingAssignment = await pool.query(
      'SELECT id FROM driver_bus_assignments_new WHERE bus_id = $1 AND driver_id = $2 AND status = $3',
      [busId, driverId, 'active']
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({ error: 'Driver is already assigned to this bus' });
    }

    // Create new assignment using DriverAssignmentService
    const { DriverAssignmentService } = require('../services/driver-assignment.service');
    await DriverAssignmentService.assignDriverToBus(
      driverId,
      busId,
      ownerId,
      false, // isPrimary
      true,  // canSwitchToSameName
      'Assigned by owner'
    );

    res.json({ message: 'Driver assigned successfully' });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ error: 'Failed to assign driver' });
  }
});

// Unassign driver from bus
router.delete('/assign-driver/:assignmentId', authenticateToken, requireRole(['owner']), async (req: Request, res: Response) => {
  try {
    const ownerId = req.user?.userId;
    const { assignmentId } = req.params;

    // Verify assignment belongs to owner's bus
    const assignmentCheck = await pool.query(`
      SELECT dba.id, dba.driver_id, dba.bus_id
      FROM driver_bus_assignments_new dba
      JOIN buses b ON dba.bus_id = b.id
      WHERE dba.id = $1 AND b.owner_id = $2
    `, [assignmentId, ownerId]);

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Assignment not found or access denied' });
    }

    const { driver_id, bus_id } = assignmentCheck.rows[0];

    // Update assignment status to inactive using service
    const { DriverAssignmentService } = require('../services/driver-assignment.service');
    await DriverAssignmentService.unassignDriverFromBus(driver_id, bus_id);

    res.json({ message: 'Driver unassigned successfully' });
  } catch (error) {
    console.error('Error unassigning driver:', error);
    res.status(500).json({ error: 'Failed to unassign driver' });
  }
});

// Get owner analytics
router.get('/analytics', authenticateToken, requireRole(['owner']), async (req: Request, res: Response) => {
  try {
    const ownerId = req.user?.userId;

    const result = await pool.query(`
      SELECT 
        COUNT(*) as "totalBuses",
        COUNT(*) FILTER (WHERE status = 'active') as "activeBuses"
      FROM buses
      WHERE owner_id = $1
    `, [ownerId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;

