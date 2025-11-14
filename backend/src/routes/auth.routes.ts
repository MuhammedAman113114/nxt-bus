import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Default role to passenger if not provided
    const userRole = role || 'passenger';

    // Validate role
    if (!['passenger', 'driver', 'admin'].includes(userRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await AuthService.register({ email, password, role: userRole });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await AuthService.login({ email, password });

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Refresh access token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const result = await AuthService.refreshAccessToken(refreshToken);

    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get current user (requires authentication)
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    // User info is already attached by middleware
    const user = await AuthService.getUserById(req.user!.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Logout (blacklist token)
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader!.substring(7);

    // Blacklist token and delete refresh token
    await AuthService.logout(token, req.user!.userId);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    // Even if token is invalid, consider logout successful
    res.json({ message: 'Logged out successfully' });
  }
});

export default router;
