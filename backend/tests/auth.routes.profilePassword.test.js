const express = require('express');
const request = require('supertest');
const ServiceError = require('../src/utils/ServiceError');

jest.mock('../src/middleware/auth', () => jest.fn((req, res, next) => {
  req.user = { userId: 42, role: 'moderator' };
  next();
}));

jest.mock('../src/services/authService', () => ({
  login: jest.fn(),
  register: jest.fn(),
  googleLogin: jest.fn(),
  getCurrentUser: jest.fn(),
  updateCurrentUserProfile: jest.fn(),
  changeCurrentUserPassword: jest.fn(),
}));

const authenticateToken = require('../src/middleware/auth');
const authService = require('../src/services/authService');
const authRouter = require('../src/routes/auth');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

describe('auth profile and password routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { userId: 42, role: 'moderator' };
      next();
    });
  });

  it('updates the current user profile', async () => {
    authService.updateCurrentUserProfile.mockResolvedValue({
      userId: 42,
      username: 'updated_user',
      email: 'updated@example.com',
      role: 'moderator',
      isVerified: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const response = await request(buildApp())
      .patch('/api/auth/me')
      .send({
        username: 'updated_user',
        email: 'updated@example.com',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'OK',
      data: {
        user: {
          userId: 42,
          username: 'updated_user',
          email: 'updated@example.com',
        },
      },
    });
    expect(authService.updateCurrentUserProfile).toHaveBeenCalledWith(42, {
      username: 'updated_user',
      email: 'updated@example.com',
    });
  });

  it('rejects invalid profile payloads before the service call', async () => {
    const response = await request(buildApp())
      .patch('/api/auth/me')
      .send({
        username: 'ab',
        email: 'not-an-email',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: 'ERROR',
      message: 'Validation failed',
    });
    expect(authService.updateCurrentUserProfile).not.toHaveBeenCalled();
  });

  it('returns conflict for duplicate profile values', async () => {
    authService.updateCurrentUserProfile.mockRejectedValue(
      ServiceError.conflict('Username or email is already in use')
    );

    const response = await request(buildApp())
      .patch('/api/auth/me')
      .send({
        username: 'taken',
        email: 'taken@example.com',
      });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      status: 'ERROR',
      code: 'CONFLICT',
    });
  });

  it('changes the current user password', async () => {
    authService.changeCurrentUserPassword.mockResolvedValue();

    const response = await request(buildApp())
      .patch('/api/auth/me/password')
      .send({
        currentPassword: 'old-password',
        newPassword: 'new-password',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'OK',
      message: 'Password updated successfully',
    });
    expect(authService.changeCurrentUserPassword).toHaveBeenCalledWith(
      42,
      'old-password',
      'new-password'
    );
  });

  it('returns bad request for wrong current password', async () => {
    authService.changeCurrentUserPassword.mockRejectedValue(
      ServiceError.badRequest('Current password is incorrect')
    );

    const response = await request(buildApp())
      .patch('/api/auth/me/password')
      .send({
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: 'ERROR',
      code: 'BAD_REQUEST',
    });
  });

  it('requires authentication for profile updates', async () => {
    authenticateToken.mockImplementationOnce((_req, res) =>
      res.status(401).json({
        status: 'ERROR',
        message: 'Access token required',
      })
    );

    const response = await request(buildApp())
      .patch('/api/auth/me')
      .send({
        username: 'updated_user',
        email: 'updated@example.com',
      });

    expect(response.status).toBe(401);
    expect(authService.updateCurrentUserProfile).not.toHaveBeenCalled();
  });
});
