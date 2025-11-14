const http = require('http');

const BUS_ID = '73fcc92c-dc92-4652-bbd7-fde6b49cfb81'; // mercy bus ID

function testUpdateLocation() {
  const data = JSON.stringify({
    busId: BUS_ID,
    lat: 12.920,
    lon: 74.820,
    timestamp: Date.now()
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/update-location',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  console.log('🧪 Testing /api/update-location endpoint\n');
  console.log('Request:', JSON.parse(data));
  console.log('');

  const req = http.request(options, (res) => {
    let body = '';
    
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      try {
        const json = JSON.parse(body);
        console.log('Response:', JSON.stringify(json, null, 2));
        
        if (res.statusCode === 200) {
          console.log('\n✅ SUCCESS! Location updated.');
          console.log('   Run: node check-bus-location.js to verify');
        } else {
          console.log('\n❌ FAILED');
        }
      } catch (e) {
        console.log('Response:', body);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
  });

  req.write(data);
  req.end();
}

testUpdateLocation();
