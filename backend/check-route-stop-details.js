require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkRouteStops() {
  try {
    console.log('🔍 Checking route-stop relationships...\n');
    
    const result = await pool.query(`
      SELECT 
        r.name as route_name,
        r.from_location,
        r.to_location,
        s.name as stop_name,
        rs.stop_sequence
      FROM route_stops rs
      JOIN routes r ON rs.route_id = r.id
      JOIN bus_stops s ON rs.stop_id = s.id
      ORDER BY r.name, rs.stop_sequence
    `);
    
    console.log(`Found ${result.rows.length} route-stop relationships:\n`);
    
    let currentRoute = null;
    result.rows.forEach(row => {
      if (currentRoute !== row.route_name) {
        currentRoute = row.route_name;
        console.log(`\n📍 Route: ${row.route_name} (${row.from_location} → ${row.to_location})`);
        console.log('   Stops:');
      }
      console.log(`   ${row.stop_sequence}. ${row.stop_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRouteStops();
