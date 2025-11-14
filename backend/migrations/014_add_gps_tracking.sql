-- GPS Tracking Tables for Real-Time Bus Location

-- Drop existing tables if they exist (in correct order due to dependencies)
DROP TABLE IF EXISTS eta_predictions CASCADE;
DROP TABLE IF EXISTS stop_arrivals CASCADE;
DROP TABLE IF EXISTS trip_status CASCADE;
DROP TABLE IF EXISTS bus_locations CASCADE;
DROP TABLE IF EXISTS route_segment_speeds CASCADE;

-- 1. Bus locations (current position of each bus)
CREATE TABLE bus_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  speed DECIMAL(5, 2), -- km/h
  heading DECIMAL(5, 2), -- degrees (0-360)
  accuracy DECIMAL(6, 2), -- meters
  altitude DECIMAL(8, 2), -- meters
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Stop arrivals (actual arrival times at stops)
CREATE TABLE stop_arrivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id UUID REFERENCES bus_stops(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
  scheduled_arrival TIMESTAMP,
  estimated_arrival TIMESTAMP,
  actual_arrival TIMESTAMP,
  actual_departure TIMESTAMP,
  dwell_time_seconds INTEGER, -- time spent at stop
  passengers_boarded INTEGER DEFAULT 0,
  passengers_alighted INTEGER DEFAULT 0,
  delay_minutes INTEGER, -- positive = late, negative = early
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ETA predictions (calculated arrival times)
CREATE TABLE eta_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id UUID REFERENCES bus_stops(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  predicted_arrival TIMESTAMP NOT NULL,
  confidence_score DECIMAL(3, 2), -- 0.00 to 1.00
  distance_km DECIMAL(6, 2),
  estimated_minutes INTEGER,
  calculation_method VARCHAR(50), -- 'gps_based', 'historical', 'hybrid'
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Historical speed data (for better predictions)
CREATE TABLE route_segment_speeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  from_stop_id UUID REFERENCES bus_stops(id) ON DELETE CASCADE,
  to_stop_id UUID REFERENCES bus_stops(id) ON DELETE CASCADE,
  avg_speed_kmh DECIMAL(5, 2),
  avg_duration_seconds INTEGER,
  time_of_day VARCHAR(20), -- 'morning_peak', 'afternoon', 'evening_peak', 'night'
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
  sample_count INTEGER DEFAULT 1,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_bus_locations_bus_id ON bus_locations(bus_id);
CREATE INDEX idx_bus_locations_recorded_at ON bus_locations(recorded_at DESC);
CREATE INDEX idx_bus_locations_route_id ON bus_locations(route_id);
CREATE INDEX idx_bus_locations_location ON bus_locations USING GIST(location);

CREATE INDEX idx_stop_arrivals_stop_id ON stop_arrivals(stop_id);
CREATE INDEX idx_stop_arrivals_bus_id ON stop_arrivals(bus_id);
CREATE INDEX idx_stop_arrivals_route_id ON stop_arrivals(route_id);
CREATE INDEX idx_stop_arrivals_actual_arrival ON stop_arrivals(actual_arrival);

CREATE INDEX idx_eta_predictions_stop_id ON eta_predictions(stop_id);
CREATE INDEX idx_eta_predictions_bus_id ON eta_predictions(bus_id);
CREATE INDEX idx_eta_predictions_route_id ON eta_predictions(route_id);
CREATE INDEX idx_eta_predictions_calculated_at ON eta_predictions(calculated_at DESC);

CREATE INDEX idx_route_segment_speeds_route_id ON route_segment_speeds(route_id);
CREATE INDEX idx_route_segment_speeds_stops ON route_segment_speeds(from_stop_id, to_stop_id);

-- Function to clean old location data (keep last 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_locations() RETURNS void AS $$
BEGIN
  DELETE FROM bus_locations WHERE recorded_at < NOW() - INTERVAL '24 hours';
  DELETE FROM eta_predictions WHERE calculated_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate delay
CREATE OR REPLACE FUNCTION calculate_delay(scheduled TIMESTAMP, actual TIMESTAMP) RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(EPOCH FROM (actual - scheduled)) / 60;
END;
$$ LANGUAGE plpgsql;
