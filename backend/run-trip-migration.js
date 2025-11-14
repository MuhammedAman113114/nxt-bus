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
    console.log('🔄 Running trip management migration...\n');
    
    const migrationPath = path.join(__dirname, 'migrations', '006_add_trip_management.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Created tables:');
    console.log('   ✅ trips - Individual trip instances');
    console.log('   ✅ trip_schedules - Recurring patterns');
    console.log('   ✅ driver_assignments - Driver-trip assignments');
    console.log('   ✅ route_stops - Ordered stops with timing');
    console.log('   ✅ Updated routes with service windows');
    console.log('   ✅ Updated users for driver info\n');
    
    // Check results
    const schedules = await client.query('SELECT COUNT(*) FROM trip_schedules');
    const trips = await client.query('SELECT COUNT(*) FROM trips');
    const routeStops = await client.query('SELECT COUNT(*) FROM route_stops');
    
    console.log('📈 Data summary:');
    console.log(`   📅 Trip Schedules: ${schedules.rows[0].count}`);
    console.log(`   🚌 Generated Trips: ${trips.rows[0].count}`);
    console.log(`   🚏 Route Stops: ${routeStops.rows[0].count}\n`);
    
    // Show sample trips
    const sampleTrips = await client.query(`
      SELECT 
        t.trip_name,
        t.trip_date,
        t.scheduled_start_time,
        b.bus_number,
        r.name as route_name,
        t.status
      FROM trips t
      JOIN buses b ON t.bus_id = b.id
      JOIN routes r ON t.route_id = r.id
      ORDER BY t.trip_date, t.scheduled_start_time
      LIMIT 5
    `);
    
    if (sampleTrips.rows.length > 0) {
      console.log('📋 Sample trips generated:');
      sampleTrips.rows.forEach((trip, i) => {
        console.log(`\n${i + 1}. ${trip.trip_name}`);
        console.log(`   Date: ${trip.trip_date.toISOString().split('T')[0]}`);
        console.log(`   Time: ${trip.scheduled_start_time}`);
        console.log(`   Bus: ${trip.bus_number}`);
        console.log(`   Route: ${trip.route_name}`);
        console.log(`   Status: ${trip.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n🎉 Trip management system is ready!');
    console.log('💡 Next: Restart backend and test the new APIs\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
