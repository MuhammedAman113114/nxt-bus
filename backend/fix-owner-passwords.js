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

async function fixOwnerPasswords() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔧 Fixing owner passwords...\n');
    
    await client.query('BEGIN');
    
    // Hash the password properly
    const hashedPassword = await bcrypt.hash('password123', 10);
    console.log('✅ Generated password hash');
    
    // Update all owners with the correct hash
    const result = await client.query(`
      UPDATE owners 
      SET password = $1, role = 'owner'
      WHERE password IS NULL OR password != $1
      RETURNING id, email
    `, [hashedPassword]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Updated ${result.rows.length} owner(s)\n`);
    
    result.rows.forEach(owner => {
      console.log(`   👤 ${owner.email}`);
    });
    
    console.log('\n📝 All owners can now login with:');
    console.log('   Password: password123\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixOwnerPasswords();
