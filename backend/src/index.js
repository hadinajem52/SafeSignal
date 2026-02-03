const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');
require('dotenv').config();

const db = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const incidentsRoutes = require('./routes/incidents');
const statsRoutes = require('./routes/stats');
const usersRoutes = require('./routes/users');
const mapRoutes = require('./routes/map');
const jwt = require('jsonwebtoken');
const { setSocketServer } = require('./utils/socketService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
});

setSocketServer(io);

const JWT_SECRET = process.env.JWT_SECRET || 'safesignal-jwt-secret-change-in-production';

io.use((socket, next) => {
  try {
    const authHeader = socket.handshake.headers?.authorization;
    const token = socket.handshake.auth?.token || (authHeader ? authHeader.split(' ')[1] : null);

    if (!token) {
      return next(new Error('Unauthorized'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    return next();
  } catch (error) {
    return next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const role = socket.user?.role;
  const userId = socket.user?.userId;
  
  logger.info(`Socket connected: User ${userId} with role ${role}`);
  
  // Join role-based rooms
  if (role) {
    socket.join(role);
  }

  if (role === 'admin') {
    socket.join('moderator');
    socket.join('law_enforcement');
  }
  
  /**
   * Join incident room
   * Citizens can only join rooms for their own incidents
   * Staff can join any incident room (both public and internal)
   */
  socket.on('join_incident', async ({ incidentId }) => {
    try {
      const isStaff = ['moderator', 'admin', 'law_enforcement'].includes(role);
      
      // Verify incident exists
      const incident = await db.oneOrNone(
        'SELECT incident_id, reporter_id FROM incidents WHERE incident_id = $1',
        [incidentId]
      );
      
      if (!incident) {
        socket.emit('error', { message: 'Incident not found' });
        return;
      }
      
      // Check access permissions
      const canAccess = isStaff || incident.reporter_id === userId;
      
      if (!canAccess) {
        socket.emit('error', { message: 'Access denied to this incident' });
        return;
      }
      
      // Join public incident room
      const publicRoom = `incident_${incidentId}`;
      socket.join(publicRoom);
      logger.info(`User ${userId} joined room ${publicRoom}`);
      
      // Staff also join internal room
      if (isStaff) {
        const internalRoom = `incident_${incidentId}_internal`;
        socket.join(internalRoom);
        logger.info(`Staff ${userId} joined room ${internalRoom}`);
      }
      
      socket.emit('joined_incident', { incidentId });
    } catch (error) {
      logger.error('Error joining incident room:', error);
      socket.emit('error', { message: 'Failed to join incident' });
    }
  });
  
  /**
   * Leave incident room
   */
  socket.on('leave_incident', ({ incidentId }) => {
    const publicRoom = `incident_${incidentId}`;
    const internalRoom = `incident_${incidentId}_internal`;
    
    socket.leave(publicRoom);
    socket.leave(internalRoom);
    
    logger.info(`User ${userId} left incident rooms for ${incidentId}`);
    socket.emit('left_incident', { incidentId });
  });
  
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: User ${userId}`);
  });
});
const PORT = process.env.PORT || 3000;

// Initialize Sentry (if DSN is provided)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
  logger.info('Sentry initialized');
}

// Middleware
// The request handler must be the first middleware on the app
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Http Logger (Request logging)
app.use((req, res, next) => {
  logger.info(`Incoming Request: ${req.method} ${req.url}`, { ip: req.ip });
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'ERROR', message: 'Too many requests' },
});

app.use('/api/', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Sentry test route (for verifying setup)
app.get('/api/debug-sentry', function mainHandler(req, res) {
  throw new Error('My first Sentry error!');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/map', mapRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'ERROR',
    message: 'Route not found',
  });
});

// Error handling
// The error handler must be before any other error middleware and after all controllers
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Custom error handler (logs to Winston and formats response)
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 SafeSignal Backend running on http://localhost:${PORT}`);
  logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  logger.info(`🏥 Health Check: http://localhost:${PORT}/api/health`);
});
