jest.mock('../src/config/database', () => ({
  oneOrNone: jest.fn(),
}));

jest.mock('../src/utils/socketService', () => ({ emitToRoles: jest.fn() }));
jest.mock('../src/services/settingsService', () => ({}));
jest.mock('../src/services/notificationService', () => ({}));
jest.mock('../src/utils/mlClient', () => ({}));

const db = require('../src/config/database');
const incidentService = require('../src/services/incidentService');

const incidentRow = (overrides = {}) => ({
  incident_id: 10,
  reporter_id: 7,
  title: 'Suspicious activity',
  description: 'Someone near the alley',
  username: 'reporter',
  email: 'reporter@example.com',
  constellation_constellation_id: 3,
  constellation_status: 'active',
  constellation_center_latitude: 12.345678,
  constellation_center_longitude: -98.765432,
  constellation_radius_meters: 500,
  constellation_expires_at: new Date('2026-01-01T00:00:00Z'),
  constellation_confidence_state: 'single_report',
  constellation_confidence_score: 0,
  constellation_summary: 'summary',
  ...overrides,
});

describe('incident detail privacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('strips username and email for public incident reads', async () => {
    db.oneOrNone.mockResolvedValue(incidentRow());

    const incident = await incidentService.getPublicIncidentById(10);

    expect(incident.username).toBeNull();
    expect(incident.email).toBeNull();
  });

  it('includes username and email for staff incident reads', async () => {
    db.oneOrNone.mockResolvedValue(incidentRow());

    const incident = await incidentService.getStaffIncidentById(10);

    expect(incident.username).toBe('reporter');
    expect(incident.email).toBe('reporter@example.com');
  });

  it('strips confidence and summary from flagged public constellation detail', async () => {
    db.oneOrNone.mockResolvedValue(incidentRow({ constellation_status: 'flagged' }));

    const incident = await incidentService.getPublicIncidentById(10);

    expect(incident.constellation).toEqual({
      constellationId: 3,
      status: 'flagged',
      expiresAt: new Date('2026-01-01T00:00:00Z'),
    });
  });
});
