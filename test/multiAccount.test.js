const assert = require('assert');
const baileysService = require('../src/services/whatsapp/baileysService');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const Message = require('../src/models/Message');

async function testMultiAccountSystem() {
  console.log('\n--- 🧪 TESTING MULTI-ACCOUNT DYNAMIC PLUS (+) & RECONNECT SYSTEM ---\n');

  await connectDatabase();

  // Test 1: Exactly 5 accounts configured
  console.log('[TEST 1] Verifying 5 max account slots...');
  assert.strictEqual(baileysService.maxAccounts, 5);
  const accounts = baileysService.getAllAccounts();
  assert.strictEqual(accounts.length, 5);
  console.log('  ✅ Exactly 5 account slots exist in the manager');

  // Test 2: Dynamic Add Account Slot (+) functionality
  console.log('\n[TEST 2] Verifying Dynamic Plus (+) Add Account Slot...');
  const initialAdded = baileysService.getAddedAccounts();
  assert.strictEqual(initialAdded.length >= 1, true); // Slot 1 is added by default

  // Add next slot
  const addRes = baileysService.addAccountSlot();
  assert.strictEqual(addRes.success, true);
  assert(addRes.account.slot >= 2);
  console.log(`  ✅ Plus (+) button successfully added: ${addRes.account.label} (Slot #${addRes.account.slot})`);

  // Test 3: Disconnected status & Reconnect capability
  console.log('\n[TEST 3] Verifying Disconnected state & Reconnect readiness...');
  const slot2 = baileysService.getAccount(addRes.account.sessionId);
  assert.strictEqual(slot2.status, 'disconnected');
  const statusObj = slot2.getStatus();
  assert.strictEqual(statusObj.status, 'disconnected');
  assert.strictEqual(statusObj.connected, false);
  console.log(`  ✅ Disconnected status confirmed for ${slot2.label}: status='disconnected'`);

  // Test 4: Dynamic Remove Slot functionality
  console.log('\n[TEST 4] Verifying Remove Slot functionality...');
  const removeRes = await baileysService.removeAccountSlot(addRes.account.sessionId);
  assert.strictEqual(removeRes.success, true);
  const slot2After = baileysService.getAccount(addRes.account.sessionId);
  assert.strictEqual(slot2After.isAdded, false);
  console.log(`  ✅ Slot successfully removed and freed up`);

  // Test 5: Message sender session isolation in database
  console.log('\n[TEST 5] Verifying Message records track sender account slot...');
  const testMsg = await Message.create({
    messageId: `slot_test_${Date.now()}`,
    senderSessionId: 'account_1',
    senderPhone: '8801912345678',
    recipient: '+8801700000000',
    recipientJid: '8801700000000@s.whatsapp.net',
    messageType: 'text',
    content: 'Testing multi-account dispatch tracking',
    status: 'sent',
    sentAt: new Date()
  });

  const savedMsg = await Message.findOne({ messageId: testMsg.messageId });
  assert.strictEqual(savedMsg.senderSessionId, 'account_1');
  assert.strictEqual(savedMsg.senderPhone, '8801912345678');
  console.log('  ✅ Message record successfully captured senderSessionId=account_1');

  // Cleanup
  await Message.deleteOne({ messageId: testMsg.messageId });
  await disconnectDatabase();

  console.log('\n--- 🎉 ALL DYNAMIC MULTI-ACCOUNT & RECONNECT TESTS PASSED! ---\n');
}

testMultiAccountSystem().catch(err => {
  console.error('\n❌ Multi-account test failed:', err);
  process.exit(1);
});
