require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkBusLocation() {
  try {
    console.log('🔍 Checking bus "mercy" location...\n');
    
    const result = await pool.query(`
      SELECT 
        b.id,
        b.bus_number,
        r.id as route_id,
        r.name as route_name,
        b.last_latitude,
        b.last_longitude,
        b.last_location_update,
        CASE 
          WHEN b.last_location_update IS NULL THEN 'Never updated'
          WHEN b.last_location_update < NOW() - INTERVAL '2 minutes' THEN 'Stale (>2 min ago)'
          ELSE 'Active (<2 min ago)'
        END as status
      FROM buses b
      LEFT JOIN routes r ON b.id = r.bus_id
      WHERE b.bus_number = 'mercy'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Bus "mercy" not found in database');
      return;
    }
    
    const bus = result.rows[0];
    console.log('📊 Bus Information:');
    console.log(`   ID: ${bus.id}`);
    console.log(`   Number: ${bus.bus_number}`);
    console.log(`   Route: ${bus.route_name || 'None'} (${bus.route_id || 'N/A'})`);
    console.log(`   Last Latitude: ${bus.last_latitude || 'NULL'}`);
    console.log(`   Last Longitude: ${bus.last_longitude || 'NULL'}`);
    console.log(`   Last Update: ${bus.last_location_update || 'NULL'}`);
    console.log(`   Status: ${bus.status}\n`);
    
    if (!bus.last_latitude || !bus.last_longitude) {
      console.log('⚠️  Location has never been updated!');
      console.log('   Driver needs to start GPS tracking and send location.');
    } else if (bus.status.includes('Stale')) {
      console.log('⚠️  Location is stale (older than 2 minutes)');
      console.log('   Driver needs to restart GPS tracking.');
    } else {
      console.log('✅ Bus location is active and up-to-date!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkBusLocation();
