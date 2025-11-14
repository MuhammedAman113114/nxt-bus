import { Router, Request, Response } from 'express';
import { ETAService } from '../services/eta.service';

const router = Router();

/**
 * POST /api/update-location
 * Update bus location (called by driver)
 */
router.post('/update-location', async (req: Request, res: Response) => {
  try {
    const { busId, lat, lon, timestamp } = req.body;

    // Validate input
    if (!busId || lat === undefined || lon === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: busId, lat, lon' 
      });
    }

    // Validate coordinates
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ 
        error: 'Invalid coordinates' 
      });
    }

    await ETAService.updateBusLocation(busId, lat, lon, timestamp);

    res.json({ 
      success: true, 
      message: 'Location updated successfully',
      busId,
      location: { lat, lon },
      timestamp: timestamp || Date.now()
    });
  } catch (error: any) {
    console.error('Error updating location:', error);
    res.status(500).json({ 
      error: 'Failed to update location',
      details: error.message 
    });
  }
});

/**
 * POST /api/scan
 * Calculate ETA for passenger scan
 */
router.post('/scan', async (req: Request, res: Response) => {
  try {
    const { 
      routeId, 
      userLat, 
      userLon, 
      scheduledFrom, 
      scheduledTo, 
      timeZone 
    } = req.body;

    // Validate required fields
    if (!routeId) {
      return res.status(400).json({ 
        error: 'Missing required field: routeId' 
      });
    }

    if (userLat === undefined || userLon === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: userLat, userLon' 
      });
    }

    // Validate coordinates
    if (userLat < -90 || userLat > 90 || userLon < -180 || userLon > 180) {
      return res.status(400).json({ 
        error: 'Invalid user coordinates' 
      });
    }

    // Calculate ETA
    const result = await ETAService.calculateETA(
      routeId,
      userLat,
      userLon,
      scheduledFrom,
      scheduledTo,
      timeZone
    );

    res.json(result);
  } catch (error: any) {
    console.error('Error calculating ETA:', error);

    if (error.message === 'NO_ACTIVE_BUSES') {
      return res.status(404).json({ 
        error: 'no_active_buses',
        message: 'No active buses found on this route' 
      });
    }

    if (error.message === 'NO_VALID_BUS_FOUND') {
      return res.status(404).json({ 
        error: 'no_valid_bus_found',
        message: 'Could not calculate ETA for any bus' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to calculate ETA',
      details: error.message 
    });
  }
});

export default router;
