-- Create bus_stops table if it doesn't exist
CREATE TABLE IF NOT EXISTS bus_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  qr_code VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for spatial queries
CREATE INDEX IF NOT EXISTS idx_bus_stops_location ON bus_stops USING GIST(location);

-- Create index for QR code lookups
CREATE INDEX IF NOT EXISTS idx_bus_stops_qr_code ON bus_stops(qr_code);

-- Create index for name searches
CREATE INDEX IF NOT EXISTS idx_bus_stops_name ON bus_stops(name);
