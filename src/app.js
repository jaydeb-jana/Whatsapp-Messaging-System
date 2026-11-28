const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');

const securityMiddleware = require('./middleware/security');
const pinAuthMiddleware = require('./middleware/pinAuth');
const { generalLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const messageRoutes = require('./routes/messageRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();

const sessionSecret = process.env.SESSION_SECRET || 'whatsapp_platform_pin_auth_secret_982347';

// Security headers
app.use(securityMiddleware);

// CORS
app.use(cors({ origin: true, credentials: true }));

// Rate limiting on API routes
app.use('/api/', generalLimiter);

// Cookie parser for signed cookies
app.use(cookieParser(sessionSecret));

// Session middleware for PIN verification
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax'
      // No maxAge: strictly a browser session cookie (clears when browser/tab session closes)
    }
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// EJS View Engine Setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Global template variables
app.use((req, res, next) => {
  res.locals.appName = process.env.APP_NAME || 'WhatsFlow Pro';
  res.locals.currentPath = req.path;
  res.locals.isPinVerified = (req.session && req.session.isPinVerified) ||
                             (req.signedCookies && req.signedCookies.app_pin_verified === 'true');
  next();
});

// Authentication / PIN Routes (Publicly accessible)
app.use('/auth', authRoutes);

// Parse multipart upload fields for message send API before PIN auth so req.body.pin is available
const upload = require('./middleware/uploadMiddleware');
app.use('/api/messages/send', upload.any());

// PIN Protection Barrier: Protects all subsequent dashboard, messaging & API routes
app.use(pinAuthMiddleware);

// Protected Application Routes
app.use('/', dashboardRoutes);
app.use('/whatsapp', whatsappRoutes);
app.use('/messages', messageRoutes);
app.use('/api', apiRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
