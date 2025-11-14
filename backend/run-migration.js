require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('🔄 Running migration: add-bus-location-columns.sql\n');
    
    const sql = fs.readFileSync('./migrations/add-bus-location-columns.sql', 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('Added columns:');
    console.log('  - last_latitude');
    console.log('  - last_longitude');
    console.log('  - last_location_update');
    console.log('  - Index: idx_buses_location_update\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
