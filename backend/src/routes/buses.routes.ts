import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Get all buses (admin and driver can access)
router.get('/', authenticateToken, requireRole(['admin', 'driver']), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.id,
        b.bus_number as "busNumber",
        b.bus_number as "busName",
        b.registration_number as "registrationNumber",
        b.capacity,
        b.owner_id as "ownerId",
        o.name as "ownerName",
        b.route_id as "routeId",
        r.name as "routeName",
        b.status,
        b.created_at as "createdAt"
      FROM buses b
      LEFT JOIN routes r ON b.route_id = r.id
      LEFT JOIN owners o ON b.owner_id = o.id
      ORDER BY b.created_at DESC
    `);

    res.json({ buses: result.rows });
  } catch (error) {
    console.error('Error fetching buses:', error);
    res.status(500).json({ error: 'Failed to fetch buses' });
  }
});

// Get bus by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        b.id,
        b.bus_number as "busNumber",
        b.registration_number as "registrationNumber",
        b.capacity,
        b.route_id as "routeId",
        r.name as "routeName",
        b.status,
        b.created_at as "createdAt"
      FROM buses b
      LEFT JOIN routes r ON b.route_id = r.id
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    res.json({ bus: result.rows[0] });
  } catch (error) {
    console.error('Error fetching bus:', error);
    res.status(500).json({ error: 'Failed to fetch bus' });
  }
});

// Create new bus (admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { busNumber, registrationNumber, ownerId } = req.body;

    // Validate required fields
    if (!busNumber || !registrationNumber) {
      return res.status(400).json({ error: 'Bus number and registration number are required' });
    }

    if (!ownerId) {
      return res.status(400).json({ error: 'Owner is required' });
    }

    // Check if bus number already exists
    const existing = await pool.query(
      'SELECT id FROM buses WHERE bus_number = $1',
      [busNumber]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Bus number already exists' });
    }

    // Insert new bus
    const result = await pool.query(`
      INSERT INTO buses (bus_number, registration_number, owner_id, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING 
        id,
        bus_number as "busNumber",
        bus_number as "busName",
        registration_number as "registrationNumber",
        owner_id as "ownerId",
        status,
        created_at as "createdAt"
    `, [busNumber, registrationNumber, ownerId]);

    // Get owner name
    const ownerResult = await pool.query('SELECT name FROM owners WHERE id = $1', [ownerId]);
    const bus = result.rows[0];
    bus.ownerName = ownerResult.rows[0]?.name || '';

    res.status(201).json({ 
      message: 'Bus created successfully',
      bus
    });
  } catch (error: any) {
    console.error('Error creating bus:', error);
    res.status(500).json({ error: error.message || 'Failed to create bus' });
  }
});

// Update bus (admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { busNumber, registrationNumber, ownerId } = req.body;

    // Check if bus exists
    const existing = await pool.query('SELECT id FROM buses WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    // Update bus
    const result = await pool.query(`
      UPDATE buses
      SET 
        bus_number = COALESCE($1, bus_number),
        registration_number = COALESCE($2, registration_number),
        owner_id = COALESCE($3, owner_id),
        updated_at = NOW()
      WHERE id = $4
      RETURNING 
        id,
        bus_number as "busNumber",
        bus_number as "busName",
        registration_number as "registrationNumber",
        owner_id as "ownerId",
        updated_at as "updatedAt"
    `, [busNumber, registrationNumber, ownerId, id]);

    // Get owner name
    const ownerResult = await pool.query('SELECT name FROM owners WHERE id = $1', [result.rows[0].ownerId]);
    const bus = result.rows[0];
    bus.ownerName = ownerResult.rows[0]?.name || '';

    res.json({ 
      message: 'Bus updated successfully',
      bus
    });
  } catch (error) {
    console.error('Error updating bus:', error);
    res.status(500).json({ error: 'Failed to update bus' });
  }
});

// Delete bus (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if bus exists
    const existing = await pool.query('SELECT id FROM buses WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    // Delete bus
    await pool.query('DELETE FROM buses WHERE id = $1', [id]);

    res.json({ message: 'Bus deleted successfully' });
  } catch (error) {
    console.error('Error deleting bus:', error);
    res.status(500).json({ error: 'Failed to delete bus' });
  }
});

// Get buses by route (public)
router.get('/route/:routeId', async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        id,
        bus_number as "busNumber",
        registration_number as "registrationNumber",
        capacity,
        status
      FROM buses
      WHERE route_id = $1 AND status = 'active'
      ORDER BY bus_number
    `, [routeId]);

    res.json({ buses: result.rows });
  } catch (error) {
    console.error('Error fetching buses by route:', error);
    res.status(500).json({ error: 'Failed to fetch buses' });
  }
});

export default router;
