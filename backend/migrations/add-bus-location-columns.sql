-- Add GPS tracking columns to buses table
-- Run this migration to enable real-time ETA functionality

ALTER TABLE buses 
ADD COLUMN IF NOT EXISTS last_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS last_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP DEFAULT NOW();

-- Create index for faster queries on location updates
CREATE INDEX IF NOT EXISTS idx_buses_location_update 
ON buses(last_location_update DESC) 
WHERE last_latitude IS NOT NULL AND last_longitude IS NOT NULL;

-- Add comment
COMMENT ON COLUMN buses.last_latitude IS 'Last reported GPS latitude from driver';
COMMENT ON COLUMN buses.last_longitude IS 'Last reported GPS longitude from driver';
COMMENT ON COLUMN buses.last_location_update IS 'Timestamp of last GPS update';
