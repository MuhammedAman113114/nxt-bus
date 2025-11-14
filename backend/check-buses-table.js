const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkBusesTable() {
  try {
    console.log('\n🔍 Checking buses table structure...\n');
    
    // Get table columns
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'buses'
      ORDER BY ordinal_position
    `);
    
    console.log('Buses table columns:\n');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name}`);
      console.log(`    Type: ${col.data_type}`);
      console.log(`    Nullable: ${col.is_nullable}`);
      console.log(`    Default: ${col.column_default || 'none'}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkBusesTable();
