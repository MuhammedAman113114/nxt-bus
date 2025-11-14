/**
 * Quick test to verify ETA system is working
 * This simulates a bus location update and passenger scan
 */

require('dotenv').config();
const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Get actual IDs from database
async function getTestIds() {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Get first active route and its bus
    const result = await pool.query(`
      SELECT r.id as route_id, r.name as route_name, b.id as bus_id, b.bus_number
      FROM routes r
      JOIN buses b ON r.bus_id = b.id
      WHERE r.is_active = true
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      throw new Error('No active routes found in database');
    }
    
    return result.rows[0];
  } finally {
    await pool.end();
  }
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('🧪 Quick ETA System Test\n');
  
  // Get test IDs from database
  console.log('📋 Getting test data from database...');
  const testData = await getTestIds();
  console.log(`   Route: ${testData.route_name} (${testData.route_id})`);
  console.log(`   Bus: ${testData.bus_number} (${testData.bus_id})\n`);
  
  // Simulate bus location (near BIT, Mangalore)
  const busLocation = { lat: 12.920, lon: 74.820 };
  
  console.log('📍 Step 1: Updating bus location...');
  const updateResult = await makeRequest('POST', '/api/update-location', {
    busId: testData.bus_id,
    lat: busLocation.lat,
    lon: busLocation.lon,
  });
  
  if (updateResult.status === 200) {
    console.log('   ✅ Bus location updated\n');
  } else {
    console.log('   ❌ Failed:', updateResult.data);
    return;
  }
  
  // Wait a moment
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // Simulate passenger scan (~1km away)
  const userLocation = { lat: 12.91234, lon: 74.83567 };
  
  console.log('🚌 Step 2: Calculating ETA for passenger...');
  const etaResult = await makeRequest('POST', '/api/scan', {
    routeId: testData.route_id,
    userLat: userLocation.lat,
    userLon: userLocation.lon,
    scheduledFrom: '11:00',
    scheduledTo: '12:20',
    timeZone: 'Asia/Kolkata',
  });
  
  if (etaResult.status === 200) {
    console.log('   ✅ ETA calculated successfully!\n');
    console.log('📊 Results:');
    console.log(`   Route: ${etaResult.data.routeName}`);
    console.log(`   Bus: ${etaResult.data.busNumber}`);
    console.log(`   Driver: ${etaResult.data.driverName}`);
    console.log(`   ETA: ${etaResult.data.etaLocal} (in ${etaResult.data.inMinutes} minutes)`);
    console.log(`   Travel time: ${Math.round(etaResult.data.travelSeconds / 60)} minutes`);
    console.log(`   Source: ${etaResult.data.source}`);
    console.log(`\n   Message: "${etaResult.data.message}"`);
  } else {
    console.log('   ❌ Failed:', etaResult.data);
  }
  
  console.log('\n✅ Test complete!');
}

test().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
