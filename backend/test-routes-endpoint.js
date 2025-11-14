require('dotenv').config();
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/routes',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✅ API Response:');
      console.log(`Total routes: ${json.routes?.length || 0}\n`);
      
      if (json.routes) {
        json.routes.forEach(route => {
          console.log(`📍 Route: ${route.name}`);
          console.log(`   From: ${route.fromLocation}`);
          console.log(`   To: ${route.toLocation}`);
          console.log(`   Bus: ${route.busNumber}`);
          console.log(`   Stops (${route.stops?.length || 0}):`);
          if (route.stops) {
            route.stops.forEach((stop, idx) => {
              console.log(`      ${idx + 1}. ${stop.name}`);
            });
          }
          console.log('');
        });
      }
    } catch (err) {
      console.error('❌ Failed to parse response:', err.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.end();
