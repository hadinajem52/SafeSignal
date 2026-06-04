jest.mock('../src/config/database', () => ({
  manyOrNone: jest.fn(),
  one: jest.fn(),
  oneOrNone: jest.fn(),
  none: jest.fn(),
  result: jest.fn(),
}));

jest.mock('../src/utils/fcmClient', () => ({
  sendFcmTestNotification: jest.fn(),
}));

const db = require('../src/config/database');
const fcmClient = require('../src/utils/fcmClient');
const userService = require('../src/services/userService');

describe('userService privacy fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores a push token only after location consent is granted', async () => {
    db.oneOrNone.mockResolvedValue({ location_consent: true });
    db.none.mockResolvedValue();

    await userService.updatePushToken(7, '  device-token  ');

    expect(db.none).toHaveBeenCalledWith(expect.stringContaining('push_token = $2'), [7, 'device-token']);
  });

  it('rejects push token storage without location consent', async () => {
    db.oneOrNone.mockResolvedValue({ location_consent: false });

    await expect(userService.updatePushToken(7, 'device-token')).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(db.none).not.toHaveBeenCalled();
  });

  it('rejects empty push tokens', async () => {
    await expect(userService.updatePushToken(7, '   ')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(db.oneOrNone).not.toHaveBeenCalled();
  });

  it('clears stored push tokens', async () => {
    db.result.mockResolvedValue({ rowCount: 1 });

    await userService.clearPushToken(7);

    expect(db.result).toHaveBeenCalledWith(expect.stringContaining('push_token = NULL'), [7]);
    expect(db.result.mock.calls[0][0]).toContain('push_token_updated_at = NULL');
  });

  it('sends FCM test notifications to the stored token', async () => {
    db.oneOrNone.mockResolvedValue({ push_token: 'device-token' });
    fcmClient.sendFcmTestNotification.mockResolvedValue({ sent: true, skipped: false });

    await expect(userService.sendFcmTestNotification(7)).resolves.toEqual({ sent: true });

    expect(fcmClient.sendFcmTestNotification).toHaveBeenCalledWith('device-token');
  });

  it('rejects FCM test notifications when no token is registered', async () => {
    db.oneOrNone.mockResolvedValue({ push_token: null });

    await expect(userService.sendFcmTestNotification(7)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(fcmClient.sendFcmTestNotification).not.toHaveBeenCalled();
  });

  it('stores rounded 2-decimal coordinates when consent exists', async () => {
    db.oneOrNone.mockResolvedValue({ location_consent: true });
    db.none.mockResolvedValue();

    await userService.updateUserLocation(7, 12.3456, -98.7654);

    expect(db.none).toHaveBeenCalledWith(expect.stringContaining('last_known_latitude = $2'), [
      7,
      12.35,
      -98.77,
    ]);
  });

  it('rejects location updates without consent', async () => {
    db.oneOrNone.mockResolvedValue({ location_consent: false });

    await expect(userService.updateUserLocation(7, 12.34, -98.76)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(db.none).not.toHaveBeenCalled();
  });

  it('rejects invalid coordinates', async () => {
    await expect(userService.updateUserLocation(7, 91, -98.76)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(db.oneOrNone).not.toHaveBeenCalled();
  });

  it('revokes consent and clears stored coordinates', async () => {
    db.result.mockResolvedValue({ rowCount: 1 });

    await userService.setLocationConsent(7, false);

    expect(db.result).toHaveBeenCalledWith(
      expect.stringContaining('last_known_latitude = NULL'),
      [7]
    );
    expect(db.result.mock.calls[0][0]).toContain('last_known_longitude = NULL');
    expect(db.result.mock.calls[0][0]).toContain('location_updated_at = NULL');
    expect(db.result.mock.calls[0][0]).toContain('push_token = NULL');
    expect(db.result.mock.calls[0][0]).toContain('push_token_updated_at = NULL');
  });

  it('does not expose token or location columns from single-user responses', async () => {
    db.oneOrNone.mockResolvedValue({
      user_id: 7,
      username: 'Casey',
      email: 'casey@example.com',
      role: 'citizen',
      is_suspended: false,
      is_verified: true,
      created_at: new Date('2026-01-01T00:00:00Z'),
      total_reports: 1,
      verified_reports: 0,
      rejected_reports: 0,
      push_token: 'secret-token',
      last_known_latitude: 12.34,
      last_known_longitude: -98.76,
      location_consent: true,
    });

    const user = await userService.getUserById(7);

    expect(user).not.toHaveProperty('push_token');
    expect(user).not.toHaveProperty('pushToken');
    expect(user).not.toHaveProperty('last_known_latitude');
    expect(user).not.toHaveProperty('lastKnownLatitude');
    expect(user).not.toHaveProperty('location_consent');
    expect(user).not.toHaveProperty('locationConsent');
  });

  it('marks unverified staff users as pending instead of active', async () => {
    db.oneOrNone.mockResolvedValue({
      user_id: 8,
      username: 'Pending LE',
      email: 'pending@example.com',
      role: 'law_enforcement',
      is_suspended: false,
      is_verified: false,
      created_at: new Date('2026-01-02T00:00:00Z'),
      total_reports: 0,
      verified_reports: 0,
      rejected_reports: 0,
    });

    const user = await userService.getUserById(8);

    expect(user.status).toBe('pending');
    expect(user.isVerified).toBe(false);
  });
});
