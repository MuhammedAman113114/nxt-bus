import { Router, Request, Response } from 'express';
import { RouteService } from '../services/route.service';
import { LocationService } from '../services/location.service';
import { pool } from '../config/database';

const router = Router();

// Get all routes
router.get('/', async (req: Request, res: Response) => {
  try {
    const routes = await RouteService.getAllRoutes();
    res.json({ routes });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

// Get route by ID with stops
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const route = await RouteService.getRoute(id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json({ route });
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});

// Get stops for a route
router.get('/:id/stops', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const route = await RouteService.getRoute(id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json({ stops: route.stops, totalDistance: route.totalDistance });
  } catch (error) {
    console.error('Error fetching route stops:', error);
    res.status(500).json({ error: 'Failed to fetch route stops' });
  }
});

// Get active buses on a route
router.get('/:id/buses', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const buses = await LocationService.getActiveBusLocations(id);

    res.json({ buses, count: buses.length });
  } catch (error) {
    console.error('Error fetching route buses:', error);
    res.status(500).json({ error: 'Failed to fetch buses on route' });
  }
});

// Get assigned drivers for a bus
router.get('/bus/:busId/drivers', async (req: Request, res: Response) => {
  try {
    const { busId } = req.params;
    
    const result = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.name,
        dba.is_primary as "isPrimary"
       FROM driver_bus_assignments_new dba
       JOIN users u ON dba.driver_id = u.id
       WHERE dba.bus_id = $1 AND dba.status = 'active'
       ORDER BY dba.is_primary DESC, u.name ASC`,
      [busId]
    );

    res.json({ drivers: result.rows });
  } catch (error) {
    console.error('Error fetching bus drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Create new route with service windows and stop details (admin only)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      description,
      busId,
      fromLocation,
      toLocation,
      departureTime,
      reachingTime,
      stops, 
      driverEmails,
      serviceStartTime, 
      serviceEndTime,
      baseFare,
      farePerKm 
    } = req.body;

    if (!name || !stops || stops.length < 2) {
      return res.status(400).json({ error: 'Route name and at least 2 stops are required' });
    }

    if (!fromLocation || !toLocation) {
      return res.status(400).json({ error: 'From and To locations are required' });
    }

    if (!departureTime || !reachingTime) {
      return res.status(400).json({ error: 'Departure and reaching times are required' });
    }

    // Validate each stop has required fields
    for (const stop of stops) {
      if (!stop.stopId) {
        return res.status(400).json({ error: 'Each stop must have a stopId' });
      }
      if (stop.expectedDwellTime === undefined) {
        stop.expectedDwellTime = 60; // Default 60 seconds
      }
    }

    const result = await RouteService.createRoute(
      name, 
      description,
      busId,
      fromLocation,
      toLocation,
      departureTime,
      reachingTime,
      stops,
      serviceStartTime,
      serviceEndTime,
      baseFare,
      farePerKm
    );

    // Assign drivers to the bus if emails provided
    if (driverEmails && driverEmails.length > 0 && busId) {
      const adminId = (req as any).user?.userId;
      const { DriverAssignmentService } = require('../services/driver-assignment.service');
      
      for (const email of driverEmails) {
        try {
          // Find driver by email
          const driverResult = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND role = $2',
            [email, 'driver']
          );

          if (driverResult.rows.length > 0) {
            const driverId = driverResult.rows[0].id;
            
            // Assign driver to bus
            await DriverAssignmentService.assignDriverToBus(
              driverId,
              busId,
              adminId,
              false, // isPrimary
              true,  // canSwitchToSameName
              `Assigned via route creation: ${name}`
            );
          }
        } catch (err) {
          console.error(`Failed to assign driver ${email}:`, err);
          // Continue with other drivers even if one fails
        }
      }
    }
    
    res.status(201).json({ message: 'Route created successfully', route: result });
  } catch (error: any) {
    console.error('Error creating route:', error);
    res.status(500).json({ error: error.message || 'Failed to create route' });
  }
});

// Update route (admin only)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description,
      busId,
      fromLocation,
      toLocation,
      departureTime,
      reachingTime,
      stops,
      driverEmails 
    } = req.body;

    const result = await RouteService.updateRoute(
      id, 
      name, 
      description,
      busId,
      fromLocation,
      toLocation,
      departureTime,
      reachingTime,
      stops
    );
    
    if (!result) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Update driver assignments if emails provided and bus changed
    if (driverEmails && busId) {
      const adminId = (req as any).user?.userId;
      const { DriverAssignmentService } = require('../services/driver-assignment.service');
      
      // Get current driver assignments for this bus
      const currentAssignments = await pool.query(
        `SELECT driver_id FROM driver_bus_assignments_new 
         WHERE bus_id = $1 AND status = 'active'`,
        [busId]
      );
      
      const currentDriverIds = currentAssignments.rows.map((r: any) => r.driver_id);
      
      // Find drivers by email
      const newDriverIds: string[] = [];
      for (const email of driverEmails) {
        try {
          const driverResult = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND role = $2',
            [email, 'driver']
          );

          if (driverResult.rows.length > 0) {
            const driverId = driverResult.rows[0].id;
            newDriverIds.push(driverId);
            
            // Assign driver if not already assigned
            if (!currentDriverIds.includes(driverId)) {
              await DriverAssignmentService.assignDriverToBus(
                driverId,
                busId,
                adminId,
                false,
                true,
                `Assigned via route update: ${name}`
              );
            }
          }
        } catch (err) {
          console.error(`Failed to assign driver ${email}:`, err);
        }
      }
      
      // Unassign drivers that are no longer in the list
      for (const currentDriverId of currentDriverIds) {
        if (!newDriverIds.includes(currentDriverId)) {
          try {
            await DriverAssignmentService.unassignDriverFromBus(currentDriverId, busId);
          } catch (err) {
            console.error(`Failed to unassign driver ${currentDriverId}:`, err);
          }
        }
      }
    }

    res.json({ message: 'Route updated successfully', route: result });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({ error: 'Failed to update route' });
  }
});

// Delete route (admin only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await RouteService.deleteRoute(id);
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({ error: 'Failed to delete route' });
  }
});

export default router;
