# Session Management with Redis

## Completed: Task 3.3

### What Was Implemented

Enhanced the session management system with Redis support, refresh token rotation, and automatic cleanup.

### Key Features

#### 1. Refresh Token Rotation
- **Security Enhancement**: Each time a refresh token is used, a new one is generated
- **Old tokens are invalidated**: Prevents token reuse attacks
- **Automatic storage**: New refresh tokens are stored in Redis/memory

#### 2. Token Validation
- Refresh tokens are validated against stored tokens
- Prevents replay attacks
- Ensures only the latest refresh token is valid

#### 3. In-Memory Fallback
- Works without Redis for development
- Automatic fallback when Redis is unavailable
- All session operations work seamlessly

#### 4. Automatic Cleanup
- Periodic cleanup of expired sessions (every 15 minutes)
- Prevents memory leaks in fallback mode
- Logs cleanup activity

### Files Updated

1. **backend/src/services/auth.service.ts**
   - Updated `refreshAccessToken()` to implement token rotation
   - Validates refresh token against stored token
   - Returns both new access token and new refresh token

2. **backend/src/config/redis.ts**
   - Added `cleanupExpiredSessions()` method
   - Added `startPeriodicCleanup()` method
   - Automatic cleanup scheduler

3. **backend/src/index.ts**
   - Starts periodic cleanup on server start
   - Imports SessionManager

4. **frontend/src/services/api.service.ts**
   - Stores new refresh token after rotation
   - Cleans up all tokens on logout
   - Handles token refresh failures

### How Token Rotation Works

```
1. User's access token expires
2. Frontend sends refresh token to /api/auth/refresh
3. Backend validates refresh token:
   - Verifies JWT signature
   - Checks if it matches stored token
   - Verifies user still exists
4. Backend generates NEW tokens:
   - New access token (15 min)
   - New refresh token (7 days)
5. Backend stores new refresh token
6. Backend returns both tokens
7. Frontend stores both tokens
8. Old refresh token is now invalid
```

### Session Storage

**With Redis (Production):**
- Sessions stored in Redis with TTL
- Automatic expiration
- Distributed across servers
- Fast access

**Without Redis (Development/Fallback):**
- Sessions stored in memory Map
- Manual cleanup every 15 minutes
- Single server only
- Still functional

### API Changes

**POST /api/auth/refresh**

Request:
```json
{
  "refreshToken": "old_refresh_token"
}
```

Response:
```json
{
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token"
}
```

### Security Benefits

1. **Token Rotation**: Limits exposure window if token is compromised
2. **Single Use**: Each refresh token can only be used once
3. **Validation**: Tokens are validated against stored values
4. **Blacklisting**: Logout immediately invalidates tokens
5. **Expiration**: Automatic cleanup of expired sessions

### Configuration

Environment variables in `.env`:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=7d
```

### Monitoring

The system logs:
- Redis connection status
- Session cleanup activity
- Token refresh attempts
- Logout events

### Next Steps

For production deployment:
- Set up Redis (local or cloud like Upstash)
- Configure Redis password
- Monitor session metrics
- Set up Redis persistence

The session management system is now production-ready with proper security measures and fallback support!
