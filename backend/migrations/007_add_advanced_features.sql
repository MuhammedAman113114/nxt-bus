-- Phase 2 & 3: Advanced Scheduling and GPS Analytics

-- 1. Holidays table (system-wide or route-specific)
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  affects_all_routes BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Operating days (exceptions for specific schedules)
CREATE TABLE IF NOT EXISTS operating_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_schedule_id UUID REFERENCES trip_schedules(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_operating BOOLEAN NOT NULL,
  reason VARCHAR(200), -- 'holiday', 'maintenance', 'special_event', 'custom'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(trip_schedule_id, date)
);

-- 3. GPS traces (for analysis and stop detection)
CREATE TABLE IF NOT EXISTS gps_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  speed DECIMAL(5, 2), -- km/h
  heading DECIMAL(5, 2), -- degrees
  accuracy DECIMAL(5, 2), -- meters
  recorded_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Trip stop events (actual arrivals/departures detected from GPS)
CREATE TABLE IF NOT EXISTS trip_stop_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES bus_stops(id) ON DELETE CASCADE,
  stop_sequence INTEGER NOT NULL,
  scheduled_arrival TIME,
  actual_arrival TIMESTAMP,
  actual_departure TIMESTAMP,
  dwell_time_seconds INTEGER,
  passengers_boarded INTEGER DEFAULT 0,
  passengers_alighted INTEGER DEFAULT 0,
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  detection_method VARCHAR(20) DEFAULT 'gps', -- 'gps', 'manual', 'estimated'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(trip_id, stop_id)
);

-- 5. Add fare information to routes
ALTER TABLE routes ADD COLUMN IF NOT EXISTS base_fare DECIMAL(6, 2) DEFAULT 0;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS fare_per_km DECIMAL(6, 2) DEFAULT 0;

-- 6. Add peak/off-peak pricing to trip schedules
ALTER TABLE trip_schedules ADD COLUMN IF NOT EXISTS is_peak_hours BOOLEAN DEFAULT false;
ALTER TABLE trip_schedules ADD COLUMN IF NOT EXISTS fare_multiplier DECIMAL(3, 2) DEFAULT 1.0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_operating_days_schedule ON operating_days(trip_schedule_id);
CREATE INDEX IF NOT EXISTS idx_operating_days_date ON operating_days(date);
CREATE INDEX IF NOT EXISTS idx_gps_traces_trip ON gps_traces(trip_id);
CREATE INDEX IF NOT EXISTS idx_gps_traces_recorded_at ON gps_traces(recorded_at);
CREATE INDEX IF NOT EXISTS idx_gps_traces_trip_time ON gps_traces(trip_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_trip_stop_events_trip ON trip_stop_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_stop_events_stop ON trip_stop_events(stop_id);
CREATE INDEX IF NOT EXISTS idx_trip_stop_events_sequence ON trip_stop_events(trip_id, stop_sequence);

-- Insert sample holidays
INSERT INTO holidays (date, name, description, affects_all_routes) VALUES
  ('2025-12-25', 'Christmas Day', 'National Holiday', true),
  ('2026-01-01', 'New Year''s Day', 'National Holiday', true),
  ('2026-01-26', 'Republic Day', 'National Holiday', true),
  ('2026-08-15', 'Independence Day', 'National Holiday', true),
  ('2026-10-02', 'Gandhi Jayanti', 'National Holiday', true)
ON CONFLICT (date) DO NOTHING;

-- Simplified function to detect stop events from GPS traces
CREATE OR REPLACE FUNCTION detect_stop_events(p_trip_id UUID)
RETURNS INTEGER AS $$
DECLARE
  events_created INTEGER := 0;
BEGIN
  -- Insert stop events based on GPS proximity and low speed
  INSERT INTO trip_stop_events (
    trip_id, stop_id, stop_sequence,
    actual_arrival, actual_departure, dwell_time_seconds,
    gps_latitude, gps_longitude, detection_method
  )
  SELECT 
    p_trip_id,
    rs.stop_id,
    rs.stop_sequence,
    MIN(gt.recorded_at) as actual_arrival,
    MAX(gt.recorded_at) as actual_departure,
    EXTRACT(EPOCH FROM (MAX(gt.recorded_at) - MIN(gt.recorded_at)))::INTEGER as dwell_time_seconds,
    AVG(gt.latitude) as gps_latitude,
    AVG(gt.longitude) as gps_longitude,
    'gps' as detection_method
  FROM trips t
  JOIN route_stops rs ON t.route_id = rs.route_id
  JOIN bus_stops bs ON rs.stop_id = bs.id
  JOIN gps_traces gt ON gt.trip_id = t.id
  WHERE t.id = p_trip_id
  AND (gt.speed IS NULL OR gt.speed < 5) -- Stopped or slow
  AND (
    -- Within 50m of stop (simplified Haversine)
    SQRT(
      POW(111.32 * (gt.latitude - bs.location.latitude), 2) +
      POW(111.32 * COS(RADIANS(bs.location.latitude)) * (gt.longitude - bs.location.longitude), 2)
    ) < 0.05
  )
  GROUP BY rs.stop_id, rs.stop_sequence
  HAVING COUNT(*) > 0
  ON CONFLICT (trip_id, stop_id) DO UPDATE SET
    actual_arrival = EXCLUDED.actual_arrival,
    actual_departure = EXCLUDED.actual_departure,
    dwell_time_seconds = EXCLUDED.dwell_time_seconds;
  
  GET DIAGNOSTICS events_created = ROW_COUNT;
  RETURN events_created;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a date is operating day
CREATE OR REPLACE FUNCTION is_operating_day(p_schedule_id UUID, p_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
  is_holiday BOOLEAN;
  exception_record RECORD;
  day_of_week INTEGER;
  schedule_days INTEGER[];
BEGIN
  -- Check if it's a holiday
  SELECT EXISTS(SELECT 1 FROM holidays WHERE date = p_date AND affects_all_routes = true)
  INTO is_holiday;
  
  IF is_holiday THEN
    RETURN false;
  END IF;
  
  -- Check for specific exception
  SELECT * INTO exception_record
  FROM operating_days
  WHERE trip_schedule_id = p_schedule_id AND date = p_date;
  
  IF FOUND THEN
    RETURN exception_record.is_operating;
  END IF;
  
  -- Check regular schedule
  day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;
  SELECT days_of_week INTO schedule_days
  FROM trip_schedules
  WHERE id = p_schedule_id;
  
  RETURN day_of_week = ANY(schedule_days);
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE holidays IS 'System-wide or route-specific holidays';
COMMENT ON TABLE operating_days IS 'Exceptions to regular schedules (maintenance, special events)';
COMMENT ON TABLE gps_traces IS 'Raw GPS data for analysis and stop detection';
COMMENT ON TABLE trip_stop_events IS 'Detected arrival/departure times at stops';
COMMENT ON FUNCTION detect_stop_events IS 'Analyzes GPS traces to detect stop events';
COMMENT ON FUNCTION is_operating_day IS 'Checks if a schedule operates on a given date';
