jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('../src/config/database', () => ({
  one: jest.fn(),
  oneOrNone: jest.fn(),
  none: jest.fn(),
}));

jest.mock('../src/utils/socketService', () => ({
  emitToRoles: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const db = require('../src/config/database');
const authService = require('../src/services/authService');

describe('authService profile and password settings flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the current user profile', async () => {
    db.oneOrNone
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        user_id: 7,
        username: 'updated_user',
        email: 'updated@example.com',
        role: 'moderator',
        is_verified: true,
        created_at: new Date('2026-01-01T00:00:00Z'),
      });

    const user = await authService.updateCurrentUserProfile(7, {
      username: ' updated_user ',
      email: ' Updated@Example.com ',
    });

    expect(db.oneOrNone).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE users'),
      [7, 'updated_user', 'updated@example.com']
    );
    expect(user).toMatchObject({
      userId: 7,
      username: 'updated_user',
      email: 'updated@example.com',
      role: 'moderator',
      isVerified: true,
    });
  });

  it('rejects duplicate profile values found before update', async () => {
    db.oneOrNone.mockResolvedValueOnce({ user_id: 9 });

    await expect(
      authService.updateCurrentUserProfile(7, {
        username: 'taken',
        email: 'taken@example.com',
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('translates concurrent profile unique violations to conflict', async () => {
    db.oneOrNone
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce({ code: '23505' });

    await expect(
      authService.updateCurrentUserProfile(7, {
        username: 'taken',
        email: 'taken@example.com',
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('changes the current user password when the current password matches', async () => {
    db.oneOrNone.mockResolvedValue({ user_id: 7, password_hash: 'old-hash' });
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('new-hash');
    db.none.mockResolvedValue();

    await authService.changeCurrentUserPassword(7, 'old-password', 'new-password');

    expect(bcrypt.compare).toHaveBeenCalledWith('old-password', 'old-hash');
    expect(db.none).toHaveBeenCalledWith(expect.stringContaining('password_hash = $2'), [
      7,
      'new-hash',
    ]);
  });

  it('rejects wrong current password without using auth-expiry status', async () => {
    db.oneOrNone.mockResolvedValue({ user_id: 7, password_hash: 'old-hash' });
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      authService.changeCurrentUserPassword(7, 'wrong-password', 'new-password')
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
    expect(db.none).not.toHaveBeenCalled();
  });
});
