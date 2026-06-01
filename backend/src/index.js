const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = require('./app');
const db = require('./config/database');
const logger = require('./utils/logger');
const { startConstellationMaintenance } = require('./jobs/constellationMaintenance');
const { startWeeklyDigestScheduler } = require('./services/notificationService');
const { setSocketServer } = require('./utils/socketService');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'safesignal-jwt-secret-change-in-production';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
});

setSocketServer(io);

io.use(async (socket, next) => {
  try {
    const authHeader = socket.handshake.headers?.authorization;
    const token = socket.handshake.auth?.token || (authHeader ? authHeader.split(' ')[1] : null);

    if (!token) {
      return next(new Error('Unauthorized'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = await db.oneOrNone(
      'SELECT role, is_suspended FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (!dbUser || dbUser.is_suspended) {
      return next(new Error('Unauthorized'));
    }

    socket.user = {
      ...decoded,
      role: dbUser.role,
    };
    return next();
  } catch {
    return next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const role = socket.user?.role;
  const userId = socket.user?.userId;

  logger.info(`Socket connected: User ${userId} with role ${role}`);

  if (role) {
    socket.join(role);
  }

  if (userId) {
    socket.join(`user_${userId}`);
  }

  if (role === 'admin') {
    socket.join('moderator');
    socket.join('law_enforcement');
  }

  socket.on('join_incident', async ({ incidentId }) => {
    try {
      const isStaff = ['moderator', 'admin', 'law_enforcement'].includes(role);
      const incident = await db.oneOrNone(
        'SELECT incident_id, reporter_id FROM incidents WHERE incident_id = $1',
        [incidentId]
      );

      if (!incident) {
        socket.emit('error', { message: 'Incident not found' });
        return;
      }

      if (!isStaff && incident.reporter_id !== userId) {
        socket.emit('error', { message: 'Access denied to this incident' });
        return;
      }

      const publicRoom = `incident_${incidentId}`;
      socket.join(publicRoom);
      logger.info(`User ${userId} joined room ${publicRoom}`);

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

function startBackgroundSchedulers(isDatabaseAvailable) {
  if (!isDatabaseAvailable) {
    logger.warn('Database-backed background schedulers skipped because the database is unavailable');
    return;
  }

  startWeeklyDigestScheduler();
  startConstellationMaintenance();
}

async function startServer() {
  let isDatabaseAvailable = true;

  try {
    await db.verifyDatabaseConnection();
    logger.info('Database connection successful');
  } catch (error) {
    isDatabaseAvailable = false;
    logger.warn(`Database connection unavailable at startup: ${db.formatDatabaseError(error)}`);
  }

  server.listen(PORT, () => {
    startBackgroundSchedulers(isDatabaseAvailable);
    logger.info(`SafeSignal Backend running on http://localhost:${PORT}`);
    logger.info(`API Docs: http://localhost:${PORT}/api/docs`);
    logger.info(`Health Check: http://localhost:${PORT}/api/health`);
  });
}

startServer();
