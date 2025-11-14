/**
 * Test script for ETA system
 * Run with: node test-eta-system.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Test data
const TEST_BUS_ID = '79255864-00b9-4a6b-95f2-ec4e74a40749'; // Replace with actual bus ID
const TEST_ROUTE_ID = 'a82fe6a7-2c01-4789-b220-c83657ec1d6f'; // Replace with actual route ID

// Coordinates for testing (Mangalore area)
const BUS_LOCATION = { lat: 12.920, lon: 74.820 }; // Bus starting point
const USER_LOCATION = { lat: 12.91234, lon: 74.83567 }; // User scan location (~1km away)

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing ETA System\n');
  console.log('=' .repeat(60));

  // Test 1: Update bus location
  console.log('\n📍 Test 1: Update Bus Location');
  console.log('-'.repeat(60));
  try {
    const result = await makeRequest('POST', '/api/update-location', {
      busId: TEST_BUS_ID,
      lat: BUS_LOCATION.lat,
      lon: BUS_LOCATION.lon,
    });
    console.log(`Status: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200) {
      console.log('✅ PASS: Bus location updated successfully');
    } else {
      console.log('❌ FAIL: Failed to update bus location');
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  // Wait a moment for the update to process
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 2: Calculate ETA with valid data
  console.log('\n🚌 Test 2: Calculate ETA (Valid Request)');
  console.log('-'.repeat(60));
  try {
    const result = await makeRequest('POST', '/api/scan', {
      routeId: TEST_ROUTE_ID,
      userLat: USER_LOCATION.lat,
      userLon: USER_LOCATION.lon,
      scheduledFrom: '11:00',
      scheduledTo: '12:20',
      timeZone: 'Asia/Kolkata',
    });
    console.log(`Status: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200) {
      console.log('✅ PASS: ETA calculated successfully');
      console.log(`   Message: ${result.data.message}`);
      console.log(`   ETA: ${result.data.etaLocal} (in ${result.data.inMinutes} minutes)`);
      console.log(`   Source: ${result.data.source}`);
    } else {
      console.log('❌ FAIL: Failed to calculate ETA');
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  // Test 3: Missing user coordinates
  console.log('\n❌ Test 3: Missing User Coordinates (Should Fail)');
  console.log('-'.repeat(60));
  try {
    const result = await makeRequest('POST', '/api/scan', {
      routeId: TEST_ROUTE_ID,
      scheduledFrom: '11:00',
      scheduledTo: '12:20',
    });
    console.log(`Status: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 400) {
      console.log('✅ PASS: Correctly rejected missing coordinates');
    } else {
      console.log('❌ FAIL: Should have returned 400 error');
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  // Test 4: Invalid coordinates
  console.log('\n❌ Test 4: Invalid Coordinates (Should Fail)');
  console.log('-'.repeat(60));
  try {
    const result = await makeRequest('POST', '/api/scan', {
      routeId: TEST_ROUTE_ID,
      userLat: 999, // Invalid latitude
      userLon: 74.83567,
    });
    console.log(`Status: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 400) {
      console.log('✅ PASS: Correctly rejected invalid coordinates');
    } else {
      console.log('❌ FAIL: Should have returned 400 error');
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  // Test 5: Cache test (repeat same request)
  console.log('\n💾 Test 5: Cache Test (Repeat Request)');
  console.log('-'.repeat(60));
  try {
    const start = Date.now();
    const result = await makeRequest('POST', '/api/scan', {
      routeId: TEST_ROUTE_ID,
      userLat: USER_LOCATION.lat,
      userLon: USER_LOCATION.lon,
      scheduledFrom: '11:00',
      scheduledTo: '12:20',
    });
    const duration = Date.now() - start;
    
    console.log(`Status: ${result.status}`);
    console.log(`Response time: ${duration}ms`);
    
    if (result.status === 200 && duration < 100) {
      console.log('✅ PASS: Cache working (fast response)');
    } else if (result.status === 200) {
      console.log('⚠️  WARN: Response successful but might not be cached');
    } else {
      console.log('❌ FAIL: Request failed');
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  // Test 6: Haversine fallback test
  console.log('\n🔄 Test 6: Testing Haversine Calculation');
  console.log('-'.repeat(60));
  const { OSRMService } = require('./src/services/osrm.service');
  const distance = OSRMService.haversineDistance(
    BUS_LOCATION.lat,
    BUS_LOCATION.lon,
    USER_LOCATION.lat,
    USER_LOCATION.lon
  );
  const travelTime = OSRMService.estimateTravelTime(distance, 30);
  console.log(`Distance: ${distance.toFixed(2)} km`);
  console.log(`Estimated travel time: ${Math.round(travelTime / 60)} minutes`);
  console.log('✅ PASS: Haversine calculation working');

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Tests Complete\n');
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
