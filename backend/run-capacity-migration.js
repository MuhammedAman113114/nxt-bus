const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('\n🚀 Making capacity column nullable...\n');
    
    await client.query('BEGIN');
    
    // Make capacity nullable
    await client.query(`
      ALTER TABLE buses 
      ALTER COLUMN capacity DROP NOT NULL
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    console.log('   Capacity column is now nullable\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
