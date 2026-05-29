const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Sentry = require('@sentry/node');
let nodeProfilingIntegration = null;

try {
  ({ nodeProfilingIntegration } = require('@sentry/profiling-node'));
} catch (_e) {
  // Native binary not available for this Node.js version - profiling disabled.
}

require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const incidentsRoutes = require('./routes/incidents');
const constellationsRoutes = require('./routes/constellations');
const statsRoutes = require('./routes/stats');
const usersRoutes = require('./routes/users');
const mapRoutes = require('./routes/map');
const settingsRoutes = require('./routes/settings');
const adminRoutes = require('./routes/admin');

const app = express();
const REQUEST_BODY_LIMIT = '25mb';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      ...(nodeProfilingIntegration ? [nodeProfilingIntegration()] : []),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
  logger.info('Sentry initialized');
}

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ limit: REQUEST_BODY_LIMIT, extended: true }));

app.use((req, res, next) => {
  logger.info(`Incoming Request: ${req.method} ${req.url}`, { ip: req.ip });
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'ERROR', message: 'Too many requests' },
  skip: (req) => req.method === 'OPTIONS',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'ERROR', message: 'Too many login attempts, please try again later' },
  skipSuccessfulRequests: true,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/debug-sentry', function mainHandler(req, res) {
  throw new Error('My first Sentry error!');
});

app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/constellations', constellationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    status: 'ERROR',
    message: 'Route not found',
  });
});

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use(errorHandler);

module.exports = app;
