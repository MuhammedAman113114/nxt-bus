import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to verify JWT token and attach user info to request
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = AuthService.verifyAccessToken(token);

    // Check if token is blacklisted
    const isBlacklisted = await AuthService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }

    // Get user details
    const user = await AuthService.getUserById(payload.userId);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Attach user info to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (allowedRoles: string[] | string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Convert to array if single role provided
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

/**
 * Convenience middleware for driver-only routes
 */
export const requireDriver = requireRole(['driver', 'admin']);

/**
 * Convenience middleware for passenger routes
 */
export const requirePassenger = requireRole(['passenger', 'driver', 'admin']);

/**
 * Convenience middleware for admin-only routes
 */
export const requireAdmin = requireRole(['admin']);
