require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkRoute() {
  try {
    console.log('🔍 Checking Route 51A...\n');
    
    const result = await pool.query(`
      SELECT 
        r.id,
        r.name,
        r.from_location,
        r.to_location,
        b.bus_number,
        b.last_latitude,
        b.last_longitude,
        b.last_location_update,
        CASE 
          WHEN b.last_location_update >= NOW() - INTERVAL '2 minutes' THEN 'ACTIVE'
          ELSE 'STALE'
        END as status
      FROM routes r
      JOIN buses b ON r.bus_id = b.id
      WHERE r.name = '51A'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Route 51A not found');
      return;
    }
    
    const route = result.rows[0];
    console.log('📊 Route 51A Information:');
    console.log(`   ID: ${route.id}`);
    console.log(`   From: ${route.from_location}`);
    console.log(`   To: ${route.to_location}`);
    console.log(`   Bus: ${route.bus_number}`);
    console.log(`   Last Latitude: ${route.last_latitude || 'NULL'}`);
    console.log(`   Last Longitude: ${route.last_longitude || 'NULL'}`);
    console.log(`   Last Update: ${route.last_location_update || 'NULL'}`);
    console.log(`   Status: ${route.status}\n`);
    
    if (route.status === 'STALE' || !route.last_latitude) {
      console.log('⚠️  This is why "No active buses found" appears!');
      console.log('   The bus location is either NULL or older than 2 minutes.');
      console.log('\n💡 Solution:');
      console.log('   1. Hard refresh driver dashboard (Ctrl+Shift+R)');
      console.log('   2. Start GPS tracking');
      console.log('   3. Wait 15 seconds for location update');
      console.log('   4. Then try getting ETA again');
    } else {
      console.log('✅ Bus is ACTIVE! ETA should work now.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRoute();
