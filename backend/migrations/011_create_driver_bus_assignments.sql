-- Create a simple table for owner to assign drivers to their buses
-- This allows multiple drivers per bus (for different shifts/days)

CREATE TABLE IF NOT EXISTS driver_bus_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES owners(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(bus_id, driver_id, status)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_driver_bus_assignments_bus ON driver_bus_assignments(bus_id);
CREATE INDEX IF NOT EXISTS idx_driver_bus_assignments_driver ON driver_bus_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_bus_assignments_status ON driver_bus_assignments(status);

-- Add comments
COMMENT ON TABLE driver_bus_assignments IS 'Assigns drivers to buses - allows multiple drivers per bus';
COMMENT ON COLUMN driver_bus_assignments.status IS 'active or inactive';
