# Role-Based Access Control Implementation

## Completed: Task 3.2

### What Was Implemented

Created a comprehensive authentication and authorization middleware system for the nxt-bus backend.

### Files Created

1. **backend/src/middleware/auth.middleware.ts**
   - `authenticateToken` - Verifies JWT tokens and attaches user info to requests
   - `requireRole(...roles)` - Checks if user has required role(s)
   - `requireDriver` - Convenience middleware for driver-only routes
   - `requirePassenger` - Convenience middleware for passenger routes
   - `requireAdmin` - Convenience middleware for admin-only routes

### Files Updated

1. **backend/src/routes/auth.routes.ts**
   - Protected `/me` endpoint with `authenticateToken`
   - Protected `/logout` endpoint with `authenticateToken`
   - Simplified logic by using middleware-attached user info

2. **backend/src/routes/stops.routes.ts**
   - Protected admin-only POST route with `authenticateToken` and `requireAdmin`

3. **backend/src/routes/subscriptions.routes.ts**
   - Protected all subscription routes with `authenticateToken`

### How It Works

#### Authentication Flow
1. Client sends request with `Authorization: Bearer <token>` header
2. `authenticateToken` middleware:
   - Extracts and verifies JWT token
   - Checks if token is blacklisted
   - Fetches user from database
   - Attaches user info to `req.user`
3. Request proceeds to route handler with authenticated user

#### Authorization Flow
1. After authentication, `requireRole` middleware:
   - Checks if `req.user.role` matches allowed roles
   - Returns 403 Forbidden if role doesn't match
   - Allows request to proceed if role is authorized

### Usage Examples

```typescript
// Require authentication only
router.get('/profile', authenticateToken, async (req, res) => {
  const userId = req.user!.userId;
  // ...
});

// Require specific role
router.post('/admin/stops', authenticateToken, requireAdmin, async (req, res) => {
  // Only admins can access
});

// Require one of multiple roles
router.get('/driver/dashboard', authenticateToken, requireDriver, async (req, res) => {
  // Drivers and admins can access
});

// Custom role check
router.post('/special', authenticateToken, requireRole('driver', 'admin'), async (req, res) => {
  // Drivers and admins can access
});
```

### TypeScript Support

Extended Express Request interface to include user info:

```typescript
interface Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}
```

### Security Features

- JWT token verification
- Token blacklisting for logout
- Role-based access control
- Automatic user lookup and validation
- Proper error messages (401 for auth, 403 for authorization)

### Protected Routes

**Authentication Required:**
- GET `/api/auth/me` - Get current user
- POST `/api/auth/logout` - Logout user
- All `/api/subscriptions/*` routes

**Admin Only:**
- POST `/api/stops` - Create new bus stop

### Next Steps

The middleware is ready to be used on additional routes as needed:
- Driver-only routes (location updates, etc.)
- Admin routes (route management, QR generation, etc.)
- Any route requiring authentication

All routes can now easily add authentication and authorization by including the appropriate middleware.
