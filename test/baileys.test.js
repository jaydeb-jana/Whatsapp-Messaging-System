const assert = require('assert');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const baileysService = require('../src/services/whatsapp/baileysService');

async function testBaileysLive() {
  console.log('\n--- 🧪 TESTING LIVE BAILEYS QR GENERATION ---\n');

  await connectDatabase();

  let qrReceived = false;

  const mockIo = {
    emit: (event, data) => {
      console.log(`  [Socket Event Emitted] ${event}`, data.qrDataUrl ? `(QR DataURL length: ${data.qrDataUrl.length})` : '');
      if (event === 'whatsapp:qr' && data.qrDataUrl) {
        qrReceived = true;
      }
    }
  };

  baileysService.setSocketIO(mockIo);

  console.log('Initializing Baileys socket...');
  await baileysService.initSocket();

  // Wait up to 15 seconds for WhatsApp server to return first QR
  console.log('Waiting for WhatsApp QR code event from WhatsApp servers...');
  for (let i = 0; i < 30; i++) {
    if (qrReceived) break;
    await new Promise(r => setTimeout(r, 500));
  }

  const currentStatus = baileysService.getStatus();
  console.log('Current status:', {
    status: currentStatus.status,
    hasQr: !!currentStatus.qrDataUrl,
    reconnectAttempts: currentStatus.reconnectAttempts
  });

  assert(qrReceived, 'Baileys successfully communicated with WhatsApp servers and received a QR code!');
  assert(currentStatus.qrDataUrl.startsWith('data:image/png;base64,'), 'QR code is formatted as a valid base64 data URL');

  console.log('  ✅ Live WhatsApp QR code verified successfully!');

  // Clean disconnect
  console.log('Cleaning up Baileys socket...');
  await baileysService.disconnect(true);
  console.log('  ✅ Baileys socket disconnected cleanly.');

  await disconnectDatabase();

  console.log('\n--- 🎉 LIVE BAILEYS TEST COMPLETED SUCCESSFULLY! ---\n');
}

testBaileysLive().catch(err => {
  console.error('\n❌ Baileys test failed:', err);
  process.exit(1);
});
