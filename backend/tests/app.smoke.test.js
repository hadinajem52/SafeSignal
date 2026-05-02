const request = require('supertest');

const app = require('../src/app');

describe('app smoke test', () => {
  it('responds on the health route without starting a listener', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
    expect(response.body.timestamp).toBeDefined();
  });
});
