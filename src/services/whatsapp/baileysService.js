const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const mongoose = require('mongoose');
const { getSessionPath, hasExistingSession, clearSession } = require('./sessionStore');
const WhatsAppSession = require('../../models/WhatsAppSession');
const ActivityLog = require('../../models/ActivityLog');
const logger = require('../../utils/logger');

const MAX_ACCOUNTS = 5;

class SingleAccountSession {
  constructor(slotNumber, ioCallback) {
    this.slot = slotNumber;
    this.sessionId = `account_${slotNumber}`;
    this.label = `Account ${slotNumber}`;
    this.socket = null;
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
    this.qrCode = null;
    this.qrDataUrl = null;
    this.qrTimestamp = null;
    this.qrExpirySeconds = 45;
    this.accountInfo = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.isReconnecting = false;
    this.isExplicitDisconnect = false;
    this.reconnectTimeout = null;
    this.silentLogger = pino({ level: 'silent' });
    this.broadcast = ioCallback;
    this.isAdded = slotNumber === 1 || hasExistingSession(this.sessionId);
  }

  getStatus() {
    return {
      slot: this.slot,
      sessionId: this.sessionId,
      label: this.label,
      isAdded: this.isAdded,
      status: this.status,
      connected: this.status === 'connected',
      connecting: this.status === 'connecting',
      reconnecting: this.status === 'reconnecting',
      accountInfo: this.accountInfo,
      qrDataUrl: this.status === 'connected' ? null : this.qrDataUrl,
      qrTimestamp: this.qrTimestamp,
      qrExpirySeconds: this.qrExpirySeconds,
      reconnectAttempts: this.reconnectAttempts,
      hasSavedSession: hasExistingSession(this.sessionId)
    };
  }

  isConnected() {
    return this.status === 'connected' && !!this.socket;
  }

  async updateDatabase(status, extraData = {}) {
    try {
      if (mongoose.connection.readyState !== 1) return;
      const updateData = {
        status,
        lastActive: new Date(),
        ...extraData
      };

      await WhatsAppSession.findOneAndUpdate(
        { sessionId: this.sessionId },
        { $set: updateData },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (err) {
      logger.error(`Failed to update DB for [${this.sessionId}]:`, err.message);
    }
  }

  async logActivity(event, details, level = 'info', meta = {}) {
    try {
      if (mongoose.connection.readyState !== 1) return;
      await ActivityLog.create({
        type: 'connection',
        event,
        details: `[${this.label}] ${details}`,
        level,
        meta: { sessionId: this.sessionId, slot: this.slot, ...meta }
      });
    } catch (err) {
      logger.error(`Failed to log activity for [${this.sessionId}]:`, err.message);
    }
  }

  async initSocket() {
    if (this.status === 'connecting' || this.status === 'connected') {
      logger.info(`[${this.label}] Socket already in state: ${this.status}`);
      return this.getStatus();
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isExplicitDisconnect = false;
    this.status = this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting';

    this.broadcast('whatsapp:status', this.getStatus());
    this.broadcast('whatsapp:account_update', this.getStatus());
    await this.updateDatabase(this.status);

    try {
      const sessionPath = getSessionPath(this.sessionId);
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      let version;
      try {
        const vInfo = await fetchLatestBaileysVersion();
        version = vInfo.version;
      } catch (vErr) {
        version = [2, 3000, 1015901307];
      }

      logger.info(`Initializing Baileys for [${this.label}] with version [${version.join('.')}]...`);

      if (this.socket) {
        try {
          this.socket.ev.removeAllListeners();
          if (this.socket.ws) this.socket.ws.close();
        } catch (cleanupErr) {
          // ignore
        }
        this.socket = null;
      }

      this.socket = makeWASocket({
        version,
        auth: state,
        logger: this.silentLogger,
        printQRInTerminal: false,
        browser: [`WhatsFlow Pro #${this.slot}`, 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        emitOwnEvents: false,
        syncFullHistory: false
      });

      this.socket.ev.on('creds.update', saveCreds);

      this.socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = qr;
          this.qrTimestamp = Date.now();
          try {
            this.qrDataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              scale: 8,
              color: { dark: '#0f172a', light: '#ffffff' }
            });
            logger.info(`[${this.label}] New QR code generated.`);

            this.broadcast('whatsapp:qr', {
              slot: this.slot,
              sessionId: this.sessionId,
              label: this.label,
              qrDataUrl: this.qrDataUrl,
              qrTimestamp: this.qrTimestamp,
              qrExpirySeconds: this.qrExpirySeconds
            });

            await this.updateDatabase(this.status, { qrGeneratedAt: new Date() });
          } catch (qrErr) {
            logger.error(`[${this.label}] QR generation failed:`, qrErr);
          }
        }

        if (connection === 'open') {
          this.status = 'connected';
          this.qrCode = null;
          this.qrDataUrl = null;
          this.reconnectAttempts = 0;
          this.isReconnecting = false;

          let rawPhone = '';
          let jid = '';
          let name = `WhatsApp Account #${this.slot}`;

          if (this.socket.user) {
            jid = this.socket.user.id;
            rawPhone = jid.split(':')[0].split('@')[0];
            name = this.socket.user.name || this.socket.user.notify || `+${rawPhone}`;
          }

          this.accountInfo = {
            phoneNumber: rawPhone,
            formattedPhone: `+${rawPhone}`,
            name,
            jid,
            connectedAt: new Date()
          };

          logger.success(`[${this.label}] Connected successfully! Account: ${this.accountInfo.name} (${this.accountInfo.formattedPhone})`);

          await this.updateDatabase('connected', {
            phoneNumber: rawPhone,
            pushName: name,
            jid,
            connectedAt: new Date(),
            reconnectCount: 0
          });

          await this.logActivity(
            'Connected',
            `Connected as ${this.accountInfo.name} (+${rawPhone})`,
            'success',
            { phoneNumber: rawPhone, jid }
          );

          this.broadcast('whatsapp:connected', {
            slot: this.slot,
            sessionId: this.sessionId,
            label: this.label,
            status: 'connected',
            accountInfo: this.accountInfo
          });
          this.broadcast('whatsapp:account_update', this.getStatus());
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !this.isExplicitDisconnect;

          logger.warn(`[${this.label}] Connection closed. StatusCode: ${statusCode}`);

          if (statusCode === DisconnectReason.loggedOut || this.isExplicitDisconnect) {
            this.status = 'disconnected';
            this.accountInfo = null;
            this.qrCode = null;
            this.qrDataUrl = null;
            this.reconnectAttempts = 0;
            this.isReconnecting = false;

            if (statusCode === DisconnectReason.loggedOut) {
              clearSession(this.sessionId);
              logger.info(`[${this.label}] Account was logged out. Session files purged.`);
            }

            await this.updateDatabase('disconnected', { disconnectedAt: new Date() });
            await this.logActivity(
              'Disconnected',
              this.isExplicitDisconnect ? 'Disconnected by user' : 'Logged out from device',
              'warn'
            );

            this.broadcast('whatsapp:disconnected', {
              slot: this.slot,
              sessionId: this.sessionId,
              label: this.label,
              status: 'disconnected',
              reason: this.isExplicitDisconnect ? 'User disconnected' : 'Logged out'
            });
            this.broadcast('whatsapp:account_update', this.getStatus());
          } else if (shouldReconnect) {
            this.status = 'reconnecting';
            this.reconnectAttempts += 1;
            this.isReconnecting = true;

            const backoffMs = Math.min(3000 * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
            logger.info(`[${this.label}] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${backoffMs}ms...`);

            await this.updateDatabase('reconnecting', { reconnectCount: this.reconnectAttempts });

            this.broadcast('whatsapp:reconnecting', {
              slot: this.slot,
              sessionId: this.sessionId,
              label: this.label,
              status: 'reconnecting',
              attempt: this.reconnectAttempts,
              maxAttempts: this.maxReconnectAttempts
            });
            this.broadcast('whatsapp:account_update', this.getStatus());

            if (this.reconnectAttempts <= this.maxReconnectAttempts) {
              this.reconnectTimeout = setTimeout(() => {
                this.initSocket().catch((err) => {
                  logger.error(`[${this.label}] Reconnection error:`, err);
                });
              }, backoffMs);
            } else {
              this.status = 'disconnected';
              this.broadcast('whatsapp:account_update', this.getStatus());
            }
          }
        }
      });

      return this.getStatus();
    } catch (err) {
      this.status = 'disconnected';
      logger.error(`[${this.label}] Error initializing Baileys socket:`, err);
      this.broadcast('whatsapp:account_update', this.getStatus());
      await this.updateDatabase('disconnected');
      throw err;
    }
  }

  async disconnect(logout = true) {
    logger.info(`[${this.label}] Disconnecting (logout=${logout})...`);
    this.isExplicitDisconnect = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    try {
      if (this.socket) {
        if (logout) {
          try {
            await this.socket.logout();
          } catch (logoutErr) {
            logger.warn(`[${this.label}] Socket logout warning:`, logoutErr.message);
          }
        }
        try {
          this.socket.ev.removeAllListeners();
          if (this.socket.ws) this.socket.ws.close();
        } catch (closeErr) {
          // ignore
        }
        this.socket = null;
      }

      if (logout) {
        clearSession(this.sessionId);
      }

      this.status = 'disconnected';
      this.accountInfo = null;
      this.qrCode = null;
      this.qrDataUrl = null;
      this.reconnectAttempts = 0;

      await this.updateDatabase('disconnected', { disconnectedAt: new Date() });
      await this.logActivity(
        logout ? 'Logged Out' : 'Disconnected',
        logout ? 'Account session purged and logged out' : 'Socket disconnected',
        'info'
      );

      this.broadcast('whatsapp:disconnected', {
        slot: this.slot,
        sessionId: this.sessionId,
        label: this.label,
        status: 'disconnected',
        reason: logout ? 'Logged out' : 'Disconnected'
      });
      this.broadcast('whatsapp:account_update', this.getStatus());

      return { success: true, message: `Account ${this.slot} disconnected successfully` };
    } catch (err) {
      logger.error(`[${this.label}] Disconnect error:`, err);
      return { success: false, error: err.message };
    }
  }
}

class MultiAccountBaileysService {
  constructor() {
    this.maxAccounts = MAX_ACCOUNTS;
    this.io = null;
    this.accounts = new Map();

    // Initialize 5 account slots
    for (let slot = 1; slot <= this.maxAccounts; slot++) {
      const sessionId = `account_${slot}`;
      this.accounts.set(sessionId, new SingleAccountSession(slot, (event, data) => this.broadcast(event, data)));
    }
  }

  setSocketIO(io) {
    this.io = io;
  }

  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  // Normalize sessionId (supports 'default' -> 'account_1')
  normalizeSessionId(sessionId) {
    if (!sessionId || sessionId === 'default') return 'account_1';
    if (typeof sessionId === 'number') return `account_${sessionId}`;
    return sessionId;
  }

  getAccount(sessionId) {
    const id = this.normalizeSessionId(sessionId);
    return this.accounts.get(id) || this.accounts.get('account_1');
  }

  getAllAccounts() {
    const list = [];
    for (let slot = 1; slot <= this.maxAccounts; slot++) {
      const session = this.accounts.get(`account_${slot}`);
      list.push(session.getStatus());
    }
    return list;
  }

  getConnectedAccounts() {
    return this.getAllAccounts().filter(acc => acc.connected);
  }

  getAddedAccounts() {
    return this.getAllAccounts().filter(acc => acc.isAdded);
  }

  addAccountSlot() {
    for (let slot = 1; slot <= this.maxAccounts; slot++) {
      const sessionId = `account_${slot}`;
      const session = this.accounts.get(sessionId);
      if (session && !session.isAdded) {
        session.isAdded = true;
        logger.info(`Added new WhatsApp account slot: ${session.label} (${sessionId})`);
        this.broadcast('whatsapp:account_added', session.getStatus());
        this.broadcast('whatsapp:account_update', session.getStatus());
        return {
          success: true,
          account: session.getStatus(),
          message: `${session.label} added successfully.`
        };
      }
    }
    return {
      success: false,
      error: 'Maximum of 5 WhatsApp accounts already added.'
    };
  }

  async removeAccountSlot(sessionId) {
    const id = this.normalizeSessionId(sessionId);
    const session = this.accounts.get(id);
    if (!session) {
      return { success: false, error: 'Account not found' };
    }

    await session.disconnect(true);
    if (session.slot > 1) {
      session.isAdded = false;
    }
    logger.info(`Removed WhatsApp account slot: ${session.label} (${id})`);
    this.broadcast('whatsapp:account_removed', { sessionId: id, slot: session.slot });
    this.broadcast('whatsapp:account_update', session.getStatus());
    return {
      success: true,
      message: `${session.label} removed successfully.`
    };
  }

  getStatus(sessionId) {
    if (sessionId) {
      return this.getAccount(sessionId).getStatus();
    }
    // Summary status: connected if ANY account is connected
    const all = this.getAllAccounts();
    const connectedAcc = all.find(acc => acc.connected) || all[0];
    const totalConnected = all.filter(acc => acc.connected).length;

    return {
      ...connectedAcc,
      totalConnected,
      maxAccounts: this.maxAccounts,
      accounts: all
    };
  }

  isConnected(sessionId) {
    if (sessionId) {
      return this.getAccount(sessionId).isConnected();
    }
    // True if at least one account is connected
    for (const session of this.accounts.values()) {
      if (session.isConnected()) return true;
    }
    return false;
  }

  getSocket(sessionId) {
    if (sessionId) {
      return this.getAccount(sessionId).socket;
    }
    // Return first connected socket
    for (const session of this.accounts.values()) {
      if (session.isConnected()) return session.socket;
    }
    return null;
  }

  async initSocket(sessionId) {
    const targetSession = this.getAccount(sessionId);
    return await targetSession.initSocket();
  }

  async disconnect(sessionId, logout = true) {
    const targetSession = this.getAccount(sessionId);
    return await targetSession.disconnect(logout);
  }

  async autoRestoreAll() {
    logger.info(`Scanning all ${this.maxAccounts} account slots for saved credentials...`);
    let restoredCount = 0;
    for (let slot = 1; slot <= this.maxAccounts; slot++) {
      const sessionId = `account_${slot}`;
      // Also check if legacy 'default' session exists and migrate it to account_1
      if (slot === 1 && hasExistingSession('default') && !hasExistingSession('account_1')) {
        logger.info('Migrating legacy default session to account_1...');
        const fs = require('fs');
        const path = require('path');
        const defaultPath = getSessionPath('default');
        const account1Path = getSessionPath('account_1');
        fs.cpSync(defaultPath, account1Path, { recursive: true });
      }

      if (hasExistingSession(sessionId)) {
        logger.info(`Found saved credentials for Account #${slot} (${sessionId}). Auto-restoring connection in background...`);
        const session = this.accounts.get(sessionId);
        session.initSocket().catch(err => {
          logger.warn(`Failed to auto-restore Account #${slot}:`, err.message);
        });
        restoredCount++;
      }
    }
    if (restoredCount === 0) {
      logger.info('No saved WhatsApp accounts found. Link devices via /whatsapp/connect.');
    }
  }
}

const baileysService = new MultiAccountBaileysService();

module.exports = baileysService;
