jest.mock('../src/config/database', () => ({
  one: jest.fn(),
  oneOrNone: jest.fn(),
  manyOrNone: jest.fn(),
  none: jest.fn(),
}));

jest.mock('../src/utils/socketService', () => ({ emitToRoles: jest.fn() }));
jest.mock('../src/services/settingsService', () => ({}));
jest.mock('../src/services/notificationService', () => ({
  notifyStaffIncidentEvent: jest.fn().mockResolvedValue(),
}));
jest.mock('../src/utils/mlClient', () => ({}));
jest.mock('../src/services/constellationService', () => ({}));
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const db = require('../src/config/database');
const incidentService = require('../src/services/incidentService');

describe('incident moderation state transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an already rejected incident without updating or logging', async () => {
    db.oneOrNone.mockResolvedValue({
      incident_id: 12,
      status: 'rejected',
    });

    await expect(
      incidentService.rejectIncident(12, { userId: 3, role: 'moderator' })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Cannot reject a report with status rejected',
    });

    expect(db.one).not.toHaveBeenCalled();
    expect(db.none).not.toHaveBeenCalled();
  });

  it('rejects a submitted incident and logs one moderation action', async () => {
    const incident = {
      incident_id: 12,
      status: 'submitted',
      severity: 'medium',
    };
    const updated = {
      ...incident,
      status: 'rejected',
      is_disclosed: false,
      is_location_fuzzed: false,
    };

    db.oneOrNone.mockResolvedValue(incident);
    db.one.mockResolvedValue(updated);
    db.none.mockResolvedValue();

    const result = await incidentService.rejectIncident(12, {
      userId: 3,
      role: 'moderator',
    });

    expect(result.status).toBe('rejected');
    expect(db.one).toHaveBeenCalledWith(expect.stringContaining("SET status = 'rejected'"), [12]);
    expect(db.none).toHaveBeenCalledTimes(1);
  });
});
