const mongoose = require('mongoose');
const logger = require('../utils/logger');

let memoryServer = null;

async function connectDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp_platform';

  const bindEvents = () => {
    mongoose.connection.on('connected', () => {
      logger.success(`MongoDB connected successfully to ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB runtime error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost/closed');
    });
  };

  try {
    logger.info(`Attempting to connect to MongoDB at ${uri}...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000
    });
    bindEvents();
    return mongoose.connection;
  } catch (err) {
    logger.warn(`External MongoDB not reachable (${err.message}).`);

    if (process.env.USE_MEMORY_DB_FALLBACK !== 'false') {
      try {
        logger.info('Starting embedded MongoDB instance for seamless local operation...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create({
          instance: {
            dbName: 'whatsapp_platform'
          }
        });
        const memoryUri = memoryServer.getUri();
        logger.info(`Embedded MongoDB running at: ${memoryUri}`);

        await mongoose.connect(memoryUri);
        bindEvents();
        logger.success('Connected to embedded MongoDB database successfully.');
        return mongoose.connection;
      } catch (memErr) {
        logger.error('Failed to start embedded MongoDB instance:', memErr);
        throw memErr;
      }
    } else {
      throw err;
    }
  }
}

async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
      logger.info('Embedded MongoDB server stopped.');
    }
  } catch (err) {
    logger.error('Error disconnecting database:', err);
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase
};
