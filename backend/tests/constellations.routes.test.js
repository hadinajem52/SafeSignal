const express = require('express');
const request = require('supertest');
const ServiceError = require('../src/utils/ServiceError');

jest.mock('../src/middleware/auth', () => (req, res, next) => {
  if (req.headers.authorization !== 'Bearer valid') {
    return res.status(401).json({ status: 'ERROR', message: 'Access token required' });
  }
  req.user = { userId: 8, role: req.headers['x-test-role'] || 'citizen' };
  return next();
});

jest.mock('../src/services/constellationService', () => ({
  VALID_SIGNAL_TYPES: new Set([
    'saw_something',
    'heard_something',
    'nothing_unusual',
    'not_sure',
    'already_left',
  ]),
  getConstellationForUser: jest.fn(),
  submitCorroboration: jest.fn(),
}));

const constellationService = require('../src/services/constellationService');
const constellationsRouter = require('../src/routes/constellations');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/constellations', constellationsRouter);
  return app;
};

describe('constellation routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it('returns 401 for unauthenticated constellation reads', async () => {
    const response = await request(app).get('/api/constellations/3');

    expect(response.status).toBe(401);
  });

  it('returns 404 for unauthorized constellation reads', async () => {
    constellationService.getConstellationForUser.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/constellations/3')
      .set('Authorization', 'Bearer valid');

    expect(response.status).toBe(404);
  });

  it('returns reporter-readable constellation payloads', async () => {
    constellationService.getConstellationForUser.mockResolvedValue({
      constellationId: 3,
      status: 'active',
      centerLatitude: 12.35,
      centerLongitude: -98.77,
    });

    const response = await request(app)
      .get('/api/constellations/3')
      .set('Authorization', 'Bearer valid');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ constellationId: 3, centerLatitude: 12.35 });
  });

  it('returns 401 for unauthenticated corroborations', async () => {
    const response = await request(app)
      .post('/api/constellations/3/corroborate')
      .send({ signalType: 'heard_something' });

    expect(response.status).toBe(401);
  });

  it('returns 404 for missing corroboration targets', async () => {
    constellationService.submitCorroboration.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/constellations/3/corroborate')
      .set('Authorization', 'Bearer valid')
      .send({ signalType: 'heard_something' });

    expect(response.status).toBe(404);
  });

  it('returns 409 for flagged corroboration attempts', async () => {
    constellationService.submitCorroboration.mockRejectedValue(
      ServiceError.conflict('Constellation is under review')
    );

    const response = await request(app)
      .post('/api/constellations/3/corroborate')
      .set('Authorization', 'Bearer valid')
      .send({ signalType: 'heard_something' });

    expect(response.status).toBe(409);
  });

  it('returns only the created corroboration id', async () => {
    constellationService.submitCorroboration.mockResolvedValue({ corroboration_id: 22 });

    const response = await request(app)
      .post('/api/constellations/3/corroborate')
      .set('Authorization', 'Bearer valid')
      .send({ signalType: 'heard_something', note: 'safe note' });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({ corroboration_id: 22 });
  });
});
