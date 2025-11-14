const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('\n🔍 Testing login API...\n');
    console.log('Email: aman@test.com');
    console.log('Password: password123\n');
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'aman@test.com',
        password: 'password123'
      })
    });
    
    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.statusText}\n`);
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log(`   User: ${data.user.email}`);
      console.log(`   Role: ${data.user.role}`);
      console.log(`   Token: ${data.accessToken.substring(0, 20)}...\n`);
    } else {
      console.log('❌ Login failed:');
      console.log(`   Error: ${data.error || JSON.stringify(data)}\n`);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testLogin();
