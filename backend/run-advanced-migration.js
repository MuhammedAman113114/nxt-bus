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
    console.log('🔄 Running advanced features migration...\n');
    
    const migrationPath = path.join(__dirname, 'migrations', '007_add_advanced_features.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Created tables:');
    console.log('   ✅ holidays - System-wide holidays');
    console.log('   ✅ operating_days - Schedule exceptions');
    console.log('   ✅ gps_traces - GPS data collection');
    console.log('   ✅ trip_stop_events - Stop arrival/departure tracking');
    console.log('   ✅ Added fare information to routes');
    console.log('   ✅ Added peak/off-peak pricing\n');
    
    console.log('🔧 Created functions:');
    console.log('   ✅ detect_stop_events() - GPS-based stop detection');
    console.log('   ✅ is_operating_day() - Check if schedule operates\n');
    
    // Check results
    const holidays = await client.query('SELECT COUNT(*) FROM holidays');
    
    console.log('📈 Data summary:');
    console.log(`   📅 Holidays: ${holidays.rows[0].count}\n`);
    
    // Show sample holidays
    const sampleHolidays = await client.query(`
      SELECT date, name, description
      FROM holidays
      ORDER BY date
      LIMIT 5
    `);
    
    if (sampleHolidays.rows.length > 0) {
      console.log('📋 Sample holidays:');
      sampleHolidays.rows.forEach((holiday, i) => {
        console.log(`\n${i + 1}. ${holiday.name}`);
        console.log(`   Date: ${holiday.date.toISOString().split('T')[0]}`);
        console.log(`   Description: ${holiday.description}`);
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
    console.log('\n🎉 Advanced features are ready!');
    console.log('💡 System now supports:');
    console.log('   ✅ Holiday management');
    console.log('   ✅ Operating day exceptions');
    console.log('   ✅ GPS trace collection');
    console.log('   ✅ Automatic stop detection');
    console.log('   ✅ Fare management');
    console.log('\n💡 Next: Restart backend to use new features\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
