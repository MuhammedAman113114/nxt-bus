const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nxtbus',
  user: process.env.DB_USER || 'nxtbus',
  password: process.env.DB_PASSWORD || 'password',
});

async function clearAllData() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Clearing all data from admin tables...');
    
    await client.query('BEGIN');
    
    // Delete in order to respect foreign key constraints
    console.log('   Deleting trip stop events...');
    await client.query('DELETE FROM trip_stop_events');
    
    console.log('   Deleting GPS traces...');
    await client.query('DELETE FROM gps_traces');
    
    console.log('   Deleting operating days...');
    await client.query('DELETE FROM operating_days');
    
    console.log('   Deleting trip schedules...');
    await client.query('DELETE FROM trip_schedules');
    
    console.log('   Deleting trips...');
    await client.query('DELETE FROM trips');
    
    console.log('   Deleting bus assignments...');
    await client.query('DELETE FROM bus_assignments');
    
    console.log('   Deleting route stops...');
    await client.query('DELETE FROM route_stops');
    
    console.log('   Deleting routes...');
    await client.query('DELETE FROM routes');
    
    console.log('   Deleting buses...');
    await client.query('DELETE FROM buses');
    
    console.log('   Deleting bus stops...');
    await client.query('DELETE FROM bus_stops');
    
    console.log('   Deleting owners...');
    await client.query('DELETE FROM owners');
    
    console.log('   Deleting holidays...');
    await client.query('DELETE FROM holidays');
    
    await client.query('COMMIT');
    
    console.log('✅ All data cleared successfully!');
    console.log('');
    console.log('You can now start fresh:');
    console.log('1. Add buses first');
    console.log('2. Then add routes with bus assignment');
    console.log('3. Add stops to routes');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing data:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearAllData().catch(console.error);

