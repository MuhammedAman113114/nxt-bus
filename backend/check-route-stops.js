const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nxtbus',
  user: process.env.DB_USER || 'nxtbus',
  password: process.env.DB_PASSWORD || 'nxtbus123'
});

async function checkRouteStops() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking route_stops table...\n');
    
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'route_stops'
      ORDER BY ordinal_position
    `);
    
    if (columns.rows.length > 0) {
      console.log('📋 Existing route_stops columns:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      
      const count = await client.query('SELECT COUNT(*) FROM route_stops');
      console.log(`\n📊 Total records: ${count.rows[0].count}\n`);
    } else {
      console.log('❌ route_stops table does not exist\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkRouteStops();
