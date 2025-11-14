# WebSocket Guide

## Overview

The nxt-bus WebSocket server provides real-time updates for:
- Driver GPS location tracking
- Passenger bus tracking
- ETA updates
- Delay notifications
- Bus online/offline status

## Connection

**URL:** `ws://localhost:3000` or `wss://your-domain.com`

**Authentication:** JWT token required

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-access-token'
  }
});
```

## Driver Events

### Connect and Start Tracking

**Emit:** `driver:connect`
```javascript
socket.emit('driver:connect', {
  busId: 'bus-uuid'
});
```

**Response:** `driver:connected`
```javascript
socket.on('driver:connected', (data) => {
  console.log(data);
  // { busId, routeId, message: 'Tracking started successfully' }
});
```

### Send Location Update

**Emit:** `driver:location`
```javascript
socket.emit('driver:location', {
  latitude: 12.9716,
  longitude: 77.5946,
  heading: 45.5,  // optional
  speed: 35.2     // optional (km/h)
});
```

**Response:** `driver:location:ack`
```javascript
socket.on('driver:location:ack', (data) => {
  console.log(data);
  // { timestamp: '2024-01-01T00:00:00.000Z' }
});
```

### Stop Tracking

**Emit:** `driver:disconnect`
```javascript
socket.emit('driver:disconnect');
```

**Response:** `driver:disconnected`
```javascript
socket.on('driver:disconnected', (data) => {
  console.log(data);
  // { message: 'Tracking stopped successfully' }
});
```

### Error Handling

```javascript
socket.on('driver:error', (error) => {
  console.error(error.message);
});
```

## Passenger Events

### Subscribe to Route Updates

**Emit:** `passenger:subscribe`
```javascript
socket.emit('passenger:subscribe', {
  routeId: 'route-uuid'
});
```

**Response:** `passenger:subscribed`
```javascript
socket.on('passenger:subscribed', (data) => {
  console.log(data);
  // { routeId, message: 'Subscribed to route updates' }
});
```

**Initial Data:** `route:buses`
```javascript
socket.on('route:buses', (data) => {
  console.log(data);
  // {
  //   routeId: 'route-uuid',
  //   buses: [
  //     {
  //       busId: 'bus-uuid',
  //       location: { latitude: 12.9716, longitude: 77.5946 },
  //       heading: 45.5,
  //       speed: 35.2,
  //       timestamp: '2024-01-01T00:00:00.000Z'
  //     }
  //   ]
  // }
});
```

### Subscribe to Stop Updates

**Emit:** `passenger:subscribe`
```javascript
socket.emit('passenger:subscribe', {
  stopId: 'stop-uuid'
});
```

**Response:** `passenger:subscribed`
```javascript
socket.on('passenger:subscribed', (data) => {
  console.log(data);
  // { stopId, message: 'Subscribed to stop updates' }
});
```

**Initial Data:** `stop:etas`
```javascript
socket.on('stop:etas', (data) => {
  console.log(data);
  // {
  //   stopId: 'stop-uuid',
  //   etas: [
  //     {
  //       busId: 'bus-uuid',
  //       stopId: 'stop-uuid',
  //       estimatedArrival: '2024-01-01T00:10:00.000Z',
  //       distance: 2.5,
  //       confidence: 'high'
  //     }
  //   ]
  // }
});
```

### Unsubscribe

**Emit:** `passenger:unsubscribe`
```javascript
socket.emit('passenger:unsubscribe', {
  routeId: 'route-uuid',  // optional
  stopId: 'stop-uuid'     // optional
});
```

### Request Current Data

**Request ETAs:**
```javascript
socket.emit('passenger:request:etas', {
  stopId: 'stop-uuid'
});

socket.on('stop:etas', (data) => {
  // ETA data
});
```

**Request Buses:**
```javascript
socket.emit('passenger:request:buses', {
  routeId: 'route-uuid'
});

socket.on('route:buses', (data) => {
  // Bus location data
});
```

## Real-Time Updates

### Bus Location Update

Received when a bus sends a location update:

```javascript
socket.on('bus:location', (data) => {
  console.log(data);
  // {
  //   busId: 'bus-uuid',
  //   location: { latitude: 12.9716, longitude: 77.5946 },
  //   heading: 45.5,
  //   speed: 35.2,
  //   timestamp: '2024-01-01T00:00:00.000Z'
  // }
});
```

### ETA Update

Received when ETAs are recalculated:

```javascript
socket.on('bus:eta', (data) => {
  console.log(data);
  // {
  //   stopId: 'stop-uuid',
  //   etas: [...],
  //   timestamp: '2024-01-01T00:00:00.000Z'
  // }
});
```

### Delay Notification

Received when a bus is delayed:

```javascript
socket.on('bus:delay', (data) => {
  console.log(data);
  // {
  //   busId: 'bus-uuid',
  //   delayMinutes: 10,
  //   message: 'Bus is running 10 minutes late',
  //   timestamp: '2024-01-01T00:00:00.000Z'
  // }
});
```

### Arrival Reminder

Received when a bus is approaching:

```javascript
socket.on('bus:arrival', (data) => {
  console.log(data);
  // {
  //   busId: 'bus-uuid',
  //   routeName: 'Route 101',
  //   eta: { ... },
  //   message: 'Bus arriving in 5 minutes',
  //   timestamp: '2024-01-01T00:00:00.000Z'
  // }
});
```

### Bus Online/Offline

```javascript
socket.on('bus:online', (data) => {
  console.log(data);
  // { busId: 'bus-uuid', routeId: 'route-uuid', timestamp: '...' }
});

socket.on('bus:offline', (data) => {
  console.log(data);
  // { busId: 'bus-uuid', routeId: 'route-uuid', timestamp: '...' }
});
```

### Route Status Change

```javascript
socket.on('route:status', (data) => {
  console.log(data);
  // {
  //   routeId: 'route-uuid',
  //   status: 'active',
  //   activeBuses: 3,
  //   message: 'Route is now active',
  //   timestamp: '2024-01-01T00:00:00.000Z'
  // }
});
```

## Complete Example

### Driver App

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: driverToken }
});

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Start tracking
  socket.emit('driver:connect', { busId: 'my-bus-id' });
});

socket.on('driver:connected', (data) => {
  console.log('Tracking started:', data);
  
  // Start sending location updates every 5 seconds
  setInterval(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      socket.emit('driver:location', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading,
        speed: position.coords.speed * 3.6 // Convert m/s to km/h
      });
    });
  }, 5000);
});

socket.on('driver:error', (error) => {
  console.error('Driver error:', error.message);
});
```

### Passenger App

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: passengerToken }
});

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Subscribe to route
  socket.emit('passenger:subscribe', {
    routeId: 'route-101',
    stopId: 'my-stop-id'
  });
});

// Receive initial bus locations
socket.on('route:buses', (data) => {
  console.log('Active buses:', data.buses);
  // Update map with bus markers
});

// Receive initial ETAs
socket.on('stop:etas', (data) => {
  console.log('ETAs:', data.etas);
  // Update UI with arrival times
});

// Receive real-time location updates
socket.on('bus:location', (data) => {
  console.log('Bus moved:', data);
  // Update bus marker on map
});

// Receive arrival notifications
socket.on('bus:arrival', (data) => {
  console.log('Bus arriving soon:', data.message);
  // Show notification to user
});

// Handle disconnection
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

## Error Handling

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  // Handle authentication errors
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('passenger:error', (error) => {
  console.error('Passenger error:', error.message);
});

socket.on('driver:error', (error) => {
  console.error('Driver error:', error.message);
});
```

## Best Practices

1. **Reconnection**: Socket.IO handles reconnection automatically
2. **Heartbeat**: Connection is kept alive with ping/pong
3. **Room Management**: Automatically leave rooms on disconnect
4. **Error Handling**: Always listen for error events
5. **Token Refresh**: Reconnect with new token when access token expires

## Performance

- **Location Updates**: Sent every 5 seconds by drivers
- **ETA Updates**: Cached for 15 seconds
- **Message Batching**: Multiple updates batched when possible
- **Room-Based Broadcasting**: Only subscribers receive updates

## Security

- JWT authentication required for all connections
- Role-based access (drivers can only send locations, passengers can only subscribe)
- Input validation on all events
- Rate limiting on location updates
