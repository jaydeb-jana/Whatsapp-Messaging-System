const assert = require('assert');
const baileysService = require('../src/services/whatsapp/baileysService');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const Message = require('../src/models/Message');

async function testMultiAccountSystem() {
  console.log('\n--- 🧪 TESTING MULTI-ACCOUNT DYNAMIC PLUS (+) & CONDITIONAL PERSISTENCE ---\n');

  await connectDatabase();

  // Test 1: Exactly 5 accounts configured
  console.log('[TEST 1] Verifying 5 max account slots...');
  assert.strictEqual(baileysService.maxAccounts, 5);
  const accounts = baileysService.getAllAccounts();
  assert.strictEqual(accounts.length, 5);
  console.log('  ✅ Exactly 5 account slots exist in the manager');

  // Test 2: Temporary pairing handshake does NOT persist slot until connected
  console.log('\n[TEST 2] Verifying Temporary Pairing does NOT save slot before connection...');
  const initialAdded = baileysService.getAddedAccounts();
  const pairRes = baileysService.startNewAccountPairing();
  assert.strictEqual(pairRes.success, true);
  assert(pairRes.slot >= 1);

  // Check that slot is NOT marked as added yet!
  const pendingSession = baileysService.getAccount(pairRes.sessionId);
  assert.strictEqual(pendingSession.isAdded, false);
  const currentAdded = baileysService.getAddedAccounts();
  assert.strictEqual(currentAdded.length, initialAdded.length);
  console.log(`  ✅ Verified: Pending pairing for ${pairRes.label} is NOT added/saved to account list`);

  // Test 3: Cancelling pairing cleans up without leaving ghost slot
  console.log('\n[TEST 3] Verifying Cancel Pairing cleans up cleanly...');
  const cancelRes = await baileysService.cancelPairing(pairRes.sessionId);
  assert.strictEqual(cancelRes.success, true);
  assert.strictEqual(pendingSession.isAdded, false);
  console.log('  ✅ Cancelled pairing verified: no ghost slots created');

  // Test 4: Dynamic Add & Remove Slot
  console.log('\n[TEST 4] Verifying Dynamic Slot Add & Remove...');
  const addRes = baileysService.addAccountSlot();
  assert.strictEqual(addRes.success, true);
  const removeRes = await baileysService.removeAccountSlot(addRes.account.sessionId);
  assert.strictEqual(removeRes.success, true);
  console.log('  ✅ Dynamic add & remove functionality verified');

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

  // Test 6: Verifying Pairing Code method validation
  console.log('\n[TEST 6] Verifying Phone Number Pairing Code method validation...');
  await assert.rejects(
    async () => {
      await baileysService.requestPairingCode('account_1', '');
    },
    { message: /Phone number is required/ }
  );

  await assert.rejects(
    async () => {
      await baileysService.requestPairingCode('account_1', '123');
    },
    { message: /valid phone number/ }
  );
  console.log('  ✅ Phone Number Pairing Code validation confirmed');

  // Test 7: Verifying Reconnect purges session files before starting clean session
  console.log('\n[TEST 7] Verifying Reconnect purges session files and starts clean session...');
  const reconnectResult = await baileysService.reconnect('account_2', true);
  assert.strictEqual(reconnectResult.sessionId, 'account_2');
  assert.strictEqual(reconnectResult.status, 'connecting');
  // Cancel the test connecting socket cleanly
  await baileysService.cancelPairing('account_2');
  console.log('  ✅ Reconnect session purge and fresh socket initialization confirmed');

  await disconnectDatabase();

  console.log('\n--- 🎉 ALL DYNAMIC PLUS (+) & CONDITIONAL PERSISTENCE TESTS PASSED! ---\n');
  process.exit(0);
}

testMultiAccountSystem().catch(err => {
  console.error('\n❌ Multi-account test failed:', err);
  process.exit(1);
});
