const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkBusOwnership() {
  try {
    console.log('\n🔍 Checking bus ownership...\n');
    
    // Get the owner
    const ownerResult = await pool.query(
      'SELECT id, name, email FROM owners WHERE email = $1',
      ['aman@test.com']
    );
    
    if (ownerResult.rows.length === 0) {
      console.log('❌ Owner not found');
      return;
    }
    
    const owner = ownerResult.rows[0];
    console.log(`Owner: ${owner.name} (${owner.email})`);
    console.log(`Owner ID: ${owner.id}\n`);
    
    // Get all buses
    const allBusesResult = await pool.query(
      'SELECT id, bus_number, registration_number, owner_id FROM buses'
    );
    
    console.log(`Total buses in database: ${allBusesResult.rows.length}\n`);
    
    allBusesResult.rows.forEach(bus => {
      console.log(`  🚌 ${bus.bus_number} (${bus.registration_number})`);
      console.log(`     Owner ID: ${bus.owner_id}`);
      console.log(`     Matches: ${bus.owner_id === owner.id ? '✅ YES' : '❌ NO'}\n`);
    });
    
    // Get buses for this owner
    const ownerBusesResult = await pool.query(
      'SELECT id, bus_number, registration_number FROM buses WHERE owner_id = $1',
      [owner.id]
    );
    
    console.log(`Buses owned by ${owner.name}: ${ownerBusesResult.rows.length}\n`);
    
    if (ownerBusesResult.rows.length === 0) {
      console.log('⚠️  No buses assigned to this owner!');
      console.log('   Need to update bus ownership in database\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkBusOwnership();
