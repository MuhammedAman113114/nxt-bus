-- Enable required PostgreSQL extensions for nxt-bus
-- Run this in Supabase SQL Editor before running migrations

-- Enable PostGIS for spatial/geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Verify installations
SELECT 
    'PostGIS' as extension, 
    PostGIS_version() as version
UNION ALL
SELECT 
    'UUID-OSSP' as extension,
    'Enabled' as version;
