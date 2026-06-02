jest.mock('../src/config/database', () => ({
  oneOrNone: jest.fn(),
}));

jest.mock('../src/middleware/optionalAuth', () => (req, _res, next) => {
  req.user = req.testUser || null;
  next();
});

jest.mock('../src/middleware/incidentUpload', () => ({
  UPLOAD_ROOT: 'C:/tmp/uploads',
}));

const request = require('supertest');
const express = require('express');
const db = require('../src/config/database');
const uploadsRoutes = require('../src/routes/uploads');

function createApp() {
  const app = express();
  app.use('/uploads', uploadsRoutes);
  app.use((error, _req, res, _next) => {
    res.status(error.statusCode || 500).json({ message: error.message });
  });
  return app;
}

describe('upload media privacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks public access to disclosed feed media when media disclosure is off', async () => {
    db.oneOrNone.mockResolvedValue({
      incident_id: 12,
      reporter_id: 7,
      status: 'police_closed',
      is_disclosed: true,
      is_media_disclosed: false,
      closure_outcome: 'resolved_handled',
    });

    const response = await request(createApp()).get('/uploads/incidents/evidence.jpg');

    expect(response.status).toBe(403);
  });

  it('allows public access to disclosed feed media when media disclosure is on', async () => {
    db.oneOrNone.mockResolvedValue({
      incident_id: 12,
      reporter_id: 7,
      status: 'police_closed',
      is_disclosed: true,
      is_media_disclosed: true,
      closure_outcome: 'resolved_handled',
    });

    const app = createApp();
    const sendFile = jest
      .spyOn(app.response, 'sendFile')
      .mockImplementation(function sendFileMock() {
        return this.status(200).send('file');
      });

    const response = await request(app).get('/uploads/incidents/evidence.jpg');

    expect(response.status).toBe(200);
    expect(sendFile).toHaveBeenCalled();
    sendFile.mockRestore();
  });
});
