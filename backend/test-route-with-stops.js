const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testRouteWithStops() {
  try {
    console.log('\n🔍 Testing route data with stops...\n');
    
    // Get a route
    const routeResult = await pool.query(`
      SELECT 
        r.id,
        r.name,
        r.bus_id,
        b.bus_number
      FROM routes r
      LEFT JOIN buses b ON r.bus_id = b.id
      LIMIT 1
    `);
    
    if (routeResult.rows.length === 0) {
      console.log('No routes found');
      return;
    }
    
    const route = routeResult.rows[0];
    console.log('Route:', route.name);
    console.log('Bus:', route.bus_number);
    console.log('Route ID:', route.id);
    
    // Get stops for this route
    const stopsResult = await pool.query(`
      SELECT 
        s.id,
        s.name,
        rs.stop_sequence
      FROM route_stops rs
      JOIN stops s ON rs.stop_id = s.id
      WHERE rs.route_id = $1
      ORDER BY rs.stop_sequence
    `, [route.id]);
    
    console.log(`\nStops (${stopsResult.rows.length}):`);
    stopsResult.rows.forEach(stop => {
      console.log(`  ${stop.stop_sequence}. ${stop.name} (${stop.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testRouteWithStops();
