const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nxtbus',
  user: process.env.DB_USER || 'nxtbus',
  password: process.env.DB_PASSWORD || 'password',
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'route_stops'
      ORDER BY ordinal_position
    `);
    
    console.log('\nroute_stops table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();

