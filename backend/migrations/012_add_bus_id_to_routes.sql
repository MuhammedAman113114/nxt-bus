-- Add bus_id column to routes table to properly link routes to buses

ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS bus_id UUID REFERENCES buses(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_routes_bus_id ON routes(bus_id);

-- Add comment
COMMENT ON COLUMN routes.bus_id IS 'Foreign key to buses table - which bus operates this route';

-- Try to populate bus_id from description field where possible
-- Description format is "Bus: [bus_number]"
UPDATE routes r
SET bus_id = b.id
FROM buses b
WHERE r.description LIKE 'Bus: ' || b.bus_number || '%'
AND r.bus_id IS NULL;
