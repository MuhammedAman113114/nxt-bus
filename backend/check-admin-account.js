const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkAdminAccount() {
  try {
    console.log('\n🔍 Checking admin account...\n');
    
    const email = 'admin@test.com';
    const password = 'password123';
    
    // Check users table
    const result = await pool.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Admin account not found!');
      console.log('   Creating admin account...\n');
      
      // Create admin account
      const hashedPassword = await bcrypt.hash(password, 10);
      const createResult = await pool.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
        [email, hashedPassword, 'admin']
      );
      
      console.log('✅ Admin account created!');
      console.log(`   Email: ${createResult.rows[0].email}`);
      console.log(`   Role: ${createResult.rows[0].role}`);
      console.log(`   Password: ${password}\n`);
    } else {
      const admin = result.rows[0];
      console.log('✅ Admin account found');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      
      // Test password
      const isMatch = await bcrypt.compare(password, admin.password_hash);
      console.log(`   Password matches: ${isMatch ? '✅ YES' : '❌ NO'}\n`);
      
      if (!isMatch) {
        console.log('🔧 Fixing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
          'UPDATE users SET password_hash = $1 WHERE id = $2',
          [hashedPassword, admin.id]
        );
        console.log('✅ Password updated!\n');
      }
    }
    
    console.log('📝 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAdminAccount();
