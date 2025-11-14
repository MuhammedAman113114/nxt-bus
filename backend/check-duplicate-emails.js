const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkDuplicates() {
  try {
    const email = 'aman@test.com';
    
    console.log('\n🔍 Checking for duplicate emails...\n');
    
    // Check users table
    const usersResult = await pool.query(
      'SELECT id, email, role, created_at FROM users WHERE email = $1',
      [email]
    );
    
    console.log(`Users table (${usersResult.rows.length} found):`);
    usersResult.rows.forEach(user => {
      console.log(`   - ID: ${user.id}`);
      console.log(`     Role: ${user.role}`);
      console.log(`     Created: ${user.created_at}\n`);
    });
    
    // Check owners table
    const ownersResult = await pool.query(
      'SELECT id, email, role, created_at FROM owners WHERE email = $1',
      [email]
    );
    
    console.log(`Owners table (${ownersResult.rows.length} found):`);
    ownersResult.rows.forEach(owner => {
      console.log(`   - ID: ${owner.id}`);
      console.log(`     Role: ${owner.role}`);
      console.log(`     Created: ${owner.created_at}\n`);
    });
    
    if (usersResult.rows.length > 0 && ownersResult.rows.length > 0) {
      console.log('⚠️  DUPLICATE FOUND!');
      console.log('   The email exists in both users and owners tables.');
      console.log('   The auth service will always find the users table entry first.\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDuplicates();
