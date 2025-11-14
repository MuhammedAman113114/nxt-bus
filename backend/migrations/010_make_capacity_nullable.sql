-- Make capacity column nullable since it's not being used in the UI

ALTER TABLE buses 
ALTER COLUMN capacity DROP NOT NULL;

-- Add a comment
COMMENT ON COLUMN buses.capacity IS 'Bus capacity (optional, not currently used)';
