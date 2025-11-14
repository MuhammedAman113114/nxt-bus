const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testRouteData() {
  try {
    console.log('\n🔍 Checking route data structure...\n');
    
    const result = await pool.query(`
      SELECT 
        r.id,
        r.name,
        r.from_location,
        r.to_location,
        r.departure_time,
        r.reaching_time,
        b.id as bus_id,
        b.bus_number
      FROM routes r
      LEFT JOIN buses b ON r.bus_id = b.id
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('No routes found');
      return;
    }
    
    const route = result.rows[0];
    console.log('Route data:');
    console.log(JSON.stringify(route, null, 2));
    
    // Check stops
    const stopsResult = await pool.query(`
      SELECT 
        s.id,
        s.name,
        rs.stop_order
      FROM route_stops rs
      JOIN stops s ON rs.stop_id = s.id
      WHERE rs.route_id = $1
      ORDER BY rs.stop_order
    `, [route.id]);
    
    console.log('\nRoute stops:');
    console.log(JSON.stringify(stopsResult.rows, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testRouteData();
