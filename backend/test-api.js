const http = require('http');

console.log('🔍 Testing API endpoints...\n');

// Test health endpoint
http.get('http://localhost:3000/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('✅ Health endpoint:', res.statusCode);
    console.log('   Response:', JSON.parse(data));
    console.log('');
  });
}).on('error', (err) => {
  console.log('❌ Backend not running!');
  console.log('   Error:', err.message);
  console.log('\n💡 Start the backend with: npm run dev\n');
});
