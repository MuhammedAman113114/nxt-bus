# Admin Bus Management System

## Overview
Complete admin interface for managing buses that will be visible to passengers on their routes.

## Features Implemented

### Admin Dashboard (`/admin`)
- Add new buses with details
- Edit existing buses
- Delete buses
- Assign buses to routes
- Set bus status (active/inactive/maintenance)

### Bus Details
- **Bus Number**: Unique identifier (e.g., BUS-001)
- **Registration Number**: Vehicle registration (e.g., KA-01-AB-1234)
- **Capacity**: Number of seats (10-100)
- **Route Assignment**: Link bus to specific route
- **Status**: Active, Inactive, or Maintenance

### Backend API Endpoints

#### Get All Buses (Admin Only)
```
GET /api/buses
Authorization: Bearer {admin_token}
```

#### Get Bus by ID
```
GET /api/buses/:id
```

#### Create New Bus (Admin Only)
```
POST /api/buses
Authorization: Bearer {admin_token}
Body: {
  busNumber: string,
  registrationNumber: string,
  capacity: number,
  routeId: string (optional),
  status: 'active' | 'inactive' | 'maintenance'
}
```

#### Update Bus (Admin Only)
```
PUT /api/buses/:id
Authorization: Bearer {admin_token}
Body: {
  busNumber: string,
  registrationNumber: string,
  capacity: number,
  routeId: string,
  status: string
}
```

#### Delete Bus (Admin Only)
```
DELETE /api/buses/:id
Authorization: Bearer {admin_token}
```

#### Get Buses by Route (Public)
```
GET /api/buses/route/:routeId
```

## How It Works

### Admin Side:
1. Admin logs in with admin credentials
2. Navigates to `/admin` dashboard
3. Adds bus details (number, registration, capacity)
4. Assigns bus to a route
5. Sets status (active/inactive/maintenance)
6. Bus is saved to database

### Passenger Side:
1. Passenger views routes at `/routes`
2. Clicks on a route to see details
3. Sees all buses assigned to that route
4. Can track active buses in real-time
5. Sees bus details (number, capacity, status)

## Database Schema

```sql
CREATE TABLE buses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_number VARCHAR(50) UNIQUE NOT NULL,
  registration_number VARCHAR(50) NOT NULL,
  capacity INTEGER DEFAULT 40,
  route_id UUID REFERENCES routes(id),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Access Control

- **Admin**: Full CRUD access to buses
- **Driver**: Can view assigned bus
- **Passenger**: Can view buses on routes

## Usage Example

### Adding a Bus:
1. Go to `/admin`
2. Click "Add New Bus"
3. Fill in:
   - Bus Number: BUS-001
   - Registration: KA-01-AB-1234
   - Capacity: 40
   - Route: Select from dropdown
   - Status: Active
4. Click "Add Bus"

### Viewing Buses (Passenger):
1. Go to `/routes`
2. Click on any route
3. See "Active Buses" section
4. View bus details and real-time location

## Status Indicators

- 🟢 **Active**: Bus is operational and can be tracked
- ⚫ **Inactive**: Bus is not in service
- 🟡 **Maintenance**: Bus is under maintenance

## Integration with Existing Features

### Route Page
- Shows all buses assigned to the route
- Displays bus number, capacity, and status
- Real-time tracking for active buses

### Bus Tracking Page
- Lists all active buses
- Shows which route each bus is on
- Real-time location updates

### Driver Dashboard
- Driver sees their assigned bus details
- Can start GPS tracking for their bus

## Testing

### Create Admin User:
```sql
INSERT INTO users (email, password_hash, role)
VALUES ('admin@test.com', '$2b$10$...', 'admin');
```

### Test Flow:
1. Login as admin: `admin@test.com` / `password123`
2. Navigate to `/admin`
3. Add a test bus
4. Assign it to a route
5. Login as passenger
6. View the route
7. See the bus listed

## Next Steps

1. **Start Backend**: `cd backend && npm run dev`
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Access Admin**: `http://localhost:5173/admin`
4. **Add Buses**: Create buses and assign to routes
5. **Test Passenger View**: Check routes page to see buses

## Security

- Admin endpoints protected with JWT authentication
- Role-based access control (admin only)
- Input validation on all fields
- SQL injection prevention with parameterized queries

## Benefits

✅ Centralized bus management
✅ Easy route assignment
✅ Real-time passenger visibility
✅ Status tracking (active/maintenance)
✅ Capacity management
✅ Complete audit trail

The admin can now manage the entire bus fleet, and passengers will see all buses on their routes with real-time tracking! 🚌✨
