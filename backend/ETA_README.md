# Real-Time ETA System

This system provides real-time ETA calculations for passengers using GPS coordinates and OSRM routing.

## Features

- **Real-time bus tracking**: Drivers update their location via GPS
- **Smart ETA calculation**: Uses OSRM for accurate routing with haversine fallback
- **Caching**: 10-second TTL cache to reduce API calls
- **Timezone support**: Proper time formatting with timezone awareness
- **No stop coordinates required**: Uses passenger's GPS location directly

## Architecture

### Services

1. **OSRMService** (`osrm.service.ts`)
   - Calls OSRM API for route duration
   - Haversine distance calculation fallback
   - Travel time estimation

2. **ETACacheService** (`eta-cache.service.ts`)
   - In-memory TTL cache (10s default)
   - Automatic cleanup every 30s
   - Coordinates rounded to 5 decimals for cache keys

3. **ETAService** (`eta.service.ts`)
   - Main business logic
   - Finds active buses (updated within 2 minutes)
   - Calculates best ETA
   - Formats human-readable messages

### API Endpoints

#### POST /api/update-location
Update bus GPS location (called by driver app)

**Request:**
```json
{
  "busId": "bus_51A",
  "lat": 12.920,
  "lon": 74.820,
  "timestamp": 1670000000 // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "busId": "bus_51A",
  "location": { "lat": 12.920, "lon": 74.820 },
  "timestamp": 1670000000
}
```

#### POST /api/scan
Calculate ETA for passenger (called when QR code is scanned)

**Request:**
```json
{
  "routeId": "route_51A",
  "userLat": 12.91234,
  "userLon": 74.83567,
  "scheduledFrom": "11:00",  // optional
  "scheduledTo": "12:20",    // optional
  "timeZone": "Asia/Kolkata" // optional, defaults to Asia/Kolkata
}
```

**Response:**
```json
{
  "routeId": "route_51A",
  "routeName": "BIT to MANGALORE",
  "scheduledFrom": "11:00",
  "scheduledTo": "12:20",
  "userLocation": {
    "lat": 12.91234,
    "lon": 74.83567,
    "label": "Your location (scan)"
  },
  "busId": "bus_51A",
  "busNumber": "KA19-1234",
  "driverName": "mercy",
  "etaIso": "2025-11-13T11:45:00+05:30",
  "etaLocal": "11:45",
  "inMinutes": 30,
  "travelSeconds": 1800,
  "source": "osrm",
  "message": "BIT to MANGALORE 11:00 → 12:20 — Real-time ETA: 11:45 (in 30m)"
}
```

**Error Responses:**

- `400`: Missing or invalid parameters
- `404`: No active buses found
- `500`: Server error

## Testing Locally

### 1. Update Bus Location

```bash
curl -X POST http://localhost:3000/api/update-location \
  -H "Content-Type: application/json" \
  -d '{
    "busId": "79255864-00b9-4a6b-95f2-ec4e74a40749",
    "lat": 12.920,
    "lon": 74.820
  }'
```

### 2. Simulate Passenger Scan

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "routeId": "a82fe6a7-2c01-4789-b220-c83657ec1d6f",
    "userLat": 12.91234,
    "userLon": 74.83567,
    "scheduledFrom": "11:00",
    "scheduledTo": "12:20",
    "timeZone": "Asia/Kolkata"
  }'
```

### 3. Test with Real Route IDs

First, get your route IDs:
```bash
curl http://localhost:3000/api/routes
```

Then use the actual route ID and bus ID from your database.

## Configuration

### Environment Variables

```env
# Already in your .env
DATABASE_URL=postgresql://...
PORT=3000
```

### Constants (in code)

- `ACTIVE_BUS_THRESHOLD_SECONDS`: 120 (2 minutes)
- `OSRM_TIMEOUT`: 5000ms
- `CACHE_TTL`: 10000ms (10 seconds)
- `DEFAULT_AVG_SPEED`: 30 km/h

## Database Schema Requirements

The system expects these columns in the `buses` table:
- `last_latitude` (numeric)
- `last_longitude` (numeric)
- `last_location_update` (timestamp)

If these don't exist, run:

```sql
ALTER TABLE buses 
ADD COLUMN IF NOT EXISTS last_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS last_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP DEFAULT NOW();
```

## How It Works

1. **Driver updates location**: POST to `/api/update-location` every 5-10 seconds
2. **Passenger scans QR**: Mobile app sends GPS + route ID to `/api/scan`
3. **System finds active buses**: Queries buses updated within last 2 minutes
4. **Calculate travel time**: 
   - Try OSRM API first (accurate routing)
   - Fallback to haversine + average speed if OSRM fails
5. **Choose best bus**: Selects bus with shortest travel time
6. **Return ETA**: Formatted with timezone, human-readable message
7. **Cache result**: 10-second cache to avoid repeated calculations

## OSRM Integration

Uses the public OSRM demo server:
```
https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false
```

**Note**: For production, consider:
- Self-hosted OSRM instance
- Paid routing service (Mapbox, Google Maps)
- Rate limiting and fallback strategies

## Fallback Strategy

If OSRM fails (timeout, rate limit, error):
1. Calculate straight-line distance (haversine)
2. Estimate time: `distance_km / 30 km/h * 3600`
3. Mark result with `source: "fallback"`

## Caching Strategy

- **Key**: `busId:lat:lon` (coordinates rounded to 5 decimals)
- **TTL**: 10 seconds
- **Purpose**: Reduce OSRM API calls for repeated scans
- **Cleanup**: Automatic every 30 seconds

## Performance

- **OSRM response time**: ~100-500ms
- **Fallback calculation**: <1ms
- **Cache hit**: <1ms
- **Database query**: ~10-50ms

## Security Considerations

1. **Rate limiting**: Add rate limiting to `/api/scan` endpoint
2. **Authentication**: `/api/update-location` should require driver auth
3. **Input validation**: All coordinates validated
4. **Privacy**: User scan locations not persisted by default

## Future Enhancements

1. **Stop order filtering**: Filter buses that passed the stop
2. **Traffic data**: Integrate real-time traffic
3. **Multiple routes**: Support scanning at stops serving multiple routes
4. **Historical data**: Learn from actual travel times
5. **Redis cache**: Replace in-memory cache for scalability
6. **WebSocket updates**: Push ETA updates to waiting passengers

## Troubleshooting

### No active buses found
- Check if drivers are updating location
- Verify `last_location_update` is recent (<2 minutes)
- Check route ID is correct

### OSRM always failing
- Check internet connection
- Verify OSRM demo server is up
- Consider self-hosting OSRM

### Inaccurate ETAs
- Adjust `DEFAULT_AVG_SPEED` for your area
- Use OSRM instead of fallback
- Consider traffic patterns

## Example Integration

### Driver App (React Native)
```javascript
// Update location every 10 seconds
setInterval(async () => {
  const position = await getCurrentPosition();
  await fetch('https://api.nxtbus.com/api/update-location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      busId: driverBusId,
      lat: position.coords.latitude,
      lon: position.coords.longitude
    })
  });
}, 10000);
```

### Passenger App (React Native)
```javascript
// When QR code is scanned
const handleQRScan = async (qrData) => {
  const { routeId, scheduledFrom, scheduledTo } = parseQR(qrData);
  const position = await getCurrentPosition();
  
  const response = await fetch('https://api.nxtbus.com/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routeId,
      userLat: position.coords.latitude,
      userLon: position.coords.longitude,
      scheduledFrom,
      scheduledTo,
      timeZone: 'Asia/Kolkata'
    })
  });
  
  const eta = await response.json();
  showETA(eta.message, eta.inMinutes);
};
```

## Support

For issues or questions, check:
- Server logs: `backend/logs/`
- Database connection: `/health` endpoint
- OSRM status: https://router.project-osrm.org/
