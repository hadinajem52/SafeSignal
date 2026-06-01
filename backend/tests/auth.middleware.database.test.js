const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  oneOrNone: jest.fn(),
  isConnectionError: jest.fn((error) => error?.code === 'ETIMEDOUT'),
}));

const db = require('../src/config/database');
const authenticateToken = require('../src/middleware/auth');

function createResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('auth middleware database errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns database unavailable when token validation cannot reach PostgreSQL', async () => {
    const token = jwt.sign(
      { userId: 42, email: 'admin@safesignal.com', role: 'admin' },
      process.env.JWT_SECRET || 'safesignal-jwt-secret-change-in-production'
    );
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res = createResponse();
    const next = jest.fn();

    db.oneOrNone.mockRejectedValue(Object.assign(new Error('connect ETIMEDOUT 127.0.0.1:5432'), {
      code: 'ETIMEDOUT',
    }));

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      status: 'ERROR',
      message: 'Database is unavailable. Please try again later.',
      code: 'DATABASE_UNAVAILABLE',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
