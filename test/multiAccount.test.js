const assert = require('assert');
const baileysService = require('../src/services/whatsapp/baileysService');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const Message = require('../src/models/Message');

async function testMultiAccountSystem() {
  console.log('\n--- 🧪 TESTING MULTI-ACCOUNT 5-SLOT ARCHITECTURE ---\n');

  await connectDatabase();

  // Test 1: Exactly 5 accounts configured
  console.log('[TEST 1] Verifying 5 isolated account slots...');
  assert.strictEqual(baileysService.maxAccounts, 5);
  const accounts = baileysService.getAllAccounts();
  assert.strictEqual(accounts.length, 5);
  console.log('  ✅ Exactly 5 account slots exist in the manager');

  // Test 2: Check properties of each slot
  console.log('\n[TEST 2] Verifying slot metadata (1 through 5)...');
  for (let i = 1; i <= 5; i++) {
    const acc = baileysService.getAccount(`account_${i}`);
    assert(acc, `Account slot ${i} must exist`);
    assert.strictEqual(acc.slot, i);
    assert.strictEqual(acc.sessionId, `account_${i}`);
    assert.strictEqual(acc.label, `Account ${i}`);
    assert.strictEqual(acc.isConnected(), false);
    console.log(`  ✅ Slot #${i} (${acc.sessionId}) verified with isolated storage path: ${acc.authDir}`);
  }

  // Test 3: Connected accounts filtering
  console.log('\n[TEST 3] Verifying connected accounts filter...');
  const connected = baileysService.getConnectedAccounts();
  assert.strictEqual(Array.isArray(connected), true);
  assert.strictEqual(connected.length, 0); // Initially none connected
  console.log('  ✅ Connected accounts correctly reported (0/5 connected)');

  // Test 4: Message sender session isolation in database
  console.log('\n[TEST 4] Verifying Message records track sender account slot...');
  const testMsg = await Message.create({
    messageId: `slot_test_${Date.now()}`,
    senderSessionId: 'account_3',
    senderPhone: '8801912345678',
    recipient: '+8801700000000',
    recipientJid: '8801700000000@s.whatsapp.net',
    messageType: 'text',
    content: 'Testing multi-account dispatch tracking',
    status: 'sent',
    sentAt: new Date()
  });

  const savedMsg = await Message.findOne({ messageId: testMsg.messageId });
  assert.strictEqual(savedMsg.senderSessionId, 'account_3');
  assert.strictEqual(savedMsg.senderPhone, '8801912345678');
  console.log('  ✅ Message record successfully captured senderSessionId=account_3 and senderPhone');

  // Cleanup
  await Message.deleteOne({ messageId: testMsg.messageId });
  await disconnectDatabase();

  console.log('\n--- 🎉 ALL MULTI-ACCOUNT TESTS PASSED SUCCESSFULLY! ---\n');
}

testMultiAccountSystem().catch(err => {
  console.error('\n❌ Multi-account test failed:', err);
  process.exit(1);
});
