# Complete API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <access-token>
```

### POST /auth/register
Register new user

**Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "role": "passenger"
}
```

**Response:** 201
```json
{
  "user": { "id": "uuid", "email": "...", "role": "passenger" },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token"
}
```

### POST /auth/login
Login user

**Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response:** 200
```json
{
  "user": { "id": "uuid", "email": "...", "role": "passenger" },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token"
}
```

### GET /auth/me
Get current user (requires auth)

**Response:** 200
```json
{
  "user": { "id": "uuid", "email": "...", "role": "passenger" }
}
```

### POST /auth/refresh
Refresh access token

**Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response:** 200
```json
{
  "accessToken": "new-jwt-token"
}
```

### POST /auth/logout
Logout user (requires auth)

**Response:** 200
```json
{
  "message": "Logged out successfully"
}
```

## Bus Stops

### GET /stops
Get all bus stops

**Response:** 200
```json
{
  "stops": [
    {
      "id": "uuid",
      "name": "Central Station",
      "location": { "latitude": 12.9716, "longitude": 77.5946 },
      "qrCode": "QR-CENTRAL-001",
      "routes": ["route-uuid-1", "route-uuid-2"]
    }
  ]
}
```

### GET /stops/:id
Get stop by ID with routes and ETAs

**Response:** 200
```json
{
  "stop": { "id": "uuid", "name": "...", "location": {...}, "qrCode": "..." },
  "routes": [...],
  "etas": [
    {
      "busId": "uuid",
      "stopId": "uuid",
      "estimatedArrival": "2024-01-01T00:10:00.000Z",
      "distance": 2.5,
      "confidence": "high"
    }
  ]
}
```

### GET /stops/qr/:qrCode
Get stop by QR code

**Response:** 200
```json
{
  "stop": {...},
  "routes": [...],
  "etas": [...]
}
```

### GET /stops/nearby/:lat/:lng
Get stops near location

**Query Params:**
- `radius` (optional): Search radius in km (default: 1)

**Response:** 200
```json
{
  "stops": [...],
  "radius": 1
}
```

## Routes

### GET /routes
Get all routes

**Response:** 200
```json
{
  "routes": [
    {
      "id": "uuid",
      "name": "Route 101 - City Circle",
      "description": "Circular route covering major city areas",
      "stops": [],
      "activeBuses": 3
    }
  ]
}
```

### GET /routes/:id
Get route by ID with stops

**Response:** 200
```json
{
  "route": {
    "id": "uuid",
    "name": "Route 101",
    "description": "...",
    "stops": [
      {
        "id": "uuid",
        "name": "Central Station",
        "location": {...},
        "qrCode": "..."
      }
    ],
    "activeBuses": 3,
    "totalDistance": 25.5
  }
}
```

### GET /routes/:id/stops
Get stops for a route

**Response:** 200
```json
{
  "stops": [...],
  "totalDistance": 25.5
}
```

### GET /routes/:id/buses
Get active buses on a route

**Response:** 200
```json
{
  "buses": [
    {
      "busId": "uuid",
      "location": { "latitude": 12.9716, "longitude": 77.5946 },
      "heading": 45.5,
      "speed": 35.2,
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 3
}
```

## Buses

### GET /buses/:id
Get bus details

**Response:** 200
```json
{
  "bus": {
    "id": "uuid",
    "registration_number": "KA-01-AB-1234",
    "capacity": 40,
    "is_active": true,
    "route_id": "uuid",
    "status": "active",
    "route_name": "Route 101"
  },
  "location": {
    "busId": "uuid",
    "location": { "latitude": 12.9716, "longitude": 77.5946 },
    "heading": 45.5,
    "speed": 35.2,
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "etas": [...]
}
```

### GET /buses/:id/location
Get current bus location

**Response:** 200
```json
{
  "location": {
    "busId": "uuid",
    "location": { "latitude": 12.9716, "longitude": 77.5946 },
    "heading": 45.5,
    "speed": 35.2,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /buses/:id/history
Get bus location history

**Query Params:**
- `limit` (optional): Number of records (default: 50)

**Response:** 200
```json
{
  "history": [...],
  "count": 50
}
```

## Subscriptions

All subscription endpoints require authentication.

### GET /subscriptions
Get user's subscriptions

**Response:** 200
```json
{
  "subscriptions": [
    {
      "id": "uuid",
      "userId": "uuid",
      "routeId": "uuid",
      "stopId": "uuid",
      "notificationAdvanceMinutes": 10,
      "isActive": true
    }
  ]
}
```

### POST /subscriptions
Subscribe to route/stop notifications

**Body:**
```json
{
  "routeId": "uuid",
  "stopId": "uuid",
  "advanceMinutes": 10,
  "channels": ["push", "email"]
}
```

**Response:** 201
```json
{
  "subscription": {...},
  "message": "Subscribed successfully"
}
```

### DELETE /subscriptions/:routeId/:stopId
Unsubscribe from route/stop

**Response:** 200
```json
{
  "message": "Unsubscribed successfully"
}
```

### PATCH /subscriptions/:subscriptionId
Update notification preferences

**Body:**
```json
{
  "advanceMinutes": 15,
  "channels": ["push"]
}
```

**Response:** 200
```json
{
  "message": "Preferences updated successfully"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid input data"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden: You do not have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- Other endpoints: 100 requests per minute

## Pagination

For endpoints returning lists, pagination will be added in future:
```
?page=1&limit=20
```

## Filtering

For endpoints returning lists, filtering will be added in future:
```
?status=active&route=route-101
```

## Testing with cURL

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

### Get Stops
```bash
curl http://localhost:3000/api/stops
```

### Get Stop by QR Code
```bash
curl http://localhost:3000/api/stops/qr/QR-CENTRAL-001
```

### Get Routes
```bash
curl http://localhost:3000/api/routes
```

### Subscribe (requires auth)
```bash
curl -X POST http://localhost:3000/api/subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"routeId":"route-uuid","stopId":"stop-uuid","advanceMinutes":10}'
```
