const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkRoutesTable() {
  try {
    console.log('\n🔍 Checking routes table structure...\n');
    
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'routes'
      ORDER BY ordinal_position
    `);
    
    console.log('Routes table columns:\n');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
    // Get a sample route
    const sampleRoute = await pool.query('SELECT * FROM routes LIMIT 1');
    if (sampleRoute.rows.length > 0) {
      console.log('\nSample route data:');
      console.log(JSON.stringify(sampleRoute.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRoutesTable();
