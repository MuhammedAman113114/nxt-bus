import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get user's subscriptions
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const subscriptions = await NotificationService.getUserSubscriptions(userId);

    res.json({ subscriptions });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Subscribe to route/stop
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { routeId, stopId, advanceMinutes, channels } = req.body;

    if (!routeId || !stopId) {
      return res.status(400).json({ error: 'Route ID and Stop ID are required' });
    }

    const subscription = await NotificationService.subscribeToRoute(
      userId,
      routeId,
      stopId,
      {
        advanceMinutes: advanceMinutes || 10,
        channels: channels || ['push'],
      }
    );

    res.status(201).json({ subscription, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Unsubscribe from route/stop
router.delete('/:routeId/:stopId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { routeId, stopId } = req.params;

    await NotificationService.unsubscribeFromRoute(userId, routeId, stopId);

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Update notification preferences
router.patch('/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { subscriptionId } = req.params;
    const { advanceMinutes, channels } = req.body;

    await NotificationService.updateNotificationPreferences(
      userId,
      subscriptionId,
      {
        advanceMinutes: advanceMinutes || 10,
        channels: channels || ['push'],
      }
    );

    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
