# Whatsapp-Messaging-System

> **WhatsFlow Pro** — Professional WhatsApp Web Messaging & Multi-Account Automation Platform.

A modern, production-grade WhatsApp Web Messaging and Automation Platform built using **Node.js, Express.js, EJS, Baileys (@whiskeysockets/baileys), MongoDB (Mongoose), and Socket.IO**.

The platform enables users to pair their WhatsApp accounts using real-time QR code scanning and dispatch text (with Bengali & Unicode support), high-resolution images, videos, and documents through an enterprise-grade web dashboard.

---

## 🌟 Key Features

- **WhatsApp Connection Management (Baileys Multi-Device):**
  - Instant pairing via live dynamic QR codes.
  - Automatic QR expiration detection and smooth auto-refresh with countdown timer.
  - Real-time connection status tracking: `Connected`, `Disconnected`, `Connecting`, `Reconnecting`.
  - Display of linked account details (phone number, name, platform, connection time).
  - Clean account disconnect / logout functionality.
  - Automatic session restoration after server restarts.
  - Robust auto-reconnect backoff loop on transient network dropouts.

- **Enterprise Messaging System:**
  - **Text Messages:** Multi-line text, emojis, full Unicode and Bengali script support (`আমার সোনার বাংলা`).
  - **Image Messages:** JPG, JPEG, PNG, WebP with custom optional captions.
  - **Video Messages:** MP4, 3GP, MOV, MKV with optional captions.
  - **Document Messages:** PDF, DOC, DOCX, XLS, XLSX, ZIP, TXT, CSV with custom recipient-facing filenames.
  - **Validation & Reliability:** Real-time phone number sanitization (E.164 compliance), country code detection, file size and MIME-type validation, and idempotency key protection against duplicate submissions.

- **Real-Time Interactive Dashboard:**
  - Modern, dark-mode SaaS UI inspired by Linear and Tailwind.
  - WebSocket-powered updates via Socket.IO — no page refresh needed.
  - Live metric cards: Total Messages, Delivered Messages, Failed Dispatches, Sent Today, and Success Rate %.
  - Recent activity table with live prepending of newly dispatched messages.
  - Real-time toast notifications for all transmission and connection events.

- **Message History & Audit Log:**
  - Complete persistent history stored in MongoDB.
  - Multi-parameter filtering by Delivery Status (`Sent`, `Failed`, `Sending`), Message Type, and search by recipient number or content.
  - Pagination and detailed failure trace inspection.

- **Security & Session Isolation:**
  - WhatsApp multi-file auth credentials are kept server-side in `storage/whatsapp-sessions/` and never exposed to the frontend.
  - Strict Content Security Policy (CSP) with Helmet.
  - Rate limiting on API routes and message dispatching to prevent accidental spam.
  - Multer upload filtering with strict MIME and extension checking.
  - Resilient database layer: seamlessly operates with an external MongoDB URI or automatically spins up an embedded in-memory MongoDB during local testing.

- **Bespoke UI & Zero-Browser-Alert Architecture:**
  - **Zero Native Alerts/Confirms:** Native `alert()` and `confirm()` are strictly forbidden across the codebase.
  - **Bespoke Glassmorphic Dialogs:** Built with custom vanilla JS/CSS (`showToast()`, `showConfirmDialog()`, `showAlertDialog()`).
  - **100% English Web Interface:** Clean, internationalized enterprise interface matching modern dark aesthetics.
  - **Multi-Account Manager:** Up to 5 concurrent WhatsApp accounts with isolated sockets, conditional pairing, and full CRUD control over every slot.

---

## 📂 Project Architecture

```text
whatsapp-platform/
│
├── src/
│   ├── config/
│   │   ├── database.js              # Resilient MongoDB / Mongoose connection manager
│   │   └── index.js
│   ├── controllers/
│   │   ├── dashboardController.js   # Dashboard metrics & overview
│   │   ├── whatsappController.js    # WhatsApp QR & connection APIs
│   │   └── messageController.js     # Composer & message history controller
│   ├── routes/
│   │   ├── dashboardRoutes.js       # Web view routes (/)
│   │   ├── whatsappRoutes.js        # Web view routes (/whatsapp/connect)
│   │   ├── messageRoutes.js         # Web view routes (/messages/*)
│   │   └── apiRoutes.js             # REST API endpoints (/api/*)
│   ├── services/
│   │   └── whatsapp/
│   │       ├── baileysService.js    # Baileys socket lifecycle & QR manager
│   │       ├── messageService.js    # Message dispatcher (text, media, docs)
│   │       └── sessionStore.js      # Session file isolation & persistence
│   ├── middleware/
│   │   ├── errorHandler.js          # Unified 404 & 500 error handler
│   │   ├── uploadMiddleware.js      # Multer file size & MIME validator
│   │   ├── rateLimiter.js           # API and dispatch rate limiters
│   │   └── security.js              # Helmet security headers & CSP
│   ├── models/
│   │   ├── Message.js               # Mongoose schema for messages
│   │   ├── WhatsAppSession.js       # Mongoose schema for session state
│   │   └── ActivityLog.js           # Mongoose schema for system events
│   ├── sockets/
│   │   └── socketHandler.js         # Real-time Socket.IO event handler
│   ├── utils/
│   │   ├── logger.js                # Formatted logger with file persistence
│   │   └── phoneValidator.js        # Phone sanitizer & E.164 validator
│   └── app.js                       # Express application bootstrap
│
├── views/
│   ├── layouts/
│   │   └── main.ejs                 # Master EJS layout template
│   ├── partials/
│   │   ├── header.ejs               # Top bar with active account indicator
│   │   ├── sidebar.ejs              # Navigation & live status pill
│   │   └── footer.ejs               # Responsive footer
│   ├── dashboard/
│   │   └── index.ejs                # Dashboard overview & stats
│   ├── whatsapp/
│   │   └── connect.ejs              # WhatsApp QR connection interface
│   ├── messages/
│   │   ├── send.ejs                 # Rich message composer (Text/Media/Doc)
│   │   └── history.ejs              # Filterable history ledger
│   └── errors/
│       ├── 404.ejs
│       └── 500.ejs
│
├── public/
│   ├── css/
│   │   ├── style.css                # Base SaaS theme & responsive layout
│   │   └── dashboard.css            # Dashboard, composer & table styling
│   ├── js/
│   │   ├── toast.js                 # Toast notification utility
│   │   ├── socket-client.js         # Real-time WebSocket bridge
│   │   ├── dashboard.js             # Real-time stats listener
│   │   ├── connect.js               # Dynamic QR countdown & scanner
│   │   └── messenger.js             # Composer validation & file uploader
│   ├── images/
│   └── uploads/                     # Uploaded media staging directory
│
├── storage/
│   └── whatsapp-sessions/           # Multi-device session credentials
├── logs/                            # Persistent application logs
├── test/
│   ├── system.test.js               # Unit and integration test suite
│   ├── message.test.js              # Message validation test suite
│   └── baileys.test.js              # Live Baileys QR generation test
├── .env.example
├── package.json
└── server.js                        # HTTP & WebSocket entrypoint
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.x, v20.x, or v22.x+
- **NPM**: v9.x or higher
- **MongoDB**: (Optional) A local `mongod` instance or MongoDB Atlas URI. If no external MongoDB is running, the application will automatically start an embedded in-memory MongoDB database so that all features work out-of-the-box.

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd whatsapp-platform
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Review the `.env` settings:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/whatsapp_platform
USE_MEMORY_DB_FALLBACK=true
SESSION_SECRET=your_secure_secret_here
WHATSAPP_SESSION_PATH=./storage/whatsapp-sessions
MAX_FILE_SIZE_MB=50
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
APP_NAME="WhatsFlow Pro"
```

### 4. Running the Application
To start the production server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📱 WhatsApp Connection Workflow

1. Open `http://localhost:3000/whatsapp/connect`.
2. Click **Initialize Connection** (or **Refresh QR**).
3. Open WhatsApp on your mobile phone:
   - Go to **Settings > Linked Devices** (or tap the 3 dots menu on Android).
   - Tap **Link a Device**.
4. Scan the QR code displayed on the screen.
5. Once scanned, the socket triggers a `whatsapp:connected` event via Socket.IO:
   - The QR frame transitions to the **Connected & Ready** account card.
   - The status pill turns **Green (Connected)**.
   - Your account name and phone number appear in the header and sidebar.
6. The session credentials persist in `storage/whatsapp-sessions/default`. If the server restarts, the session is **automatically restored** without re-scanning.

---

## 💬 Message Dispatching (REST API)

Dispatch messages programmatically via the REST API endpoint (`POST /api/messages/send`):

1. **Recipient Input:**
   Pass the recipient's phone number with country code (e.g., `8801712345678` or `+1 202 555 0199`). The validator will automatically detect country and validate E.164 formatting.
2. **Select Message Type:**
   - **Text:** Plain text, multi-line content, emojis, or Unicode/Bengali messages.
   - **Image:** JPG, PNG, or WebP images with an optional caption.
   - **Video:** MP4 or 3GP videos up to 50MB with an optional caption.
   - **Document:** PDF, DOCX, XLSX, or ZIP files with a customizable recipient-facing filename.
3. **Dispatch:**
   Post to `/api/messages/send` with optional `accountSlot` (`account_1` through `account_5`) to select the sender account. Real-time delivery status is logged to MongoDB and visible in the Message History audit log.

---

## 🔌 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/stats` | `GET` | Retrieve real-time dashboard metrics and connection status. |
| `/api/whatsapp/status` | `GET` | Get current WhatsApp connection state and account details. |
| `/api/whatsapp/connect` | `POST` | Trigger Baileys socket initialization and generate a new QR code. |
| `/api/whatsapp/disconnect` | `POST` | Disconnect the active socket and logout session. |
| `/api/messages/send` | `POST` | Dispatch a message (`recipient`, `messageType`, `content`, `media`, `customFileName`). |
| `/api/messages/history` | `GET` | Query message history with filters (`status`, `type`, `search`, `page`). |
| `/api/messages/:id` | `GET` | Get detailed audit record for a single message. |

---

## 🧪 Testing & Verification

The project includes automated test suites covering database persistence, phone sanitization, Baileys QR generation, and messaging validation:

```bash
npm test
```

To run the live Baileys WhatsApp QR generation test:
```bash
node test/baileys.test.js
```

---

## 🛡️ Security & Anti-Spam Compliance

- **End-to-End Encryption:** WhatsApp messages are encrypted end-to-end via WhatsApp's Signal Protocol implementation.
- **Session Protection:** Auth keys are stored with restricted permissions and never logged or exposed to the client.
- **Rate Limiting:** Built-in rate limiting prevents bulk flood dispatches.
- **Opt-in Compliance:** Messaging should only be conducted with recipients who have given consent to receive communications.

---

## 📄 License
ISC License © 2026 WhatsFlow Pro.
