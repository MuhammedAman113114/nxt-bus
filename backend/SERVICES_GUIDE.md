# Backend Services Guide

## Overview

The nxt-bus backend has 4 core services that handle all business logic:

1. **Location Service** - GPS tracking and geospatial calculations
2. **Route Service** - Route and stop management
3. **ETA Service** - Arrival time predictions
4. **Notification Service** - User alerts and subscriptions

## 1. Location Service

**File:** `src/services/location.service.ts`

### Features

- ✅ GPS coordinate validation
- ✅ Haversine distance calculation
- ✅ Bearing/heading calculation
- ✅ Teleportation detection (prevents GPS spoofing)
- ✅ Location caching in Redis
- ✅ Location history tracking

### Key Methods

```typescript
// Validate coordinates
LocationService.validateCoordinates(location: GeoCoordinates)

// Calculate distance between two points (km)
LocationService.calculateDistance(from: GeoCoordinates, to: GeoCoordinates)

// Process and store location update
LocationService.processLocationUpdate(update: LocationUpdate)

// Get latest location for a bus
LocationService.getLatestLocation(busId: string)

// Get active buses on a route
LocationService.getActiveBusLocations(routeId: string)

// Find buses near a location
LocationService.getBusesNearLocation(location: GeoCoordinates, radiusKm: number)
```

### Anti-Spoofing

The service detects suspicious location jumps:
- Calculates implied speed between updates
- Rejects updates exceeding 150 km/h
- Prevents GPS spoofing and teleportation

## 2. Route Service

**File:** `src/services/route.service.ts`

### Features

- ✅ Route management with stops
- ✅ Stop lookup by ID or QR code
- ✅ Route caching (5 minutes)
- ✅ Distance calculations
- ✅ Nearby stop search

### Key Methods

```typescript
// Get route with all stops
RouteService.getRoute(routeId: string)

// Get all routes
RouteService.getAllRoutes()

// Get routes serving a stop
RouteService.getRoutesForStop(stopId: string)

// Get next stops for a bus
RouteService.getNextStops(busId: string, currentLocation: GeoCoordinates)

// Get stop by QR code
RouteService.getStopByQRCode(qrCode: string)

// Find stops near location
RouteService.getStopsNearLocation(location: GeoCoordinates, radiusKm: number)
```

### Caching

Routes are cached for 5 minutes to reduce database load:
- Cache key: `route:{routeId}`
- Includes stops, distances, and active bus count

## 3. ETA Service

**File:** `src/services/eta.service.ts`

### Features

- ✅ Real-time ETA calculation
- ✅ Delay detection
- ✅ Confidence scoring
- ✅ ETA caching (15 seconds)
- ✅ Average speed calculation

### Key Methods

```typescript
// Calculate ETA for bus to stop
ETAService.calculateETA(busId: string, stopId: string)

// Detect delay (minutes)
ETAService.detectDelay(busId: string, stopId: string, scheduledTime: Date)

// Get ETAs for all buses approaching a stop
ETAService.getETAsForStop(stopId: string)

// Get ETAs for a bus to upcoming stops
ETAService.getETAsForBus(busId: string)

// Calculate average speed from history
ETAService.calculateAverageSpeed(busId: string, minutes: number)

// Check if bus is on schedule
ETAService.isOnSchedule(busId: string, stopId: string, scheduledTime: Date)
```

### ETA Calculation

```
Distance (km) / Average Speed (30 km/h) * Traffic Factor (1.2) = ETA
```

### Confidence Levels

- **High**: Distance < 2 km
- **Medium**: Distance 2-10 km
- **Low**: Distance > 10 km

## 4. Notification Service

**File:** `src/services/notification.service.ts`

### Features

- ✅ Arrival reminders
- ✅ Delay alerts
- ✅ Subscription management
- ✅ Notification preferences
- ✅ Batch notification checking

### Key Methods

```typescript
// Send arrival reminder
NotificationService.sendArrivalReminder(userId: string, busId: string, eta: ETA)

// Send delay alert
NotificationService.sendDelayAlert(routeId: string, delayMinutes: number)

// Subscribe to notifications
NotificationService.subscribeToRoute(
  userId: string,
  routeId: string,
  stopId: string,
  preferences: NotificationPreferences
)

// Unsubscribe
NotificationService.unsubscribeFromRoute(userId: string, routeId: string, stopId: string)

// Get user subscriptions
NotificationService.getUserSubscriptions(userId: string)

// Check and send notifications (cron job)
NotificationService.checkAndSendArrivalNotifications()
NotificationService.checkAndSendDelayNotifications()
```

### Notification Triggers

**Arrival Reminders:**
- Sent when bus is within user's advance time (default: 10 minutes)
- Only sent once per bus per stop

**Delay Alerts:**
- Sent when delay exceeds 5 minutes
- Sent to all subscribers of the route

## Usage Examples

### Track Bus Location

```typescript
import { LocationService } from './services/location.service';

// Driver sends location update
await LocationService.processLocationUpdate({
  busId: 'bus-123',
  location: { latitude: 12.9716, longitude: 77.5946 },
  heading: 45.5,
  speed: 35.2,
  timestamp: new Date()
});

// Get current location
const location = await LocationService.getLatestLocation('bus-123');
```

### Calculate ETA

```typescript
import { ETAService } from './services/eta.service';

// Calculate ETA for bus to stop
const eta = await ETAService.calculateETA('bus-123', 'stop-456');

console.log(`
  ETA: ${eta.estimatedArrival}
  Distance: ${eta.distance} km
  Confidence: ${eta.confidence}
`);
```

### Subscribe to Notifications

```typescript
import { NotificationService } from './services/notification.service';

// User subscribes to route
await NotificationService.subscribeToRoute(
  'user-123',
  'route-456',
  'stop-789',
  {
    advanceMinutes: 10,
    channels: ['push', 'email']
  }
);
```

### Find Nearby Stops

```typescript
import { RouteService } from './services/route.service';

// Find stops within 1 km
const stops = await RouteService.getStopsNearLocation(
  { latitude: 12.9716, longitude: 77.5946 },
  1 // radius in km
);
```

## Performance Considerations

### Caching Strategy

- **Locations**: 30 seconds (frequent updates)
- **ETAs**: 15 seconds (real-time calculations)
- **Routes**: 5 minutes (relatively static)

### Database Optimization

- Spatial indexes on all geography columns
- Composite indexes on frequently queried fields
- Query limits to prevent large result sets

### Redis Usage

All services use Redis for caching when available:
- Falls back gracefully if Redis is unavailable
- Logs warnings but doesn't block operations

## Background Jobs

For production, set up cron jobs:

```typescript
// Every minute: Check and send arrival notifications
setInterval(async () => {
  await NotificationService.checkAndSendArrivalNotifications();
}, 60000);

// Every 5 minutes: Check and send delay notifications
setInterval(async () => {
  await NotificationService.checkAndSendDelayNotifications();
}, 300000);
```

## Next Steps

These services are ready to be used in:
- REST API endpoints (Task 5)
- WebSocket real-time updates (Task 6)
- Frontend integration (Tasks 7-8)

All services include error handling and logging for production use.
