-- Add route details columns for from/to locations and times

-- Add columns to routes table
ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS from_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS to_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS departure_time TIME,
ADD COLUMN IF NOT EXISTS reaching_time TIME;

-- Add comment
COMMENT ON COLUMN routes.from_location IS 'Starting location name for the route';
COMMENT ON COLUMN routes.to_location IS 'Ending location name for the route';
COMMENT ON COLUMN routes.departure_time IS 'Scheduled departure time from starting location';
COMMENT ON COLUMN routes.reaching_time IS 'Scheduled reaching time at ending location';

