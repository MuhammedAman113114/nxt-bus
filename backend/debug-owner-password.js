const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function debugOwnerPassword() {
  try {
    const email = 'aman@test.com';
    const password = 'password123';
    
    console.log('\n🔍 Debugging owner password...\n');
    
    // Get owner from database
    const result = await pool.query(
      'SELECT id, email, password, role FROM owners WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Owner not found');
      return;
    }
    
    const owner = result.rows[0];
    console.log('✅ Owner found:');
    console.log(`   Email: ${owner.email}`);
    console.log(`   Role: ${owner.role}`);
    console.log(`   Password hash: ${owner.password.substring(0, 30)}...`);
    console.log(`   Hash length: ${owner.password.length}\n`);
    
    // Test password comparison
    console.log('Testing password comparison...');
    const isMatch = await bcrypt.compare(password, owner.password);
    console.log(`   Result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}\n`);
    
    // Generate a new hash for comparison
    const newHash = await bcrypt.hash(password, 10);
    console.log('New hash generated:');
    console.log(`   ${newHash.substring(0, 30)}...\n`);
    
    // Test with new hash
    const newMatch = await bcrypt.compare(password, newHash);
    console.log(`New hash test: ${newMatch ? '✅ MATCH' : '❌ NO MATCH'}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugOwnerPassword();
