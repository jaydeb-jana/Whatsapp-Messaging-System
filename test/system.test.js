const assert = require('assert');
const http = require('http');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const Message = require('../src/models/Message');
const WhatsAppSession = require('../src/models/WhatsAppSession');
const ActivityLog = require('../src/models/ActivityLog');
const { validatePhoneNumber, cleanPhoneNumber } = require('../src/utils/phoneValidator');
const messageService = require('../src/services/whatsapp/messageService');
const baileysService = require('../src/services/whatsapp/baileysService');
const app = require('../src/app');

async function runTests() {
  console.log('\n--- 🧪 STARTING SYSTEM VERIFICATION TESTS ---\n');

  // 1. Database Connection Test
  console.log('[TEST 1] Verifying MongoDB Connection...');
  await connectDatabase();
  assert(true, 'Database connected');
  console.log('  ✅ Database connected successfully');

  // 2. Phone Validator Tests
  console.log('\n[TEST 2] Verifying Phone Validator Utility...');
  const bdTest = validatePhoneNumber('+880 1712-345678');
  assert.strictEqual(bdTest.isValid, true);
  assert.strictEqual(bdTest.cleanedNumber, '8801712345678');
  assert.strictEqual(bdTest.jid, '8801712345678@s.whatsapp.net');
  assert.strictEqual(bdTest.country, 'Bangladesh');
  console.log('  ✅ Bangladesh phone number validated & formatted correctly');

  const usTest = validatePhoneNumber('+1 (202) 555-0199');
  assert.strictEqual(usTest.isValid, true);
  assert.strictEqual(usTest.cleanedNumber, '12025550199');
  assert.strictEqual(usTest.country, 'US / Canada');
  console.log('  ✅ US phone number validated correctly');

  const invalidTest = validatePhoneNumber('123');
  assert.strictEqual(invalidTest.isValid, false);
  console.log('  ✅ Short/invalid phone number properly rejected');

  // 3. Database Models CRUD Tests
  console.log('\n[TEST 3] Verifying Database Models & Operations...');
  const testMsgId = `test_msg_${Date.now()}`;
  const createdMsg = await Message.create({
    messageId: testMsgId,
    recipient: '+8801712345678',
    recipientJid: '8801712345678@s.whatsapp.net',
    messageType: 'text',
    content: 'হ্যালো! এটি একটি স্বয়ংক্রিয় বার্তা। 🚀',
    status: 'sent',
    sentAt: new Date()
  });
  assert(createdMsg._id, 'Message created in MongoDB');
  assert.strictEqual(createdMsg.content, 'হ্যালো! এটি একটি স্বয়ংক্রিয় বার্তা। 🚀');
  console.log('  ✅ Message model successfully persisted with Bengali Unicode and emoji');

  const stats = await messageService.getStats();
  assert(stats.total >= 1, 'Stats total calculated');
  assert(stats.sent >= 1, 'Stats sent calculated');
  console.log(`  ✅ Stats calculation verified: Total=${stats.total}, Sent=${stats.sent}, SuccessRate=${stats.successRate}%`);

  const history = await messageService.getHistory({ search: '8801712345678' });
  assert(history.messages.length > 0, 'History search works');
  console.log(`  ✅ History search & filter verified (${history.total} found)`);

  // Clean test message
  await Message.deleteOne({ messageId: testMsgId });

  // 4. Baileys Service State Test
  console.log('\n[TEST 4] Verifying Baileys Service State...');
  const status = baileysService.getStatus();
  assert(['disconnected', 'connecting', 'connected', 'reconnecting'].includes(status.status));
  assert.strictEqual(status.connected, false);
  console.log(`  ✅ Baileys initial state verified: status='${status.status}'`);

  // 5. Express HTTP Server and Route Rendering Tests
  console.log('\n[TEST 5] Verifying Express Routes & View Rendering...');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`  Testing on temporary port ${port}...`);

  // First verify /auth/pin renders
  const pinPageRes = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/auth/pin`, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
  assert.strictEqual(pinPageRes.status, 200);
  assert(pinPageRes.body.includes('Security PIN Lock'));
  console.log('  ✅ GET /auth/pin rendered 200 OK');

  // Verify PIN with 123456 and get cookie
  const loginCookie = await new Promise((resolve, reject) => {
    const postData = JSON.stringify({ pin: '123456' });
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: '/auth/pin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      const cookies = res.headers['set-cookie'];
      resolve(cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '');
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  const fetchEndpoint = async (urlPath) => {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}${urlPath}`, {
        headers: { 'Cookie': loginCookie }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }).on('error', reject);
    });
  };

  // Test GET /
  const homeRes = await fetchEndpoint('/');
  assert.strictEqual(homeRes.status, 200);
  assert(homeRes.body.includes('Dashboard Overview') || homeRes.body.includes('WhatsFlow Pro'));
  console.log('  ✅ GET / rendered 200 OK with EJS layout');

  // Test GET /whatsapp/connect
  const connectRes = await fetchEndpoint('/whatsapp/connect');
  assert.strictEqual(connectRes.status, 200);
  assert(connectRes.body.includes('Scan QR Code') || connectRes.body.includes('WhatsApp Multi-Account Manager'));
  console.log('  ✅ GET /whatsapp/connect rendered 200 OK');

  // Test GET /messages/send
  const sendRes = await fetchEndpoint('/messages/send');
  assert.strictEqual(sendRes.status, 200);
  assert(sendRes.body.includes('Send WhatsApp Message'));
  assert(sendRes.body.includes('Quick Templates'));
  console.log('  ✅ GET /messages/send rendered 200 OK with composer controls');

  // Test GET /messages/history
  const historyRes = await fetchEndpoint('/messages/history');
  assert.strictEqual(historyRes.status, 200);
  assert(historyRes.body.includes('Message History &amp; Audit Logs') || historyRes.body.includes('Message History'));
  console.log('  ✅ GET /messages/history rendered 200 OK');

  // Test GET /api/whatsapp/status
  const apiStatusRes = await fetchEndpoint('/api/whatsapp/status');
  assert.strictEqual(apiStatusRes.status, 200);
  const statusJson = JSON.parse(apiStatusRes.body);
  assert.strictEqual(statusJson.success, true);
  console.log('  ✅ GET /api/whatsapp/status returned valid JSON');

  // Test GET /api/stats
  const apiStatsRes = await fetchEndpoint('/api/stats');
  assert.strictEqual(apiStatsRes.status, 200);
  const statsJson = JSON.parse(apiStatsRes.body);
  assert.strictEqual(statsJson.success, true);
  console.log('  ✅ GET /api/stats returned valid metrics');

  // Cleanup
  await new Promise((resolve) => server.close(resolve));
  await disconnectDatabase();

  console.log('\n--- 🎉 ALL SYSTEM TESTS PASSED SUCCESSFULLY! ---\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
