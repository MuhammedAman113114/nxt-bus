# Owner Dashboard Implementation Plan

## Overview
Create a complete Owner Dashboard where bus owners can manage their fleet, track buses, view analytics, and assign drivers.

## Phase 1: Owner Authentication ✅ (To Implement)

### Database Changes
1. Add `password` field to owners table
2. Add `role` field (set to 'owner')
3. Migration script to update existing owners

### Backend Changes
1. Update auth service to support owner login
2. Create owner-specific middleware
3. Update owners API endpoints

### Frontend Changes
1. Owner login page
2. Owner role detection in auth flow

## Phase 2: Owner Dashboard ✅ (To Implement)

### Features
1. **My Buses**
   - List all buses owned by the logged-in owner
   - Bus details (name, registration, status)
   - Real-time location tracking
   - Add/Edit/Delete buses

2. **Driver Management**
   - View all drivers
   - Assign driver to bus
   - Remove driver assignment
   - Driver contact information

3. **Analytics**
   - Total buses count
   - Active buses today
   - Total trips completed
   - Total distance covered
   - Revenue summary (if applicable)

4. **Live Tracking**
   - Map view showing all owner's buses
   - Real-time location updates
   - Bus status indicators
   - Route information

5. **Trip History**
   - List of all trips by owner's buses
   - Date range filter
   - Trip details (route, driver, duration)

## Phase 3: Driver Assignment ✅ (To Implement)

### Features
1. **Assign Driver to Bus**
   - Search drivers
   - Select bus
   - Set assignment period
   - Save assignment

2. **View Assignments**
   - Current assignments
   - Assignment history
   - Unassign driver

## Implementation Steps

### Step 1: Database Migration
```sql
-- Add password and role to owners
ALTER TABLE owners ADD COLUMN password VARCHAR(255);
ALTER TABLE owners ADD COLUMN role VARCHAR(50) DEFAULT 'owner';
```

### Step 2: Create Owner Dashboard Page
- OwnerDashboard.tsx
- Components:
  - BusesOverview
  - DriversList
  - Analytics
  - LiveMap
  - TripHistory

### Step 3: Backend APIs
- GET /api/owner/buses - Get owner's buses
- GET /api/owner/drivers - Get available drivers
- POST /api/owner/assign-driver - Assign driver to bus
- GET /api/owner/analytics - Get analytics data
- GET /api/owner/trips - Get trip history

### Step 4: Real-time Tracking
- WebSocket integration for live bus locations
- Map component with owner's buses only

## User Flow

1. **Owner Login**
   - Email: owner@example.com
   - Password: (set during registration)
   - Redirects to Owner Dashboard

2. **Dashboard View**
   - Top: Analytics cards (buses, trips, revenue)
   - Left: Navigation (Buses, Drivers, Tracking, Reports)
   - Center: Main content area
   - Right: Quick actions

3. **Assign Driver**
   - Click "Assign Driver" on a bus
   - Search and select driver
   - Confirm assignment
   - Driver can now track that bus

## Security
- Owner can only see/manage their own buses
- Owner cannot see other owners' data
- Driver assignment requires owner authentication
- All APIs protected with owner role check

## Next Steps
1. Run database migration
2. Create owner dashboard frontend
3. Implement backend APIs
4. Add real-time tracking
5. Test complete flow

