const express = require('express');
const request = require('supertest');

jest.mock('../src/services/mapService', () => ({
  getMapIncidents: jest.fn(),
}));

const mapService = require('../src/services/mapService');
const mapRouter = require('../src/routes/map');

const buildApp = () => {
  const app = express();
  app.use('/api/map', mapRouter);
  return app;
};

describe('map routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mapService.getMapIncidents.mockResolvedValue({ incidents: [], count: 0 });
  });

  it('passes include_constellation only when requested', async () => {
    const app = buildApp();

    await request(app).get('/api/map/incidents?include_constellation=true');

    expect(mapService.getMapIncidents).toHaveBeenCalledWith(
      expect.objectContaining({ include_constellation: true })
    );
  });

  it('leaves constellation aggregates disabled by default', async () => {
    const app = buildApp();

    await request(app).get('/api/map/incidents');

    expect(mapService.getMapIncidents).toHaveBeenCalledWith(
      expect.objectContaining({ include_constellation: false })
    );
  });
});
