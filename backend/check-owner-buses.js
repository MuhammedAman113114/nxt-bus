const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nxtbus',
  user: process.env.DB_USER || 'nxtbus',
  password: process.env.DB_PASSWORD || 'password',
});

async function checkOwnerBuses() {
  try {
    // Get owner
    const ownerResult = await pool.query('SELECT id, name, email FROM owners LIMIT 1');
    
    if (ownerResult.rows.length === 0) {
      console.log('No owners found');
      return;
    }
    
    const owner = ownerResult.rows[0];
    console.log(`\n👤 Owner: ${owner.name} (${owner.email})\n`);
    
    // Get buses for this owner
    const busResult = await pool.query(`
      SELECT 
        b.id,
        b.bus_number as bus_name,
        b.registration_number,
        b.status,
        r.name as route_name
      FROM buses b
      LEFT JOIN routes r ON b.route_id = r.id
      WHERE b.owner_id = $1
    `, [owner.id]);
    
    if (busResult.rows.length === 0) {
      console.log('  ⚠️  No buses assigned to this owner yet\n');
    } else {
      console.log(`  🚌 Buses (${busResult.rows.length}):\n`);
      busResult.rows.forEach(bus => {
        console.log(`     • ${bus.bus_name} (${bus.registration_number})`);
        console.log(`       Status: ${bus.status}`);
        console.log(`       Route: ${bus.route_name || 'Not assigned'}\n`);
      });
    }
    
    // Get all drivers
    const driverResult = await pool.query(`
      SELECT id, email FROM users WHERE role = 'driver'
    `);
    
    console.log(`  👥 Available Drivers: ${driverResult.rows.length}\n`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkOwnerBuses();
