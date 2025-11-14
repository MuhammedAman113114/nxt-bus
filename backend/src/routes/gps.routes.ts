import { Router, Request, Response } from 'express';
import { GPSService } from '../services/gps.service';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Update bus location (Driver app endpoint)
router.post('/location', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { busId, routeId, latitude, longitude, speed, heading, accuracy, altitude } = req.body;
    const driverId = (req as any).user.userId;

    if (!busId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Bus ID, latitude, and longitude are required' });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const location = await GPSService.updateBusLocation({
      busId,
      driverId,
      routeId,
      latitude,
      longitude,
      speed,
      heading,
      accuracy,
      altitude
    });

    // If route is provided, calculate and update ETAs
    if (routeId) {
      try {
        const etas = await GPSService.calculateETAForRoute(busId, routeId);
        
        // Emit real-time update via Socket.io
        const io = (req as any).app.get('io');
        if (io) {
          io.emit('bus-location-update', {
            busId,
            routeId,
            location: {
              latitude,
              longitude,
              speed,
              heading
            },
            etas
          });
        }
      } catch (etaError) {
        console.error('Error calculating ETAs:', etaError);
        // Don't fail the location update if ETA calculation fails
      }
    }

    res.json({
      message: 'Location updated successfully',
      location
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get current location of a specific bus
router.get('/bus/:busId', async (req: Request, res: Response) => {
  try {
    const { busId } = req.params;
    const location = await GPSService.getCurrentBusLocation(busId);

    if (!location) {
      return res.status(404).json({ error: 'Bus location not found' });
    }

    res.json({ location });
  } catch (error) {
    console.error('Error fetching bus location:', error);
    res.status(500).json({ error: 'Failed to fetch bus location' });
  }
});

// Get all active bus locations
router.get('/buses/active', async (req: Request, res: Response) => {
  try {
    const buses = await GPSService.getAllActiveBusLocations();
    res.json({ buses, count: buses.length });
  } catch (error) {
    console.error('Error fetching active buses:', error);
    res.status(500).json({ error: 'Failed to fetch active buses' });
  }
});

// Get ETA for a specific stop
router.get('/eta/stop/:stopId', async (req: Request, res: Response) => {
  try {
    const { stopId } = req.params;
    const etas = await GPSService.getETAForStop(stopId);

    res.json({
      stopId,
      arrivals: etas,
      count: etas.length
    });
  } catch (error) {
    console.error('Error fetching ETAs:', error);
    res.status(500).json({ error: 'Failed to fetch ETAs' });
  }
});

// Get buses near a location
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radiusKm = radius ? parseFloat(radius as string) : 5;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const buses = await GPSService.getBusesNearLocation(lat, lng, radiusKm);

    res.json({
      location: { latitude: lat, longitude: lng },
      radius: radiusKm,
      buses,
      count: buses.length
    });
  } catch (error) {
    console.error('Error fetching nearby buses:', error);
    res.status(500).json({ error: 'Failed to fetch nearby buses' });
  }
});

// Record arrival at a stop (Driver app endpoint)
router.post('/arrival', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { busId, routeId, stopId, scheduledArrival } = req.body;

    if (!busId || !routeId || !stopId) {
      return res.status(400).json({ error: 'Bus ID, route ID, and stop ID are required' });
    }

    await GPSService.recordStopArrival({
      busId,
      routeId,
      stopId,
      scheduledArrival: scheduledArrival ? new Date(scheduledArrival) : undefined,
      actualArrival: new Date()
    });

    // Emit real-time update
    const io = (req as any).app.get('io');
    if (io) {
      io.emit('bus-arrival', {
        busId,
        routeId,
        stopId,
        timestamp: new Date()
      });
    }

    res.json({ message: 'Arrival recorded successfully' });
  } catch (error) {
    console.error('Error recording arrival:', error);
    res.status(500).json({ error: 'Failed to record arrival' });
  }
});

// Record departure from a stop (Driver app endpoint)
router.post('/departure', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { busId, stopId } = req.body;

    if (!busId || !stopId) {
      return res.status(400).json({ error: 'Bus ID and stop ID are required' });
    }

    await GPSService.recordStopDeparture(busId, stopId);

    // Emit real-time update
    const io = (req as any).app.get('io');
    if (io) {
      io.emit('bus-departure', {
        busId,
        stopId,
        timestamp: new Date()
      });
    }

    res.json({ message: 'Departure recorded successfully' });
  } catch (error) {
    console.error('Error recording departure:', error);
    res.status(500).json({ error: 'Failed to record departure' });
  }
});

// Calculate ETA for a route (manual trigger)
router.post('/calculate-eta', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { busId, routeId } = req.body;

    if (!busId || !routeId) {
      return res.status(400).json({ error: 'Bus ID and route ID are required' });
    }

    const etas = await GPSService.calculateETAForRoute(busId, routeId);

    res.json({
      busId,
      routeId,
      etas,
      calculatedAt: new Date()
    });
  } catch (error) {
    console.error('Error calculating ETA:', error);
    res.status(500).json({ error: 'Failed to calculate ETA' });
  }
});

export default router;
