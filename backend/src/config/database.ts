import { Pool, PoolConfig } from 'pg';

// Use DATABASE_URL if available, otherwise use individual config
const dbConfig: PoolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased to 10 seconds for Supabase
      ssl: {
        rejectUnauthorized: false, // Accept self-signed certificates for Supabase
      },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'nxtbus',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased to 10 seconds
      ssl: {
        rejectUnauthorized: false, // Accept self-signed certificates
      },
    };

// Create a connection pool
export const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✓ Database connected successfully at:', result.rows[0].now);
    
    // Check PostGIS extension
    const postgisCheck = await client.query(
      "SELECT PostGIS_version() as version"
    );
    console.log('✓ PostGIS version:', postgisCheck.rows[0].version);
    
    client.release();
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('Database pool closed');
}
