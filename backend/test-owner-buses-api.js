const fetch = require('node-fetch');

async function testOwnerBusesAPI() {
  try {
    console.log('\n🔍 Testing owner buses API...\n');
    
    // First login to get token
    console.log('Step 1: Login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'aman@test.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginData.error);
      return;
    }
    
    console.log('✅ Login successful');
    console.log(`   Token: ${loginData.accessToken.substring(0, 20)}...\n`);
    
    // Now get owner buses
    console.log('Step 2: Get owner buses...');
    const busesResponse = await fetch('http://localhost:3000/api/owner/buses', {
      headers: {
        'Authorization': `Bearer ${loginData.accessToken}`
      }
    });
    
    const busesData = await busesResponse.json();
    
    console.log(`Status: ${busesResponse.status} ${busesResponse.statusText}\n`);
    
    if (busesResponse.ok) {
      console.log(`✅ API call successful`);
      console.log(`   Buses returned: ${busesData.buses ? busesData.buses.length : 0}\n`);
      
      if (busesData.buses && busesData.buses.length > 0) {
        busesData.buses.forEach(bus => {
          console.log(`   🚌 ${bus.busName || bus.bus_number}`);
          console.log(`      Registration: ${bus.registrationNumber || bus.registration_number}`);
          console.log(`      Status: ${bus.status}`);
          console.log(`      Route: ${bus.routeName || 'Not assigned'}`);
          console.log(`      Driver: ${bus.driverEmail || 'Not assigned'}\n`);
        });
      } else {
        console.log('   ⚠️  No buses in response\n');
      }
    } else {
      console.log('❌ API call failed:', busesData.error || JSON.stringify(busesData));
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testOwnerBusesAPI();
