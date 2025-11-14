const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function removeDuplicate() {
  const client = await pool.connect();
  
  try {
    const email = 'aman@test.com';
    
    console.log('\n🗑️  Removing duplicate user...\n');
    
    await client.query('BEGIN');
    
    // Delete from users table (keep the owner)
    const result = await client.query(
      'DELETE FROM users WHERE email = $1 RETURNING id, email, role',
      [email]
    );
    
    await client.query('COMMIT');
    
    if (result.rows.length > 0) {
      console.log('✅ Deleted user:');
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Role: ${result.rows[0].role}`);
      console.log(`   ID: ${result.rows[0].id}\n`);
      console.log('✅ Owner account with same email is preserved\n');
    } else {
      console.log('No user found to delete\n');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

removeDuplicate();
