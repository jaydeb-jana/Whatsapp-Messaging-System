const assert = require('assert');
const http = require('http');
const { getAppPin, verifyPin } = require('../src/config/pinConfig');
const app = require('../src/app');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');

async function testPinAuth() {
  console.log('\n--- 🧪 TESTING PIN AUTHENTICATION SYSTEM ---\n');

  await connectDatabase();

  // Test 1: PIN config validation (must be digits only)
  console.log('[TEST 1] Verifying PIN format validation...');
  const appPin = getAppPin();
  assert(/^\d+$/.test(appPin), 'APP_PIN must consist strictly of digits/numbers');
  assert.strictEqual(verifyPin('123456'), true);
  assert.strictEqual(verifyPin('wrong_pin'), false);
  assert.strictEqual(verifyPin('654321'), false);
  console.log(`  ✅ APP_PIN validated successfully (Current PIN: ${appPin})`);

  // Start temporary test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  // Helper function to make HTTP requests
  const request = (path, options = {}) => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          path,
          method: options.method || 'GET',
          headers: options.headers || {}
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
        }
      );
      req.on('error', reject);
      if (options.data) {
        req.write(typeof options.data === 'string' ? options.data : JSON.stringify(options.data));
      }
      req.end();
    });
  };

  // Test 2: Unauthenticated visit to / should redirect to /auth/pin
  console.log('\n[TEST 2] Verifying unauthenticated redirection to /auth/pin...');
  const unauthRes = await request('/');
  assert.strictEqual(unauthRes.status, 302);
  assert.strictEqual(unauthRes.headers.location, '/auth/pin');
  console.log('  ✅ Unauthenticated request correctly redirected to /auth/pin (302)');

  const unauthDocsRes = await request('/docs');
  assert.strictEqual(unauthDocsRes.status, 302);
  assert.strictEqual(unauthDocsRes.headers.location, '/auth/pin');
  console.log('  ✅ Unauthenticated /docs request correctly redirected to /auth/pin (302)');

  // Test 3: Unauthenticated request to /api/stats should return 401
  console.log('\n[TEST 3] Verifying API lock protection...');
  const unauthApi = await request('/api/stats');
  assert.strictEqual(unauthApi.status, 401);
  const unauthJson = JSON.parse(unauthApi.body);
  assert.strictEqual(unauthJson.locked, true);
  console.log('  ✅ API properly locked with 401 Unauthorized');

  // Test 3b: API request with x-api-pin header should be accepted (200 OK)
  console.log('[TEST 3b] Verifying x-api-pin header authentication...');
  const headerAuthApi = await request('/api/stats', {
    headers: { 'x-api-pin': '123456' }
  });
  assert.strictEqual(headerAuthApi.status, 200);
  const headerAuthJson = JSON.parse(headerAuthApi.body);
  assert.strictEqual(headerAuthJson.success, true);
  console.log('  ✅ API accessible (200 OK) with x-api-pin header');

  // Test 4: Visit /auth/pin returns 200 OK
  console.log('\n[TEST 4] Verifying PIN entry page rendering...');
  const pinPageRes = await request('/auth/pin');
  assert.strictEqual(pinPageRes.status, 200);
  assert(pinPageRes.body.includes('Security PIN Lock'));
  assert(pinPageRes.body.includes('keypad-btn'));
  console.log('  ✅ PIN entry lock screen rendered 200 OK with keypad');

  // Test 5: Submit wrong PIN via POST /auth/pin
  console.log('\n[TEST 5] Verifying incorrect PIN rejection...');
  const wrongRes = await request('/auth/pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    data: { pin: '000000' }
  });
  assert.strictEqual(wrongRes.status, 400);
  const wrongJson = JSON.parse(wrongRes.body);
  assert.strictEqual(wrongJson.success, false);
  console.log('  ✅ Wrong PIN rejected with 400 and error message');

  // Test 6: Submit correct PIN (123456)
  console.log('\n[TEST 6] Verifying correct PIN unlocking & cookie issue...');
  const correctRes = await request('/auth/pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    data: { pin: '123456' }
  });
  assert.strictEqual(correctRes.status, 200);
  const correctJson = JSON.parse(correctRes.body);
  assert.strictEqual(correctJson.success, true);

  // Extract auth cookie
  const setCookie = correctRes.headers['set-cookie'];
  assert(setCookie && setCookie.length > 0, 'Cookie should be set');
  const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
  console.log('  ✅ Correct PIN unlocked system and received verified cookie');

  // Test 7: Use verified cookie to access / and /api/stats
  console.log('\n[TEST 7] Accessing protected pages with verified cookie...');
  const authDashRes = await request('/', {
    headers: { 'Cookie': cookieHeader }
  });
  assert.strictEqual(authDashRes.status, 200);
  assert(authDashRes.body.includes('WhatsFlow Pro'));
  console.log('  ✅ Dashboard opened successfully (200 OK) with PIN cookie');

  const authApiRes = await request('/api/stats', {
    headers: { 'Cookie': cookieHeader }
  });
  assert.strictEqual(authApiRes.status, 200);
  const authApiJson = JSON.parse(authApiRes.body);
  assert.strictEqual(authApiJson.success, true);
  console.log('  ✅ API accessible (200 OK) with PIN cookie');

  const authDocsRes = await request('/docs', {
    headers: { 'Cookie': cookieHeader }
  });
  assert.strictEqual(authDocsRes.status, 200);
  assert(authDocsRes.body.includes('Documentation') || authDocsRes.body.includes('API Reference'));
  console.log('  ✅ /docs opened successfully (200 OK) with PIN cookie');

  // Test 8: Logout / Lock session
  console.log('\n[TEST 8] Verifying session lock / logout...');
  const logoutRes = await request('/auth/logout', {
    headers: { 'Cookie': cookieHeader }
  });
  assert.strictEqual(logoutRes.status, 302);
  assert.strictEqual(logoutRes.headers.location, '/auth/pin');
  console.log('  ✅ Logout successfully locked session and redirected to /auth/pin');

  // Cleanup
  await new Promise((resolve) => server.close(resolve));
  await disconnectDatabase();

  console.log('\n--- 🎉 ALL PIN AUTHENTICATION TESTS PASSED! ---\n');
}

testPinAuth().catch((err) => {
  console.error('\n❌ PIN Test failed:', err);
  process.exit(1);
});
