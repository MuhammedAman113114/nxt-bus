-- Fix buses table structure to match API expectations

-- Add missing columns
ALTER TABLE buses ADD COLUMN IF NOT EXISTS bus_number VARCHAR(50);
ALTER TABLE buses ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id);
ALTER TABLE buses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE buses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing buses with bus numbers using a subquery
WITH numbered_buses AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM buses
  WHERE bus_number IS NULL
)
UPDATE buses
SET bus_number = 'BUS-' || LPAD(numbered_buses.rn::TEXT, 3, '0')
FROM numbered_buses
WHERE buses.id = numbered_buses.id;

-- Update status based on is_active
UPDATE buses 
SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END
WHERE status IS NULL OR status = 'active';

-- Make bus_number NOT NULL after populating
ALTER TABLE buses ALTER COLUMN bus_number SET NOT NULL;

-- Add unique constraint on bus_number
ALTER TABLE buses ADD CONSTRAINT buses_bus_number_unique UNIQUE (bus_number);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_buses_route_id ON buses(route_id);
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
CREATE INDEX IF NOT EXISTS idx_buses_bus_number ON buses(bus_number);

-- Update some buses to have routes (if routes exist)
DO $$
DECLARE
  route_record RECORD;
  bus_record RECORD;
  counter INT := 0;
BEGIN
  FOR route_record IN SELECT id FROM routes LIMIT 3 LOOP
    FOR bus_record IN SELECT id FROM buses WHERE route_id IS NULL LIMIT 2 LOOP
      UPDATE buses SET route_id = route_record.id WHERE id = bus_record.id;
      counter := counter + 1;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Assigned % buses to routes', counter;
END $$;
