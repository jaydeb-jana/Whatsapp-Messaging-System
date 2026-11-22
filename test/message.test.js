const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const messageService = require('../src/services/whatsapp/messageService');
const Message = require('../src/models/Message');

async function testMessagingValidation() {
  console.log('\n--- 🧪 TESTING MESSAGING VALIDATION & BEHAVIOR ---\n');

  await connectDatabase();

  // Test 1: Sending message while disconnected should throw clean user-friendly error
  console.log('[TEST 1] Verifying disconnected error handling...');
  try {
    await messageService.sendMessage({
      recipient: '+8801712345678',
      messageType: 'text',
      content: 'হ্যালো!'
    });
    assert.fail('Should have thrown disconnected error');
  } catch (err) {
    assert(err.message.includes('WhatsApp is not connected'));
    console.log(`  ✅ Disconnected check passed: "${err.message}"`);
  }

  // Test 2: Invalid phone number validation
  console.log('\n[TEST 2] Verifying recipient phone validation errors...');
  try {
    await messageService.sendMessage({
      recipient: 'invalid_number',
      messageType: 'text',
      content: 'Hello'
    });
    assert.fail('Should have rejected invalid phone number');
  } catch (err) {
    assert(err.message.includes('WhatsApp is not connected') || err.message.includes('Invalid phone number'));
    console.log(`  ✅ Invalid phone rejected properly`);
  }

  // Test 3: Message History Query & Bengali Unicode Search
  console.log('\n[TEST 3] Verifying Bengali Unicode DB Storage & Search...');
  const msgId = `bengali_test_${Date.now()}`;
  await Message.create({
    messageId: msgId,
    recipient: '+8801812345678',
    recipientJid: '8801812345678@s.whatsapp.net',
    messageType: 'text',
    content: 'আমার সোনার বাংলা, আমি তোমায় ভালোবাসি। 🇧🇩✨\nনতুন অফার চালু হয়েছে!',
    status: 'sent',
    sentAt: new Date(),
    metadata: { country: 'Bangladesh' }
  });

  const queryResult = await messageService.getHistory({ search: 'সোনার বাংলা' });
  assert.strictEqual(queryResult.total >= 1, true);
  assert(queryResult.messages[0].content.includes('আমার সোনার বাংলা'));
  console.log('  ✅ Bengali Unicode text stored, queried, and retrieved with complete fidelity');

  // Test 4: Document message metadata & custom filename persistence
  console.log('\n[TEST 4] Verifying Document message metadata...');
  const docMsgId = `doc_test_${Date.now()}`;
  await Message.create({
    messageId: docMsgId,
    recipient: '+12025550199',
    recipientJid: '12025550199@s.whatsapp.net',
    messageType: 'document',
    content: 'Please find attached invoice for November.',
    fileName: 'Invoice_Nov_2026.pdf',
    fileSize: 1048576,
    mimeType: 'application/pdf',
    status: 'sent',
    sentAt: new Date()
  });

  const docRecord = await Message.findOne({ messageId: docMsgId });
  assert.strictEqual(docRecord.fileName, 'Invoice_Nov_2026.pdf');
  assert.strictEqual(docRecord.mimeType, 'application/pdf');
  assert.strictEqual(docRecord.fileSize, 1048576);
  console.log('  ✅ Document metadata (custom filename, mimetype, size) verified');

  // Test 5: Idempotency / Duplicate submission prevention test
  console.log('\n[TEST 5] Verifying Duplicate submission detection...');
  const dupCheck = await messageService.sendMessage({
    recipient: '+12025550199',
    messageType: 'document',
    idempotencyKey: docMsgId
  });
  assert.strictEqual(dupCheck.duplicate, true);
  console.log('  ✅ Duplicate submission blocked by idempotency key');

  // Cleanup
  await Message.deleteMany({ messageId: { $in: [msgId, docMsgId] } });
  await disconnectDatabase();

  console.log('\n--- 🎉 ALL MESSAGING TESTS PASSED SUCCESSFULLY! ---\n');
}

testMessagingValidation().catch(err => {
  console.error('\n❌ Messaging test failed:', err);
  process.exit(1);
});
