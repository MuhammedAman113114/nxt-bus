-- Phase 1: Core Trip Management Tables

-- 1. Trips table (individual trip instances)
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  trip_name VARCHAR(100),
  scheduled_start_time TIME NOT NULL,
  scheduled_end_time TIME,
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  trip_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Trip schedules (recurring patterns)
CREATE TABLE IF NOT EXISTS trip_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  schedule_name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  days_of_week INTEGER[] NOT NULL, -- [0,1,2,3,4,5,6] for Sun-Sat
  valid_from DATE NOT NULL,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Driver assignments (per trip)
CREATE TABLE IF NOT EXISTS driver_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'assigned', -- 'assigned', 'accepted', 'started', 'completed', 'cancelled'
  notes TEXT,
  UNIQUE(trip_id, driver_id)
);

-- 4. Update existing route_stops table (if it exists)
DO $$ 
BEGIN
  -- Add stop_sequence column if it doesn't exist (rename from stop_order)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'route_stops' AND column_name = 'stop_order') THEN
    ALTER TABLE route_stops RENAME COLUMN stop_order TO stop_sequence;
  END IF;
  
  -- Add expected_dwell_time_seconds if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'route_stops' AND column_name = 'expected_dwell_time_seconds') THEN
    ALTER TABLE route_stops ADD COLUMN expected_dwell_time_seconds INTEGER DEFAULT 60;
  END IF;
  
  -- Rename distance_from_previous to distance_from_previous_km if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'route_stops' AND column_name = 'distance_from_previous') THEN
    ALTER TABLE route_stops RENAME COLUMN distance_from_previous TO distance_from_previous_km;
  END IF;
  
  -- Add created_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'route_stops' AND column_name = 'created_at') THEN
    ALTER TABLE route_stops ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Create route_stops table if it doesn't exist
CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES bus_stops(id) ON DELETE CASCADE,
  stop_sequence INTEGER NOT NULL,
  expected_dwell_time_seconds INTEGER DEFAULT 60,
  distance_from_previous_km DECIMAL(6, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Add service window to routes
ALTER TABLE routes ADD COLUMN IF NOT EXISTS service_start_time TIME DEFAULT '06:00:00';
ALTER TABLE routes ADD COLUMN IF NOT EXISTS service_end_time TIME DEFAULT '22:00:00';
ALTER TABLE routes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 6. Add driver info to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_license VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(20);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_bus_id ON trips(bus_id);
CREATE INDEX IF NOT EXISTS idx_trips_route_id ON trips(route_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trip_schedules_bus_id ON trip_schedules(bus_id);
CREATE INDEX IF NOT EXISTS idx_trip_schedules_route_id ON trip_schedules(route_id);
CREATE INDEX IF NOT EXISTS idx_trip_schedules_active ON trip_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver_id ON driver_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_trip_id ON driver_assignments(trip_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_sequence ON route_stops(route_id, stop_sequence);

-- Create sample trip schedules from existing bus-route assignments
INSERT INTO trip_schedules (
  bus_id, 
  route_id, 
  schedule_name, 
  start_time, 
  end_time,
  days_of_week,
  valid_from,
  is_active
)
SELECT 
  b.id as bus_id,
  b.route_id,
  'Daily Service - ' || b.bus_number as schedule_name,
  '08:00:00' as start_time,
  '18:00:00' as end_time,
  ARRAY[1,2,3,4,5] as days_of_week, -- Monday to Friday
  CURRENT_DATE as valid_from,
  true as is_active
FROM buses b
WHERE b.route_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Generate trips for next 7 days from schedules
DO $$
DECLARE
  schedule_record RECORD;
  day_offset INTEGER;
  trip_date DATE;
  day_of_week INTEGER;
BEGIN
  FOR schedule_record IN 
    SELECT * FROM trip_schedules WHERE is_active = true
  LOOP
    FOR day_offset IN 0..6 LOOP
      trip_date := CURRENT_DATE + day_offset;
      day_of_week := EXTRACT(DOW FROM trip_date)::INTEGER; -- 0=Sunday, 6=Saturday
      
      -- Check if this day is in the schedule
      IF day_of_week = ANY(schedule_record.days_of_week) THEN
        INSERT INTO trips (
          bus_id,
          route_id,
          trip_name,
          scheduled_start_time,
          scheduled_end_time,
          trip_date,
          status
        ) VALUES (
          schedule_record.bus_id,
          schedule_record.route_id,
          schedule_record.schedule_name,
          schedule_record.start_time,
          schedule_record.end_time,
          trip_date,
          'scheduled'
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Generated trips for next 7 days';
END $$;

-- Add comments for documentation
COMMENT ON TABLE trips IS 'Individual trip instances for specific dates';
COMMENT ON TABLE trip_schedules IS 'Recurring trip patterns (e.g., daily, weekdays)';
COMMENT ON TABLE driver_assignments IS 'Driver assignments to specific trips';
COMMENT ON TABLE route_stops IS 'Ordered stops for each route with timing information';
COMMENT ON COLUMN trips.status IS 'scheduled, in_progress, completed, cancelled';
COMMENT ON COLUMN trip_schedules.days_of_week IS 'Array of day numbers: 0=Sunday, 1=Monday, ..., 6=Saturday';
