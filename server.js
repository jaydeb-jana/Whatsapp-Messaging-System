require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./src/app');
const { connectDatabase, disconnectDatabase } = require('./src/config/database');
const setupSocketIO = require('./src/sockets/socketHandler');
const baileysService = require('./src/services/whatsapp/baileysService');
const { hasExistingSession } = require('./src/services/whatsapp/sessionStore');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  try {
    // 1. Connect database
    await connectDatabase();

    // 2. Create HTTP & Socket.IO server
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // 3. Attach Socket.IO
    setupSocketIO(io);

    // 4. Start HTTP server
    server.listen(PORT, HOST, () => {
      logger.success(`🚀 Server running on:`);
      logger.info(`   Local:   http://localhost:${PORT}`);
      logger.info(`   Network: http://192.168.0.182:${PORT}`);
      logger.info(`Dashboard: http://localhost:${PORT}/`);
      logger.info(`Connect WhatsApp: http://localhost:${PORT}/whatsapp/connect`);
      logger.info(`Message History: http://localhost:${PORT}/messages/history`);
      logger.info(`API Send Message: POST http://localhost:${PORT}/api/messages/send`);
    });

    // 5. Auto-restore WhatsApp accounts (up to 5 accounts)
    await baileysService.autoRestoreAll();

    // Graceful Shutdown
    const handleShutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      try {
        await baileysService.disconnect(false); // disconnect socket without logging out session
        await disconnectDatabase();
        server.close(() => {
          logger.info('HTTP server closed.');
          process.exit(0);
        });
      } catch (err) {
        logger.error('Error during shutdown:', err);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  } catch (err) {
    logger.error('Failed to start application server:', err);
    process.exit(1);
  }
}

bootstrap();
