const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('\n🚀 Adding bus_id column to routes table...\n');
    
    const sql = fs.readFileSync('./migrations/012_add_bus_id_to_routes.sql', 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    console.log('   Added bus_id column to routes table');
    console.log('   Created index on bus_id');
    console.log('   Attempted to populate bus_id from description\n');
    
    // Check results
    const result = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(bus_id) as with_bus_id
      FROM routes
    `);
    
    console.log(`Routes: ${result.rows[0].total} total, ${result.rows[0].with_bus_id} with bus_id\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
