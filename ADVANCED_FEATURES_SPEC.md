# Advanced Features Specification - Trip & Schedule Management

## Current System vs Required Features

### ✅ Currently Implemented (Basic System)
- Static bus-to-route assignment
- Real-time GPS tracking
- Basic ETA calculations
- QR code scanning at stops
- Driver dashboard with GPS sharing
- Admin management (buses, routes, stops, owners)

### 🔄 Required Advanced Features

## 1. Dynamic Driver-Bus Assignment (Per-Trip)

### Current Limitation
- Drivers are not explicitly assigned to buses
- Buses have static route assignments

### Required Changes

#### Database Schema
```sql
-- Driver assignments table (per trip)
CREATE TABLE driver_assignments (
  id UUID PRIMARY KEY,
  driver_id UUID REFERENCES users(id),
  bus_id UUID REFERENCES buses(id),
  trip_id UUID REFERENCES trips(id),
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  status VARCHAR(20) -- 'scheduled', 'active', 'completed', 'cancelled'
);

-- Drivers table (extend users)
ALTER TABLE users ADD COLUMN driver_license VARCHAR(50);
ALTER TABLE users ADD COLUMN driver_phone VARCHAR(20);
```

#### Features Needed
- Admin can assign drivers to specific trips
- Driver sees only their assigned trips for the day
- Multiple drivers can be assigned to same bus on different trips
- Assignment history tracking

---

## 2. Multiple Routes Per Bus (Daily Variation)

### Current Limitation
- Bus has single `route_id` (static assignment)

### Required Changes

#### Database Schema
```sql
-- Remove static route_id from buses
ALTER TABLE buses DROP COLUMN route_id;

-- Trips table (core scheduling entity)
CREATE TABLE trips (
  id UUID PRIMARY KEY,
  bus_id UUID REFERENCES buses(id),
  route_id UUID REFERENCES routes(id),
  trip_name VARCHAR(100), -- e.g., "Morning Mangalore-Udupi"
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  trip_date DATE,
  status VARCHAR(20), -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  created_at TIMESTAMP
);

-- Trip schedule (recurring patterns)
CREATE TABLE trip_schedules (
  id UUID PRIMARY KEY,
  bus_id UUID REFERENCES buses(id),
  route_id UUID REFERENCES routes(id),
  start_time TIME,
  end_time TIME,
  days_of_week INTEGER[], -- [1,2,3,4,5] for Mon-Fri
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN
);
```

#### Features Needed
- Admin creates trip schedules for each bus
- System generates daily trips from schedules
- Bus can have multiple trips per day on different routes
- Example: Bus #1
  - 08:00-10:00: Mangalore → Udupi
  - 14:00-16:00: Udupi → Karkala
  - 18:00-20:00: Karkala → Mangalore

---

## 3. Custom Operating Days & Exceptions

### Required Changes

#### Database Schema
```sql
-- Operating calendar
CREATE TABLE operating_days (
  id UUID PRIMARY KEY,
  trip_schedule_id UUID REFERENCES trip_schedules(id),
  date DATE,
  is_operating BOOLEAN,
  reason VARCHAR(200), -- 'holiday', 'maintenance', 'special_event'
  created_at TIMESTAMP
);

-- Holiday calendar
CREATE TABLE holidays (
  id UUID PRIMARY KEY,
  date DATE,
  name VARCHAR(100),
  affects_all_routes BOOLEAN,
  created_at TIMESTAMP
);
```

#### Features Needed
- Admin defines holidays (system-wide or route-specific)
- Admin can mark specific dates as non-operating
- Admin can add special operating days
- System automatically skips trip generation on holidays
- Maintenance windows can be scheduled

---

## 4. Multiple Trips Per Day (Same Route)

### Example Scenario
Bus #1 on Route "Mangalore-BIT":
- Trip 1: 08:00 departure
- Trip 2: 11:00 departure  
- Trip 3: 15:00 departure

### Implementation
Already covered by trips table above. Each trip is a separate record with:
- Same `bus_id` and `route_id`
- Different `scheduled_start_time`
- Unique `trip_id`

---

## 5. GPS-Based Stop Timing Inference (Scenario 6)

### Current Limitation
- Stop times are not tracked
- No historical data collection

### Required Changes

#### Database Schema
```sql
-- Trip stop events (actual arrivals/departures)
CREATE TABLE trip_stop_events (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(id),
  stop_id UUID REFERENCES bus_stops(id),
  stop_sequence INTEGER,
  scheduled_arrival TIME,
  actual_arrival TIMESTAMP,
  actual_departure TIMESTAMP,
  dwell_time_seconds INTEGER,
  passengers_boarded INTEGER,
  passengers_alighted INTEGER,
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  created_at TIMESTAMP
);

-- GPS traces (for analysis)
CREATE TABLE gps_traces (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  speed DECIMAL(5, 2),
  heading DECIMAL(5, 2),
  accuracy DECIMAL(5, 2),
  recorded_at TIMESTAMP,
  created_at TIMESTAMP
);
```

#### Features Needed
- **GPS Trace Collection**: Store all GPS points during trip
- **Stop Detection Algorithm**:
  - Detect when bus is within 50m of stop
  - Detect when bus speed < 5 km/h (stopped)
  - Record arrival time (first detection)
  - Record departure time (when speed > 5 km/h again)
  - Calculate dwell time
- **Historical Analysis**:
  - Average arrival times per stop
  - Average dwell times
  - Delay patterns
  - Use for better ETA predictions

#### Algorithm Pseudocode
```python
def detect_stop_events(trip_id, gps_traces):
    for each stop in route:
        nearby_points = filter(gps_traces, distance_to_stop < 50m)
        
        if nearby_points:
            stopped_points = filter(nearby_points, speed < 5 km/h)
            
            if stopped_points:
                arrival_time = min(stopped_points.timestamp)
                departure_time = max(stopped_points.timestamp)
                dwell_time = departure_time - arrival_time
                
                save_trip_stop_event(
                    trip_id, stop_id, 
                    arrival_time, departure_time, dwell_time
                )
```

---

## 6. Route Service Windows (Scenario 7)

### Required Changes

#### Database Schema
```sql
-- Add service window to routes
ALTER TABLE routes ADD COLUMN service_start_time TIME;
ALTER TABLE routes ADD COLUMN service_end_time TIME;
ALTER TABLE routes ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Route stops with expected times
CREATE TABLE route_stops (
  id UUID PRIMARY KEY,
  route_id UUID REFERENCES routes(id),
  stop_id UUID REFERENCES bus_stops(id),
  stop_sequence INTEGER,
  expected_dwell_time_seconds INTEGER DEFAULT 60,
  distance_from_previous_km DECIMAL(6, 2),
  created_at TIMESTAMP,
  UNIQUE(route_id, stop_sequence)
);
```

#### Features Needed
- Admin defines route service window (e.g., 06:00-22:00)
- System prevents trip scheduling outside service window
- Each stop has expected dwell time
- Route editing updates all future trips
- Historical trips remain unchanged

---

## Implementation Priority

### Phase 1: Core Trip Management (High Priority)
1. ✅ Create trips table
2. ✅ Create trip_schedules table
3. ✅ Admin UI for creating trip schedules
4. ✅ Daily trip generation from schedules
5. ✅ Driver sees assigned trips
6. ✅ Driver starts specific trip (not just "tracking")

### Phase 2: Advanced Scheduling (Medium Priority)
1. ✅ Operating days & holidays
2. ✅ Multiple trips per day per bus
3. ✅ Driver-trip assignments
4. ✅ Route service windows

### Phase 3: GPS Analytics (Lower Priority)
1. ✅ GPS trace collection
2. ✅ Stop event detection algorithm
3. ✅ Historical analysis
4. ✅ Improved ETA predictions

---

## API Endpoints Needed

### Trip Management
```
POST   /api/trips/schedules          - Create trip schedule
GET    /api/trips/schedules          - List all schedules
PUT    /api/trips/schedules/:id      - Update schedule
DELETE /api/trips/schedules/:id      - Delete schedule

GET    /api/trips/daily/:date        - Get trips for specific date
POST   /api/trips/generate/:date     - Generate trips for date
GET    /api/trips/:id                - Get trip details
PUT    /api/trips/:id/start          - Start trip
PUT    /api/trips/:id/end            - End trip

GET    /api/drivers/:id/trips        - Get driver's assigned trips
POST   /api/trips/:id/assign-driver  - Assign driver to trip
```

### Operating Days
```
POST   /api/holidays                 - Add holiday
GET    /api/holidays                 - List holidays
DELETE /api/holidays/:id             - Remove holiday

POST   /api/operating-days           - Mark day as non-operating
GET    /api/operating-days/:date     - Check if date is operating
```

### GPS Analytics
```
POST   /api/trips/:id/gps-trace      - Record GPS point
GET    /api/trips/:id/stop-events    - Get stop events for trip
GET    /api/stops/:id/analytics      - Get stop timing analytics
```

---

## UI Changes Needed

### Admin Dashboard
- **Trip Schedules Tab**
  - Create recurring schedules
  - View calendar of trips
  - Assign drivers to trips
  - Mark holidays/exceptions

### Driver Dashboard
- **My Trips View**
  - List of today's assigned trips
  - Select trip to start
  - Trip progress indicator
  - Stop checklist

### Passenger App
- **Trip Selection**
  - See multiple trips for same route
  - Choose specific trip time
  - Real-time tracking per trip

---

## Migration Path

### Step 1: Database Migration
```bash
node backend/migrations/006_add_trip_management.js
```

### Step 2: Update Existing Data
- Convert current bus-route assignments to trip schedules
- Generate trips for next 30 days
- Assign default service windows to routes

### Step 3: Update APIs
- Modify driver tracking to use trip_id
- Update ETA calculations to use trip data
- Add trip management endpoints

### Step 4: Update UI
- Add trip selection to driver dashboard
- Add trip schedules to admin panel
- Update passenger app to show trip times

---

## Estimated Effort

- **Phase 1 (Core Trips)**: 2-3 weeks
- **Phase 2 (Scheduling)**: 1-2 weeks
- **Phase 3 (GPS Analytics)**: 2-3 weeks

**Total**: 5-8 weeks for complete implementation

---

## Questions to Clarify

1. **Driver Assignment**: Should drivers be able to self-assign to available trips, or only admin assigns?
2. **Trip Cancellation**: What happens to passengers tracking a cancelled trip?
3. **GPS Trace Storage**: How long should we keep GPS traces? (Storage consideration)
4. **Stop Detection**: Should passengers be able to report incorrect stop times?
5. **Fare Calculation**: Should fares vary by trip time (peak/off-peak)?

---

## Next Steps

Would you like me to:
1. **Start implementing Phase 1** (Core Trip Management)?
2. **Create detailed database migrations** for all tables?
3. **Design the Trip Schedules UI** mockups?
4. **Implement GPS trace collection** first?

Let me know which feature you'd like to prioritize! 🚀
