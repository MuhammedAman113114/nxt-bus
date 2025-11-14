const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nxtbus',
  user: process.env.DB_USER || 'nxtbus',
  password: process.env.DB_PASSWORD || 'password',
});

async function checkStops() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM bus_stops');
    const count = parseInt(result.rows[0].count);
    
    console.log(`\n📊 Bus Stops: ${count}`);
    
    if (count === 0) {
      console.log('\n⚠️  No stops found! You need to add stops first.');
      console.log('   Go to Admin Dashboard → Manage Stops → Add New Stop');
    } else {
      const stops = await pool.query('SELECT id, name FROM bus_stops LIMIT 5');
      console.log('\n✅ Sample stops:');
      stops.rows.forEach(stop => {
        console.log(`   - ${stop.name} (${stop.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkStops();

