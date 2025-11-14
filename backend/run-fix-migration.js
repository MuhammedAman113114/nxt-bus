const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nxtbus',
  user: process.env.DB_USER || 'nxtbus',
  password: process.env.DB_PASSWORD || 'nxtbus123'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running buses table fix migration...\n');
    
    const migrationPath = path.join(__dirname, 'migrations', '005_fix_buses_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ Added bus_number column');
    console.log('✅ Added route_id column');
    console.log('✅ Added status column');
    console.log('✅ Populated existing buses with data');
    console.log('✅ Created indexes');
    
    // Check result
    const result = await client.query(`
      SELECT 
        id,
        bus_number,
        registration_number,
        capacity,
        route_id,
        status,
        owner_id
      FROM buses
      LIMIT 5
    `);
    
    console.log('\n📊 Sample buses after migration:');
    result.rows.forEach((bus, i) => {
      console.log(`\n${i + 1}. ${bus.bus_number}`);
      console.log(`   Registration: ${bus.registration_number}`);
      console.log(`   Capacity: ${bus.capacity}`);
      console.log(`   Status: ${bus.status}`);
      console.log(`   Route ID: ${bus.route_id || 'Not assigned'}`);
      console.log(`   Owner ID: ${bus.owner_id || 'Not assigned'}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n🎉 All done! Buses table is now fixed.');
    console.log('💡 Restart the backend server to apply changes.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
