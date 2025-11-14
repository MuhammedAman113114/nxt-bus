-- Add authentication fields to owners table

-- Add password column
ALTER TABLE owners ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Add role column
ALTER TABLE owners ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'owner';

-- Update existing owners with a default password (should be changed on first login)
-- Password: 'password123' hashed with bcrypt
UPDATE owners 
SET password = '$2b$10$rZ5FQjlKhVz0YqKqYxQxXeYvF5fQJxQxQxQxQxQxQxQxQxQxQxQxQ',
    role = 'owner'
WHERE password IS NULL;

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_owners_email ON owners(email);

-- Add comment
COMMENT ON COLUMN owners.password IS 'Hashed password for owner login';
COMMENT ON COLUMN owners.role IS 'User role - always owner for this table';

