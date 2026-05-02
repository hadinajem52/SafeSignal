const express = require('express');
const request = require('supertest');
const ServiceError = require('../src/utils/ServiceError');

jest.mock('../src/middleware/auth', () => (req, res, next) => {
  req.user = { userId: 42, role: 'citizen' };
  next();
});

jest.mock('../src/middleware/roles', () => () => (req, res, next) => next());

jest.mock('../src/services/userService', () => ({
  getAllUsers: jest.fn(),
  getUserById: jest.fn(),
  updateUserSuspension: jest.fn(),
  updateUserRole: jest.fn(),
  updatePushToken: jest.fn(),
  setLocationConsent: jest.fn(),
  updateUserLocation: jest.fn(),
}));

const userService = require('../src/services/userService');
const usersRouter = require('../src/routes/users');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  return app;
};

describe('users privacy routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  it('updates push token through /me without returning sensitive data', async () => {
    userService.updatePushToken.mockResolvedValue();

    const response = await request(app)
      .patch('/api/users/me/push-token')
      .send({ token: 'device-token' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'OK' });
    expect(userService.updatePushToken).toHaveBeenCalledWith(42, 'device-token');
  });

  it('updates location consent through /me before dynamic id routes', async () => {
    userService.setLocationConsent.mockResolvedValue();

    const response = await request(app)
      .patch('/api/users/me/location-consent')
      .send({ consent: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'OK' });
    expect(userService.setLocationConsent).toHaveBeenCalledWith(42, true);
  });

  it('updates location through /me without returning coordinates', async () => {
    userService.updateUserLocation.mockResolvedValue();

    const response = await request(app)
      .patch('/api/users/me/location')
      .send({ latitude: 12.3456, longitude: -98.7654 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'OK' });
    expect(userService.updateUserLocation).toHaveBeenCalledWith(42, 12.3456, -98.7654);
  });

  it('maps service validation errors to API errors', async () => {
    userService.updatePushToken.mockRejectedValue(ServiceError.forbidden('Location consent is required before storing a push token'));

    const response = await request(app)
      .patch('/api/users/me/push-token')
      .send({ token: 'device-token' });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      status: 'ERROR',
      code: 'FORBIDDEN',
    });
  });
});
