import { Router, Request, Response } from 'express';
import { RouteService } from '../services/route.service';
import { ETAService } from '../services/eta.service';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Get all bus stops
router.get('/', async (req: Request, res: Response) => {
  try {
    const stops = await RouteService.getAllStops();
    res.json({ stops });
  } catch (error) {
    console.error('Error fetching stops:', error);
    res.status(500).json({ error: 'Failed to fetch bus stops' });
  }
});

// Get stop by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stop = await RouteService.getStopById(id);

    if (!stop) {
      return res.status(404).json({ error: 'Bus stop not found' });
    }

    // Get routes serving this stop
    const routes = await RouteService.getRoutesForStop(id);

    // Get ETAs for buses approaching this stop
    const etas = await ETAService.getETAsForStop(id);

    res.json({ stop, routes, etas });
  } catch (error) {
    console.error('Error fetching stop:', error);
    res.status(500).json({ error: 'Failed to fetch bus stop' });
  }
});

// Get stop by QR code
router.get('/qr/:qrCode', async (req: Request, res: Response) => {
  try {
    const { qrCode } = req.params;
    const stop = await RouteService.getStopByQRCode(qrCode);

    if (!stop) {
      return res.status(404).json({ error: 'Bus stop not found for this QR code' });
    }

    // Get routes serving this stop
    const routes = await RouteService.getRoutesForStop(stop.id);

    // Get ETAs for buses approaching this stop
    const etas = await ETAService.getETAsForStop(stop.id);

    res.json({ stop, routes, etas });
  } catch (error) {
    console.error('Error fetching stop by QR:', error);
    res.status(500).json({ error: 'Failed to fetch bus stop' });
  }
});

// Get stops near location
router.get('/nearby/:lat/:lng', async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.params;
    const radius = parseFloat(req.query.radius as string) || 1; // Default 1 km

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const stops = await RouteService.getStopsNearLocation(
      { latitude, longitude },
      radius
    );

    res.json({ stops, radius });
  } catch (error) {
    console.error('Error fetching nearby stops:', error);
    res.status(500).json({ error: 'Failed to fetch nearby stops' });
  }
});

// Create new stop (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, latitude, longitude } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Name, latitude, and longitude are required' });
    }

    const stop = await RouteService.createStop(name, latitude, longitude);
    res.status(201).json({ message: 'Stop created successfully', stop });
  } catch (error) {
    console.error('Error creating stop:', error);
    res.status(500).json({ error: 'Failed to create bus stop' });
  }
});

// Update stop (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude } = req.body;

    const stop = await RouteService.updateStop(id, name, latitude, longitude);
    
    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }

    res.json({ message: 'Stop updated successfully', stop });
  } catch (error) {
    console.error('Error updating stop:', error);
    res.status(500).json({ error: 'Failed to update bus stop' });
  }
});

// Delete stop (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await RouteService.deleteStop(id);
    res.json({ message: 'Stop deleted successfully' });
  } catch (error) {
    console.error('Error deleting stop:', error);
    res.status(500).json({ error: 'Failed to delete bus stop' });
  }
});

export default router;
