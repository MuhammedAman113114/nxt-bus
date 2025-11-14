-- Enhanced Driver-Bus Assignment System

-- Drop existing table if it exists
DROP TABLE IF EXISTS driver_bus_assignments_new CASCADE;

-- Create enhanced driver-bus assignments table
CREATE TABLE driver_bus_assignments_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who assigned
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'pending_approval'
  is_primary BOOLEAN DEFAULT false, -- Primary bus for this driver
  can_switch_to_same_name BOOLEAN DEFAULT true, -- Can switch to buses with same name
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(driver_id, bus_id)
);

-- Create bus change requests table (for approval workflow)
CREATE TABLE bus_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  current_bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
  requested_bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add bus_name column to buses table (extracted from bus_number)
ALTER TABLE buses ADD COLUMN IF NOT EXISTS bus_name VARCHAR(100);

-- Extract bus name from bus_number (everything before the space or first digit)
UPDATE buses 
SET bus_name = TRIM(REGEXP_REPLACE(bus_number, '[0-9].*$', ''))
WHERE bus_name IS NULL;

-- Create allowed bus groups (buses with same name that drivers can switch between)
CREATE TABLE IF NOT EXISTS bus_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_name VARCHAR(100) NOT NULL, -- e.g., "MERCY"
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(bus_name)
);

-- Link buses to groups
CREATE TABLE IF NOT EXISTS bus_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES bus_groups(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(bus_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_bus_assignments_new_driver ON driver_bus_assignments_new(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_bus_assignments_new_bus ON driver_bus_assignments_new(bus_id);
CREATE INDEX IF NOT EXISTS idx_driver_bus_assignments_new_status ON driver_bus_assignments_new(status);

CREATE INDEX IF NOT EXISTS idx_bus_change_requests_driver ON bus_change_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_bus_change_requests_status ON bus_change_requests(status);

CREATE INDEX IF NOT EXISTS idx_bus_group_members_group ON bus_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_bus_group_members_bus ON bus_group_members(bus_id);

-- Function to get allowed buses for a driver
CREATE OR REPLACE FUNCTION get_allowed_buses_for_driver(p_driver_id UUID)
RETURNS TABLE (
  bus_id UUID,
  bus_number VARCHAR,
  registration_number VARCHAR,
  bus_name VARCHAR,
  is_assigned BOOLEAN,
  is_primary BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    b.id as bus_id,
    b.bus_number,
    b.registration_number,
    b.bus_name,
    (dba.id IS NOT NULL) as is_assigned,
    COALESCE(dba.is_primary, false) as is_primary
  FROM buses b
  LEFT JOIN driver_bus_assignments_new dba ON b.id = dba.bus_id AND dba.driver_id = p_driver_id AND dba.status = 'active'
  WHERE 
    -- Driver is assigned to this bus
    dba.id IS NOT NULL
    OR
    -- Bus has same name as driver's assigned buses (can switch)
    b.bus_name IN (
      SELECT DISTINCT b2.bus_name
      FROM driver_bus_assignments_new dba2
      JOIN buses b2 ON dba2.bus_id = b2.id
      WHERE dba2.driver_id = p_driver_id 
        AND dba2.status = 'active'
        AND dba2.can_switch_to_same_name = true
    )
  ORDER BY is_primary DESC, b.bus_number ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if driver can use a bus
CREATE OR REPLACE FUNCTION can_driver_use_bus(p_driver_id UUID, p_bus_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_can_use BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM get_allowed_buses_for_driver(p_driver_id)
    WHERE bus_id = p_bus_id
  ) INTO v_can_use;
  
  RETURN v_can_use;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing data from old table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'driver_bus_assignments') THEN
    INSERT INTO driver_bus_assignments_new (driver_id, bus_id, status)
    SELECT DISTINCT driver_id, bus_id, 
           CASE WHEN status IS NOT NULL THEN status ELSE 'active' END
    FROM driver_bus_assignments
    ON CONFLICT (driver_id, bus_id) DO NOTHING;
  END IF;
END $$;

-- Auto-create bus groups based on bus names
INSERT INTO bus_groups (bus_name, description)
SELECT DISTINCT bus_name, 'Auto-created group for ' || bus_name
FROM buses
WHERE bus_name IS NOT NULL
ON CONFLICT (bus_name) DO NOTHING;

-- Auto-assign buses to groups
INSERT INTO bus_group_members (group_id, bus_id)
SELECT bg.id, b.id
FROM buses b
JOIN bus_groups bg ON b.bus_name = bg.bus_name
ON CONFLICT (bus_id) DO NOTHING;
