jest.mock('../src/services/incidentService');
jest.mock('../src/services/commentService');
jest.mock('../src/middleware/auth', () =>
  jest.fn((req, _res, next) => {
    req.user = { userId: 1, role: 'user' };
    next();
  })
);
jest.mock('../src/middleware/optionalAuth', () => jest.fn((_req, _res, next) => next()));
jest.mock('../src/middleware/roles', () => jest.fn(() => (_req, _res, next) => next()));
jest.mock('../src/middleware/incidentUpload', () => {
  const mw = (_req, _res, next) => next();
  // incidentUpload is used both directly as middleware and via .fields()/.single() etc.
  const upload = (_req, _res, next) => next();
  upload.fields = () => mw;
  upload.single = () => mw;
  upload.array = () => mw;
  upload.any = () => mw;
  upload.none = () => mw;
  return {
    UPLOAD_ROOT: 'C:/tmp/uploads',
    cleanupUploadedFiles: mw,
    incidentUpload: upload,
  };
});

const request = require('supertest');
const express = require('express');
const incidentService = require('../src/services/incidentService');
const incidentsRouter = require('../src/routes/incidents');

const buildApp = () => {
  const app = express();
  app.use('/api/incidents', incidentsRouter);
  return app;
};

describe('GET /api/incidents/feed timeframe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    incidentService.getPublicFeed.mockResolvedValue({ incidents: [], total: 0 });
  });

  it('passes a valid timeframe through to the service', async () => {
    await request(buildApp()).get('/api/incidents/feed?timeframe=30d').expect(200);

    expect(incidentService.getPublicFeed).toHaveBeenCalledWith(
      expect.objectContaining({ timeframe: '30d' })
    );
  });

  it('rejects an invalid timeframe with 400 and never calls the service', async () => {
    const res = await request(buildApp()).get('/api/incidents/feed?timeframe=bogus');

    expect(res.status).toBe(400);
    expect(incidentService.getPublicFeed).not.toHaveBeenCalled();
  });

  it('omits timeframe (full history) when none is provided', async () => {
    await request(buildApp()).get('/api/incidents/feed').expect(200);

    const args = incidentService.getPublicFeed.mock.calls[0][0];
    expect(args.timeframe).toBeUndefined();
  });
});
