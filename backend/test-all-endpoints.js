const http = require('http');

// First, login to get a token
function login(callback) {
  const postData = JSON.stringify({
    email: 'admin@test.com',
    password: 'password123'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        const response = JSON.parse(data);
        console.log('✅ Login successful');
        console.log('   User:', response.user.email, '- Role:', response.user.role);
        callback(null, response.accessToken);
      } else {
        console.log('❌ Login failed:', res.statusCode);
        console.log('   Response:', data);
        callback(new Error('Login failed'));
      }
    });
  });

  req.on('error', (err) => {
    console.log('❌ Login error:', err.message);
    callback(err);
  });

  req.write(postData);
  req.end();
}

function testEndpoint(path, token, callback) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        const response = JSON.parse(data);
        callback(null, response);
      } else {
        callback(new Error(`Status ${res.statusCode}: ${data}`));
      }
    });
  });

  req.on('error', callback);
  req.end();
}

console.log('🔍 Testing all API endpoints...\n');

login((err, token) => {
  if (err) {
    console.log('\n❌ Cannot proceed without login\n');
    process.exit(1);
  }

  console.log('\n📋 Testing endpoints with admin token...\n');

  // Test buses endpoint
  testEndpoint('/api/buses', token, (err, data) => {
    if (err) {
      console.log('❌ /api/buses:', err.message);
    } else {
      console.log('✅ /api/buses:', data.buses?.length || 0, 'buses');
    }

    // Test owners endpoint
    testEndpoint('/api/owners', token, (err, data) => {
      if (err) {
        console.log('❌ /api/owners:', err.message);
      } else {
        console.log('✅ /api/owners:', data.owners?.length || 0, 'owners');
      }

      // Test stops endpoint
      testEndpoint('/api/stops', token, (err, data) => {
        if (err) {
          console.log('❌ /api/stops:', err.message);
        } else {
          console.log('✅ /api/stops:', data.stops?.length || 0, 'stops');
        }

        // Test routes endpoint
        testEndpoint('/api/routes', token, (err, data) => {
          if (err) {
            console.log('❌ /api/routes:', err.message);
          } else {
            console.log('✅ /api/routes:', data.routes?.length || 0, 'routes');
          }

          console.log('\n✅ All tests complete!\n');
        });
      });
    });
  });
});
