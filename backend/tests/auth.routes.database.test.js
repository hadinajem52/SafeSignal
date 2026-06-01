const express = require('express');
const request = require('supertest');

jest.mock('../src/services/authService', () => ({
  login: jest.fn(),
  register: jest.fn(),
  googleLogin: jest.fn(),
  getCurrentUser: jest.fn(),
}));

const authService = require('../src/services/authService');
const authRouter = require('../src/routes/auth');

function databaseConnectionError() {
  const error = new AggregateError([
    Object.assign(new Error('connect ETIMEDOUT 127.0.0.1:5432'), {
      code: 'ETIMEDOUT',
    }),
  ]);
  error.code = 'ETIMEDOUT';
  return error;
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

describe('auth routes database errors', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('returns a database unavailable response when login cannot reach PostgreSQL', async () => {
    authService.login.mockRejectedValue(databaseConnectionError());

    const response = await request(buildApp())
      .post('/api/auth/login')
      .send({
        email: 'admin@safesignal.com',
        password: 'password123',
      });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'ERROR',
      message: 'Database is unavailable. Please try again later.',
      code: 'DATABASE_UNAVAILABLE',
    });
  });
});
