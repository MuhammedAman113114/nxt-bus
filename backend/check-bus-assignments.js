const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkBusAssignments() {
  try {
    console.log('\n🔍 Checking bus_assignments table...\n');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'bus_assignments'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ bus_assignments table does not exist\n');
      return;
    }
    
    console.log('✅ bus_assignments table exists\n');
    
    // Get table structure
    const columns = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'bus_assignments'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
    // Get current assignments
    const assignments = await pool.query(`
      SELECT 
        ba.id,
        ba.user_id,
        ba.bus_id,
        ba.status,
        u.email as driver_email,
        b.bus_number
      FROM bus_assignments ba
      LEFT JOIN users u ON ba.user_id = u.id
      LEFT JOIN buses b ON ba.bus_id = b.id
    `);
    
    console.log(`\nCurrent assignments: ${assignments.rows.length}\n`);
    assignments.rows.forEach(a => {
      console.log(`  ${a.driver_email} → ${a.bus_number} (${a.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkBusAssignments();
