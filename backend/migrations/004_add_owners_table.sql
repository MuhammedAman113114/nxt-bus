-- Create owners table
CREATE TABLE IF NOT EXISTS owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50) NOT NULL,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add owner_id column to buses table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'buses' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE buses ADD COLUMN owner_id UUID REFERENCES owners(id);
  END IF;
END $$;

-- Create index on owner_id
CREATE INDEX IF NOT EXISTS idx_buses_owner_id ON buses(owner_id);

-- Insert sample owners
INSERT INTO owners (name, email, phone, address) VALUES
  ('Rajesh Kumar', 'rajesh@example.com', '+91 9876543210', 'Mangalore, Karnataka'),
  ('Suresh Patel', 'suresh@example.com', '+91 9876543211', 'Bangalore, Karnataka')
ON CONFLICT (email) DO NOTHING;
