const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nxtbus',
  user: process.env.DB_USER || 'nxtbus',
  password: process.env.DB_PASSWORD || 'password',
});

async function testOwnerLogin() {
  try {
    const email = 'aman@test.com';
    const password = 'password123';
    
    console.log('\n🔍 Testing owner login...\n');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}\n`);
    
    // Check if owner exists
    const result = await pool.query(
      'SELECT id, email, password, role FROM owners WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Owner not found in database');
      return;
    }
    
    const owner = result.rows[0];
    console.log('✅ Owner found in database');
    console.log(`   ID: ${owner.id}`);
    console.log(`   Email: ${owner.email}`);
    console.log(`   Role: ${owner.role}`);
    console.log(`   Has password: ${owner.password ? 'Yes' : 'No'}\n`);
    
    if (!owner.password) {
      console.log('❌ Owner has no password set!');
      console.log('   Run: node run-owner-auth-migration.js');
      return;
    }
    
    // Test password
    const isMatch = await bcrypt.compare(password, owner.password);
    
    if (isMatch) {
      console.log('✅ Password matches!');
      console.log('   Login should work\n');
    } else {
      console.log('❌ Password does NOT match!');
      console.log('   The stored password hash might be incorrect\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testOwnerLogin();
