require('dotenv').config();
const fetch = require('node-fetch');

async function testRoutesAPI() {
  try {
    console.log('🔍 Testing /api/routes endpoint...\n');
    
    const response = await fetch('http://localhost:5000/api/routes');
    const data = await response.json();
    
    console.log(`Found ${data.routes.length} routes:\n`);
    
    data.routes.forEach(route => {
      console.log(`📍 Route: ${route.name}`);
      console.log(`   From: ${route.fromLocation}`);
      console.log(`   To: ${route.toLocation}`);
      console.log(`   Bus: ${route.busNumber}`);
      console.log(`   Stops (${route.stops.length}):`);
      route.stops.forEach((stop, idx) => {
        console.log(`      ${idx + 1}. ${stop.name}`);
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRoutesAPI();
