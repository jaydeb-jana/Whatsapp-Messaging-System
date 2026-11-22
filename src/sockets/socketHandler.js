const baileysService = require('../services/whatsapp/baileysService');
const messageService = require('../services/whatsapp/messageService');
const logger = require('../utils/logger');

function setupSocketIO(io) {
  // Bind IO instance to Baileys service
  baileysService.setSocketIO(io);

  io.on('connection', async (socket) => {
    logger.debug(`Client connected via Socket.IO [ID: ${socket.id}]`);

    // Emit initial status to newly connected client
    const currentStatus = baileysService.getStatus();
    socket.emit('whatsapp:status', currentStatus);

    if (currentStatus.qrDataUrl) {
      socket.emit('whatsapp:qr', {
        qrDataUrl: currentStatus.qrDataUrl,
        qrTimestamp: currentStatus.qrTimestamp,
        qrExpirySeconds: currentStatus.qrExpirySeconds
      });
    }

    // Client requests status refresh
    socket.on('request:status', () => {
      socket.emit('whatsapp:status', baileysService.getStatus());
    });

    // Client requests stats refresh
    socket.on('request:stats', async () => {
      try {
        const stats = await messageService.getStats();
        socket.emit('dashboard:stats', stats);
      } catch (err) {
        logger.error('Error fetching stats on socket request:', err.message);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`Client disconnected [ID: ${socket.id}]: ${reason}`);
    });
  });

  return io;
}

module.exports = setupSocketIO;
