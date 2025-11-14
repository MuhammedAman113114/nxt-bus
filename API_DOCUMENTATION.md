# nxt-bus REST API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## 1. Authentication Endpoints

### 1.1 Register User
**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "role": "passenger" // or "driver", "admin"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "passenger",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

### 1.2 Login
**POST** `/auth/login`

Authenticate and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "passenger"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

### 1.3 Refresh Token
**POST** `/auth/refresh`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

### 1.4 Get Current User
**GET** `/auth/me`

Get authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "passenger",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 1.5 Logout
**POST** `/auth/logout`

Invalidate current session.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

## 2. Bus Stop Endpoints

### 2.1 Get All Stops
**GET** `/stops`

List all bus stops.

**Response:** `200 OK`
```json
{
  "stops": [
    {
      "id": "uuid",
      "name": "Main Street Station",
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "qrCode": "STOP001",
      "routes": []
    }
  ]
}
```

### 2.2 Get Stop by ID
**GET** `/stops/:id`

Get specific stop with routes and ETAs.

**Response:** `200 OK`
```json
{
  "stop": {
    "id": "uuid",
    "name": "Main Street Station",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "qrCode": "STOP001"
  },
  "routes": [
    {
      "id": "uuid",
      "name": "Route 1",
      "description": "Downtown Loop",
      "activeBuses": 3
    }
  ],
  "etas": [
    {
      "busId": "uuid",
      "stopId": "uuid",
      "estimatedArrival": "2024-01-01T12:15:00.000Z",
      "distance": 2.5,
      "confidence": "high"
    }
  ]
}
```

### 2.3 Get Stop by QR Code
**GET** `/stops/qr/:qrCode`

Lookup stop by scanning QR code.

**Response:** `200 OK` (same as 2.2)

### 2.4 Get Nearby Stops
**GET** `/stops/nearby/:lat/:lng?radius=1`

Find stops near a location.

**Query Parameters:**
- `radius` - Search radius in kilometers (default: 1)

**Response:** `200 OK`
```json
{
  "stops": [...],
  "radius": 1
}
```

### 2.5 Create Stop (Admin Only)
**POST** `/stops`

Create a new bus stop.

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "name": "New Station",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "qrCode": "STOP999"
}
```

**Response:** `201 Created`

---

## 3. Route Endpoints

### 3.1 Get All Routes
**GET** `/routes`

List all active routes.

**Response:** `200 OK`
```json
{
  "routes": [
    {
      "id": "uuid",
      "name": "Route 1",
      "description": "Downtown Loop",
      "activeBuses": 3
    }
  ]
}
```

### 3.2 Get Route by ID
**GET** `/routes/:id`

Get route details with all stops.

**Response:** `200 OK`
```json
{
  "route": {
    "id": "uuid",
    "name": "Route 1",
    "description": "Downtown Loop",
    "stops": [
      {
        "id": "uuid",
        "name": "Main Street Station",
        "location": {
          "latitude": 40.7128,
          "longitude": -74.0060
        },
        "qrCode": "STOP001"
      }
    ],
    "activeBuses": 3,
    "totalDistance": 15.5
  }
}
```

### 3.3 Get Route Stops
**GET** `/routes/:id/stops`

Get ordered list of stops for a route.

**Response:** `200 OK`
```json
{
  "stops": [...],
  "totalDistance": 15.5
}
```

### 3.4 Get Active Buses on Route
**GET** `/routes/:id/buses`

Get all active buses currently on this route.

**Response:** `200 OK`
```json
{
  "buses": [
    {
      "busId": "uuid",
      "location": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "heading": 45,
      "speed": 30,
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  ],
  "count": 3
}
```

---

## 4. Bus Endpoints

### 4.1 Get Bus by ID
**GET** `/buses/:id`

Get bus details with current location and ETAs.

**Response:** `200 OK`
```json
{
  "bus": {
    "id": "uuid",
    "registration_number": "BUS-001",
    "capacity": 50,
    "is_active": true,
    "route_id": "uuid",
    "status": "active",
    "route_name": "Route 1"
  },
  "location": {
    "busId": "uuid",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "heading": 45,
    "speed": 30,
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "etas": [...]
}
```

### 4.2 Get Bus Location
**GET** `/buses/:id/location`

Get current location of a bus.

**Response:** `200 OK`
```json
{
  "location": {
    "busId": "uuid",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "heading": 45,
    "speed": 30,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### 4.3 Get Bus Location History
**GET** `/buses/:id/history?limit=50`

Get location history for a bus.

**Query Parameters:**
- `limit` - Number of records (default: 50)

**Response:** `200 OK`
```json
{
  "history": [...],
  "count": 50
}
```

---

## 5. Subscription Endpoints

**All endpoints require authentication**

### 5.1 Get User Subscriptions
**GET** `/subscriptions`

Get current user's subscriptions.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
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

### 5.2 Subscribe to Route/Stop
**POST** `/subscriptions`

Create a new subscription.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "routeId": "uuid",
  "stopId": "uuid",
  "advanceMinutes": 10,
  "channels": ["push"]
}
```

**Response:** `201 Created`
```json
{
  "subscription": {...},
  "message": "Subscribed successfully"
}
```

### 5.3 Unsubscribe
**DELETE** `/subscriptions/:routeId/:stopId`

Remove a subscription.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Unsubscribed successfully"
}
```

### 5.4 Update Preferences
**PATCH** `/subscriptions/:subscriptionId`

Update notification preferences.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "advanceMinutes": 15,
  "channels": ["push", "email"]
}
```

**Response:** `200 OK`
```json
{
  "message": "Preferences updated successfully"
}
```

---

## 6. Health Check

### 6.1 Health Status
**GET** `/health`

Check API and database status.

**Response:** `200 OK`
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "Email and password are required"
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
  "error": "Insufficient permissions",
  "required": ["admin"],
  "current": "passenger"
}
```

### 404 Not Found
```json
{
  "error": "Bus stop not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. For production, consider:
- 100 requests per minute per IP
- 1000 requests per hour per user

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","role":"passenger"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### Get Stops (with auth)
```bash
curl http://localhost:3000/api/stops \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## WebSocket Events (Coming Soon)

Real-time events will be available via WebSocket connection:
- `bus:location` - Bus location updates
- `bus:eta` - ETA updates
- `bus:delay` - Delay notifications
- `bus:arrival` - Arrival reminders

See WebSocket documentation for details.
