import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/database';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Get all owners (admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id,
        o.name,
        o.email,
        o.phone,
        o.address,
        o.created_at as "createdAt",
        COUNT(b.id) as "busCount"
      FROM owners o
      LEFT JOIN buses b ON b.owner_id = o.id
      GROUP BY o.id, o.name, o.email, o.phone, o.address, o.created_at
      ORDER BY o.created_at DESC
    `);

    res.json({ owners: result.rows });
  } catch (error) {
    console.error('Error fetching owners:', error);
    res.status(500).json({ error: 'Failed to fetch owners' });
  }
});

// Get owner by ID
router.get('/:id', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        id,
        name,
        email,
        phone,
        address,
        created_at as "createdAt"
      FROM owners
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    // Get buses owned by this owner
    const busesResult = await pool.query(`
      SELECT 
        b.id,
        b.bus_number as "busNumber",
        b.registration_number as "registrationNumber",
        r.name as "routeName"
      FROM buses b
      LEFT JOIN routes r ON b.route_id = r.id
      WHERE b.owner_id = $1
    `, [id]);

    res.json({ 
      owner: result.rows[0],
      buses: busesResult.rows
    });
  } catch (error) {
    console.error('Error fetching owner:', error);
    res.status(500).json({ error: 'Failed to fetch owner' });
  }
});

// Create new owner (admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { name, email, phone, address, password } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    // Validate email and password if provided
    if (email && !password) {
      return res.status(400).json({ error: 'Password is required when email is provided' });
    }

    // Check if email already exists
    if (email) {
      const existingInOwners = await pool.query(
        'SELECT id FROM owners WHERE email = $1',
        [email]
      );
      const existingInUsers = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingInOwners.rows.length > 0 || existingInUsers.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Insert new owner
    const result = await pool.query(`
      INSERT INTO owners (name, email, phone, address, password, role)
      VALUES ($1, $2, $3, $4, $5, 'owner')
      RETURNING 
        id,
        name,
        email,
        phone,
        address,
        created_at as "createdAt"
    `, [name, email || null, phone, address || null, hashedPassword]);

    res.status(201).json({ 
      message: 'Owner created successfully',
      owner: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating owner:', error);
    res.status(500).json({ error: 'Failed to create owner' });
  }
});

// Update owner (admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, password } = req.body;

    // Check if owner exists
    const existing = await pool.query('SELECT id FROM owners WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Update owner
    const result = await pool.query(`
      UPDATE owners
      SET 
        name = COALESCE($1, name),
        email = $2,
        phone = COALESCE($3, phone),
        address = $4,
        password = COALESCE($5, password),
        role = 'owner',
        updated_at = NOW()
      WHERE id = $6
      RETURNING 
        id,
        name,
        email,
        phone,
        address,
        updated_at as "updatedAt"
    `, [name, email || null, phone, address || null, hashedPassword, id]);

    res.json({ 
      message: 'Owner updated successfully',
      owner: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating owner:', error);
    res.status(500).json({ error: 'Failed to update owner' });
  }
});

// Delete owner (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if owner exists
    const existing = await pool.query('SELECT id FROM owners WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    // Check if owner has buses
    const buses = await pool.query('SELECT id FROM buses WHERE owner_id = $1', [id]);
    if (buses.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete owner with assigned buses. Please reassign or delete buses first.' 
      });
    }

    // Delete owner
    await pool.query('DELETE FROM owners WHERE id = $1', [id]);

    res.json({ message: 'Owner deleted successfully' });
  } catch (error) {
    console.error('Error deleting owner:', error);
    res.status(500).json({ error: 'Failed to delete owner' });
  }
});

export default router;
