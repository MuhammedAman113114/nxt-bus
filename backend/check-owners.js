const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nxtbus',
  user: process.env.DB_USER || 'nxtbus',
  password: process.env.DB_PASSWORD || 'password',
});

async function checkOwners() {
  try {
    const result = await pool.query('SELECT id, name, email, phone, role FROM owners');
    
    console.log('\n📋 Owners in database:\n');
    result.rows.forEach(owner => {
      console.log(`  👤 ${owner.name}`);
      console.log(`     Email: ${owner.email}`);
      console.log(`     Phone: ${owner.phone}`);
      console.log(`     Role: ${owner.role}`);
      console.log(`     Password: password123 (default)\n`);
    });
    
    console.log(`Total owners: ${result.rows.length}\n`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkOwners();
