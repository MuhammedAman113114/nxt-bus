/**
 * Test driver location update
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_BUS_ID = '79255864-00b9-4a6b-95f2-ec4e74a40749';

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
  console.log('🧪 Testing Driver Location Update\n');
  
  // Simulate driver sending location
  console.log('📍 Sending driver location update...');
  const result = await makeRequest('POST', '/api/update-location', {
    busId: TEST_BUS_ID,
    lat: 12.920,
    lon: 74.820,
    timestamp: Date.now()
  });
  
  console.log(`Status: ${result.status}`);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  
  if (result.status === 200) {
    console.log('\n✅ SUCCESS: Driver location updated!');
    console.log('   The bus location is now available for ETA calculations.');
  } else {
    console.log('\n❌ FAILED: Could not update location');
  }
}

test().catch(console.error);
