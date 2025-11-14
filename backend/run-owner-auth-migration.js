const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nxtbus',
  user: process.env.DB_USER || 'nxtbus',
  password: process.env.DB_PASSWORD || 'password',
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Running owner authentication migration...');
    
    const migrationPath = path.join(__dirname, 'migrations', '009_add_owner_auth.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    
    console.log('✅ Owner authentication migration completed!');
    console.log('   Added: password, role columns to owners table');
    console.log('');
    console.log('📝 Default credentials for existing owners:');
    console.log('   Email: (their existing email)');
    console.log('   Password: password123');
    console.log('');
    console.log('⚠️  Owners should change their password on first login!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);

