# nxt-bus WebSocket Documentation

## Overview

The nxt-bus platform uses Socket.IO for real-time bidirectional communication between clients and the server. This enables live bus tracking, instant ETA updates, and real-time notifications.

## Connection

### Endpoint
```
ws://localhost:3000
```

### Authentication

All WebSocket connections require JWT authentication. Pass the token during connection:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token_here'
  }
});
```

### Connection Events

**Connected**
```javascript
socket.on('connect', () => {
  console.log('Connected to server');
});
```

**Disconnected**
```javascript
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

**Error**
```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

---

## Driver Events

### 1. Start Tracking

**Event:** `driver:connect`

Start GPS tracking session for a bus.

**Emit:**
```javascript
socket.emit('driver:connect', {
  busId: 'uuid'
});
```

**Response:** `driver:connected`
```javascript
socket.on('driver:connected', (data) => {
  // data = {
  //   busId: 'uuid',
  //   routeId: 'uuid',
  //   message: 'Tracking started successfully'
  // }
});
```

**Error:** `driver:error`
```javascript
socket.on('driver:error', (error) => {
  // error = { message: 'Error description' }
});
```

### 2. Send Location Update

**Event:** `driver:location`

Send current GPS location.

**Emit:**
```javascript
socket.emit('driver:location', {
  latitude: 40.7128,
  longitude: -74.0060,
  heading: 45,      // optional, degrees 0-360
  speed: 30         // optional, km/h
});
```

**Response:** `driver:location:ack`
```javascript
socket.on('driver:location:ack', (data) => {
  // data = { timestamp: '2024-01-01T12:00:00.000Z' }
});
```

**Frequency:** Send updates every 5 seconds while driving

### 3. Stop Tracking

**Event:** `driver:disconnect`

Stop GPS tracking session.

**Emit:**
```javascript
socket.emit('driver:disconnect');
```

**Response:** `driver:disconnected`
```javascript
socket.on('driver:disconnected', (data) => {
  // data = { message: 'Tracking stopped successfully' }
});
```

---

## Passenger Events

### 1. Subscribe to Route

**Event:** `passenger:subscribe`

Subscribe to real-time updates for a route or stop.

**Emit:**
```javascript
// Subscribe to route
socket.emit('passenger:subscribe', {
  routeId: 'uuid'
});

// Subscribe to stop
socket.emit('passenger:subscribe', {
  stopId: 'uuid'
});

// Subscribe to both
socket.emit('passenger:subscribe', {
  routeId: 'uuid',
  stopId: 'uuid'
});
```

**Response:** `passenger:subscribed`
```javascript
socket.on('passenger:subscribed', (data) => {
  // data = {
  //   routeId: 'uuid',
  //   message: 'Subscribed to route updates'
  // }
});
```

**Initial Data:**

After subscribing to a route:
```javascript
socket.on('route:buses', (data) => {
  // data = {
  //   routeId: 'uuid',
  //   buses: [
  //     {
  //       busId: 'uuid',
  //       location: { latitude: 40.7128, longitude: -74.0060 },
  //       heading: 45,
  //       speed: 30,
  //       timestamp: '2024-01-01T12:00:00.000Z'
  //     }
  //   ]
  // }
});
```

After subscribing to a stop:
```javascript
socket.on('stop:etas', (data) => {
  // data = {
  //   stopId: 'uuid',
  //   etas: [
  //     {
  //       busId: 'uuid',
  //       stopId: 'uuid',
  //       estimatedArrival: '2024-01-01T12:15:00.000Z',
  //       distance: 2.5,
  //       confidence: 'high'
  //     }
  //   ]
  // }
});
```

### 2. Unsubscribe

**Event:** `passenger:unsubscribe`

Unsubscribe from route or stop updates.

**Emit:**
```javascript
socket.emit('passenger:unsubscribe', {
  routeId: 'uuid'  // or stopId: 'uuid'
});
```

**Response:** `passenger:unsubscribed`
```javascript
socket.on('passenger:unsubscribed', (data) => {
  // data = { routeId: 'uuid', message: 'Unsubscribed from route updates' }
});
```

### 3. Request Current ETAs

**Event:** `passenger:request:etas`

Get current ETAs for a stop on-demand.

**Emit:**
```javascript
socket.emit('passenger:request:etas', {
  stopId: 'uuid'
});
```

**Response:** `stop:etas` (same format as above)

### 4. Request Current Buses

**Event:** `passenger:request:buses`

Get current buses on a route on-demand.

**Emit:**
```javascript
socket.emit('passenger:request:buses', {
  routeId: 'uuid'
});
```

**Response:** `route:buses` (same format as above)

---

## Real-time Broadcast Events

These events are automatically sent to subscribed clients:

### 1. Bus Location Update

**Event:** `bus:location`

Sent when a bus updates its location (every 5 seconds).

```javascript
socket.on('bus:location', (data) => {
  // data = {
  //   busId: 'uuid',
  //   location: { latitude: 40.7128, longitude: -74.0060 },
  //   heading: 45,
  //   speed: 30,
  //   timestamp: '2024-01-01T12:00:00.000Z'
  // }
});
```

### 2. ETA Update

**Event:** `bus:eta`

Sent when ETAs are recalculated for a stop.

```javascript
socket.on('bus:eta', (data) => {
  // data = {
  //   stopId: 'uuid',
  //   etas: [...],
  //   timestamp: '2024-01-01T12:00:00.000Z'
  // }
});
```

### 3. Delay Notification

**Event:** `bus:delay`

Sent when a bus is running late.

```javascript
socket.on('bus:delay', (data) => {
  // data = {
  //   busId: 'uuid',
  //   delayMinutes: 10,
  //   message: 'Bus is running 10 minutes late',
  //   timestamp: '2024-01-01T12:00:00.000Z'
  // }
});
```

### 4. Arrival Reminder

**Event:** `bus:arrival`

Sent when a bus is approaching a stop.

```javascript
socket.on('bus:arrival', (data) => {
  // data = {
  //   busId: 'uuid',
  //   routeName: 'Route 1',
  //   eta: { ... },
  //   message: 'Bus arriving in 5 minutes',
  //   timestamp: '2024-01-01T12:00:00.000Z'
  // }
});
```

### 5. Bus Online

**Event:** `bus:online`

Sent when a bus starts tracking.

```javascript
socket.on('bus:online', (data) => {
  // data = {
  //   busId: 'uuid',
  //   routeId: 'uuid',
  //   timestamp: '2024-01-01T12:00:00.000Z'
  // }
});
```

### 6. Bus Offline

**Event:** `bus:offline`

Sent when a bus stops tracking.

```javascript
socket.on('bus:offline', (data) => {
  // data = {
  //   busId: 'uuid',
  //   routeId: 'uuid',
  //   timestamp: '2024-01-01T12:00:00.000Z'
  // }
});
```

### 7. Route Status

**Event:** `route:status`

Sent when route status changes.

```javascript
socket.on('route:status', (data) => {
  // data = {
  //   routeId: 'uuid',
  //   status: 'active',
  //   activeBuses: 3,
  //   message: 'Route is now active',
  //   timestamp: '2024-01-01T12:00:00.000Z'
  // }
});
```

---

## Room Architecture

The WebSocket server uses Socket.IO rooms for efficient broadcasting:

- **Route Rooms:** `route:{routeId}` - All passengers subscribed to a route
- **Stop Rooms:** `stop:{stopId}` - All passengers subscribed to a stop

When a driver sends a location update, it's broadcast only to passengers in that route's room.

---

## Error Handling

### Driver Errors

```javascript
socket.on('driver:error', (error) => {
  console.error('Driver error:', error.message);
  // Possible errors:
  // - 'Only drivers can send location updates'
  // - 'You are not assigned to this bus'
  // - 'Tracking not started'
  // - 'Invalid coordinates'
  // - 'Failed to process location update'
});
```

### Passenger Errors

```javascript
socket.on('passenger:error', (error) => {
  console.error('Passenger error:', error.message);
  // Possible errors:
  // - 'Failed to subscribe'
  // - 'Failed to unsubscribe'
  // - 'Failed to fetch ETAs'
  // - 'Failed to fetch buses'
});
```

### Connection Errors

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  // Possible errors:
  // - 'Authentication required'
  // - 'Invalid token'
});
```

---

## Complete Example: Driver

```javascript
import { io } from 'socket.io-client';

// Connect with authentication
const socket = io('http://localhost:3000', {
  auth: { token: localStorage.getItem('accessToken') }
});

// Handle connection
socket.on('connect', () => {
  console.log('Connected');
  
  // Start tracking
  socket.emit('driver:connect', { busId: 'my-bus-id' });
});

// Handle tracking started
socket.on('driver:connected', (data) => {
  console.log('Tracking started:', data);
  
  // Start sending location updates
  setInterval(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      socket.emit('driver:location', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading,
        speed: position.coords.speed * 3.6 // m/s to km/h
      });
    });
  }, 5000); // Every 5 seconds
});

// Handle acknowledgments
socket.on('driver:location:ack', (data) => {
  console.log('Location sent:', data.timestamp);
});

// Handle errors
socket.on('driver:error', (error) => {
  console.error('Error:', error.message);
});
```

---

## Complete Example: Passenger

```javascript
import { io } from 'socket.io-client';

// Connect with authentication
const socket = io('http://localhost:3000', {
  auth: { token: localStorage.getItem('accessToken') }
});

// Handle connection
socket.on('connect', () => {
  console.log('Connected');
  
  // Subscribe to route
  socket.emit('passenger:subscribe', {
    routeId: 'route-1',
    stopId: 'stop-1'
  });
});

// Handle subscription confirmation
socket.on('passenger:subscribed', (data) => {
  console.log('Subscribed:', data);
});

// Handle initial data
socket.on('route:buses', (data) => {
  console.log('Current buses:', data.buses);
  // Update UI with bus locations
});

socket.on('stop:etas', (data) => {
  console.log('Current ETAs:', data.etas);
  // Update UI with ETAs
});

// Handle real-time updates
socket.on('bus:location', (data) => {
  console.log('Bus moved:', data);
  // Update bus marker on map
});

socket.on('bus:eta', (data) => {
  console.log('ETA updated:', data);
  // Update ETA display
});

socket.on('bus:arrival', (data) => {
  console.log('Bus arriving:', data.message);
  // Show notification
});

socket.on('bus:delay', (data) => {
  console.log('Bus delayed:', data.message);
  // Show delay alert
});

// Handle errors
socket.on('passenger:error', (error) => {
  console.error('Error:', error.message);
});

// Cleanup on unmount
socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

---

## Performance Considerations

- **Location Updates:** Drivers send updates every 5 seconds
- **ETA Calculations:** Cached for 15 seconds
- **Room Broadcasting:** Only sends to subscribed clients
- **Connection Limit:** No hard limit, scales with server resources

---

## Security

- ✅ JWT authentication required for all connections
- ✅ Role-based access (drivers can only send locations, passengers can only subscribe)
- ✅ Bus assignment verification for drivers
- ✅ Coordinate validation
- ✅ Rate limiting (recommended for production)

---

## Testing

### Test Driver Connection
```bash
# Use a WebSocket client like wscat
wscat -c ws://localhost:3000 -H "Authorization: Bearer YOUR_TOKEN"

# Then send:
{"event": "driver:connect", "data": {"busId": "uuid"}}
```

### Test Passenger Subscription
```bash
wscat -c ws://localhost:3000 -H "Authorization: Bearer YOUR_TOKEN"

# Then send:
{"event": "passenger:subscribe", "data": {"routeId": "uuid"}}
```

---

## Next Steps

The WebSocket infrastructure is complete and ready to use! Integrate it into:
- Driver dashboard for GPS tracking
- Passenger app for live updates
- Admin panel for monitoring

All real-time features are now operational! 🚀
