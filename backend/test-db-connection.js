const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    console.log('\n🔍 Testing database connection...\n');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log(`User: ${process.env.DB_USER}\n`);
    
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!');
    console.log(`   Server time: ${result.rows[0].now}\n`);
    
    // Test owner query
    const ownerResult = await pool.query('SELECT COUNT(*) as count FROM owners');
    console.log(`✅ Owners table accessible`);
    console.log(`   Total owners: ${ownerResult.rows[0].count}\n`);
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(`   ${error.message}\n`);
  } finally {
    await pool.end();
  }
}

testConnection();
