jest.mock('../src/config/database', () => ({
  manyOrNone: jest.fn(),
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
  constellation_opens_at: new Date('2025-12-31T22:00:00Z'),
  constellation_expires_at: new Date('2026-01-01T00:00:00Z'),
  constellation_confidence_state: 'single_report',
  constellation_confidence_score: 0,
  constellation_summary: 'summary',
  constellation_supporting_signals: 2,
  constellation_contradicting_signals: 1,
  constellation_ongoing_assessment: 'unknown',
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

  it('does not join constellations for public incident lists', async () => {
    db.manyOrNone.mockResolvedValue([incidentRow()]);

    const incidents = await incidentService.getAllIncidents({
      includeConstellation: true,
      userRole: null,
    });

    expect(db.manyOrNone.mock.calls[0][0]).not.toContain('incident_constellations');
    expect(incidents[0].constellation).toBeUndefined();
  });

  it('includes only aggregate constellation fields for staff incident lists', async () => {
    db.manyOrNone.mockResolvedValue([incidentRow()]);

    const incidents = await incidentService.getAllIncidents({
      includeConstellation: true,
      userRole: 'moderator',
    });

    expect(db.manyOrNone.mock.calls[0][0]).toContain('incident_constellations');
    expect(incidents[0].constellation).toMatchObject({
      constellationId: 3,
      status: 'active',
      confidenceState: 'single_report',
      confidenceScore: 0,
      supportingSignals: 2,
      contradictingSignals: 1,
      ongoingAssessment: 'unknown',
      summary: 'summary',
      radiusMeters: 500,
      centerLatitude: 12.345678,
      centerLongitude: -98.765432,
    });
    expect(incidents[0].constellation).not.toHaveProperty('reporterId');
    expect(incidents[0].constellation).not.toHaveProperty('note');
    expect(incidents[0].constellation).not.toHaveProperty('witnessUserId');
  });

  it('includes aggregate constellation fields in LE list and detail payloads', async () => {
    db.manyOrNone.mockResolvedValueOnce([incidentRow()]);

    const list = await incidentService.getLEIIncidents();

    expect(list[0].constellation).toMatchObject({
      constellationId: 3,
      supportingSignals: 2,
      contradictingSignals: 1,
    });

    db.oneOrNone.mockResolvedValueOnce(incidentRow());
    db.manyOrNone.mockResolvedValueOnce([]);

    const detail = await incidentService.getLEIIncidentById(10);

    expect(detail.incident.constellation).toMatchObject({
      constellationId: 3,
      status: 'active',
      centerLatitude: 12.345678,
      centerLongitude: -98.765432,
    });
    expect(detail.incident.constellation).not.toHaveProperty('clusterLinks');
  });
});
