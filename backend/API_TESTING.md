# API Testing Guide

## Authentication Endpoints

Base URL: `http://localhost:3000/api`

### 1. Register New User

**POST** `/auth/register`

```json
{
  "email": "test@example.com",
  "password": "Test123456",
  "role": "passenger"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "role": "passenger",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### 2. Login

**POST** `/auth/login`

```json
{
  "email": "passenger@test.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "passenger@test.com",
    "role": "passenger",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### 3. Get Current User

**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "passenger@test.com",
    "role": "passenger",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Refresh Access Token

**POST** `/auth/refresh`

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc..."
}
```

### 5. Logout

**POST** `/auth/logout`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Test with cURL

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456","role":"passenger"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"passenger@test.com","password":"password123"}'
```

### Get Current User
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Test Accounts (from seed data)

- **Passenger**: `passenger@test.com` / `password123`
- **Driver**: `driver@test.com` / `password123`
- **Admin**: `admin@test.com` / `password123`

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## Error Responses

### 400 Bad Request
```json
{
  "error": "Email and password are required"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid email or password"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden: You do not have permission to access this resource"
}
```

## Role-Based Access

Use the middleware in your routes:

```typescript
import { authenticate, authorize, isDriver, isAdmin } from './middleware/auth.middleware';

// Require authentication
router.get('/protected', authenticate, handler);

// Require specific role
router.get('/driver-only', authenticate, isDriver, handler);

// Require admin
router.post('/admin-only', authenticate, isAdmin, handler);

// Multiple roles
router.get('/multi-role', authenticate, authorize('driver', 'admin'), handler);
```

## Redis Session Management

- Access tokens are blacklisted on logout
- Refresh tokens are stored in Redis
- Sessions expire after 7 days
- Blacklisted tokens are automatically cleaned up after expiration
