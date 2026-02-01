const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const incidentsRoutes = require('./routes/incidents');
const statsRoutes = require('./routes/stats');
const usersRoutes = require('./routes/users');
const mapRoutes = require('./routes/map');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    status: 'ERROR',
    message: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 SafeSignal Backend running on http://localhost:${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health\n`);
});
