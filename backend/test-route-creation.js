const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nxtbus',
  user: process.env.DB_USER || 'nxtbus',
  password: process.env.DB_PASSWORD || 'password',
});

async function testRouteCreation() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing route creation...\n');
    
    // Get stops
    const stopsResult = await client.query('SELECT id, name FROM bus_stops LIMIT 2');
    const stops = stopsResult.rows;
    
    if (stops.length < 2) {
      console.log('❌ Need at least 2 stops. Please add stops first.');
      return;
    }
    
    console.log(`✅ Found ${stops.length} stops:`);
    stops.forEach(s => console.log(`   - ${s.name}`));
    
    await client.query('BEGIN');
    
    // Create route
    console.log('\n📝 Creating route...');
    const routeResult = await client.query(
      `INSERT INTO routes (name, description, from_location, to_location, departure_time, reaching_time, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, name, from_location, to_location, departure_time, reaching_time`,
      ['Test Route', 'Test Description', 'Start Point', 'End Point', '10:00', '11:00']
    );
    
    const route = routeResult.rows[0];
    console.log('✅ Route created:', route.id);
    
    // Add stops
    console.log('\n📍 Adding stops to route...');
    for (let i = 0; i < stops.length; i++) {
      await client.query(
        `INSERT INTO route_stops (route_id, stop_id, stop_order, distance_from_previous)
         VALUES ($1, $2, $3, $4)`,
        [route.id, stops[i].id, i + 1, 0]
      );
      console.log(`   ✅ Added stop ${i + 1}: ${stops[i].name}`);
    }
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Route creation successful!');
    console.log(`   Route ID: ${route.id}`);
    console.log(`   Name: ${route.name}`);
    console.log(`   From: ${route.from_location} (${route.departure_time})`);
    console.log(`   To: ${route.to_location} (${route.reaching_time})`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    console.error('   Details:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testRouteCreation();

