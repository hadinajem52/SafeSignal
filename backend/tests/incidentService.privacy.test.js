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

  it('strips reporter identity for public incident reads', async () => {
    db.oneOrNone.mockResolvedValue(incidentRow());

    const incident = await incidentService.getPublicIncidentById(10);

    expect(incident.username).toBeNull();
    expect(incident.email).toBeNull();
    expect(incident.reporter_id).toBeNull();
  });

  it('marks is_owner true for the reporter without exposing reporter identity', async () => {
    db.oneOrNone.mockResolvedValue(incidentRow());

    const incident = await incidentService.getPublicIncidentById(10, 7);

    expect(incident.is_owner).toBe(true);
    expect(incident.reporter_id).toBeNull();
  });

  it('marks is_owner false for a non-reporter viewer', async () => {
    db.oneOrNone.mockResolvedValue(incidentRow());

    const incident = await incidentService.getPublicIncidentById(10, 999);

    expect(incident.is_owner).toBe(false);
  });

  it('marks is_owner false when there is no authenticated viewer', async () => {
    db.oneOrNone.mockResolvedValue(incidentRow());

    const incident = await incidentService.getPublicIncidentById(10);

    expect(incident.is_owner).toBe(false);
  });

  it('includes username and email for staff incident reads', async () => {
    db.oneOrNone.mockResolvedValue(incidentRow());

    const incident = await incidentService.getStaffIncidentById(10);

    expect(incident.username).toBe('reporter');
    expect(incident.email).toBe('reporter@example.com');
  });

  it('redacts media from disclosed closed public incidents unless media disclosure is enabled', async () => {
    db.oneOrNone.mockResolvedValue(incidentRow({
      status: 'police_closed',
      is_disclosed: true,
      is_media_disclosed: false,
      photo_urls: ['evidence.jpg'],
      video_url: 'evidence.mp4',
    }));

    const incident = await incidentService.getPublicIncidentById(10);

    expect(incident.photo_urls).toEqual([]);
    expect(incident.video_url).toBeNull();
  });

  it('keeps media on disclosed closed public incidents when media disclosure is enabled', async () => {
    db.oneOrNone.mockResolvedValue(incidentRow({
      status: 'police_closed',
      is_disclosed: true,
      is_media_disclosed: true,
      photo_urls: ['evidence.jpg'],
      video_url: 'evidence.mp4',
    }));

    const incident = await incidentService.getPublicIncidentById(10);

    expect(incident.photo_urls).toEqual(['evidence.jpg']);
    expect(incident.video_url).toBe('evidence.mp4');
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

  it('strips reporter identity from public incident lists', async () => {
    db.manyOrNone.mockResolvedValue([incidentRow()]);

    const incidents = await incidentService.getAllIncidents({ userRole: null });

    expect(incidents[0]).not.toHaveProperty('username');
    expect(incidents[0]).not.toHaveProperty('email');
    expect(incidents[0]).not.toHaveProperty('reporter_id');
  });

  it('keeps reporter identity in staff incident lists', async () => {
    db.manyOrNone.mockResolvedValue([incidentRow()]);

    const incidents = await incidentService.getAllIncidents({ userRole: 'moderator' });

    expect(incidents[0].username).toBe('reporter');
    expect(incidents[0].email).toBe('reporter@example.com');
    expect(incidents[0].reporter_id).toBe(7);
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
    db.manyOrNone.mockResolvedValueOnce([]); // actions
    db.manyOrNone.mockResolvedValueOnce([]); // linked duplicates

    const detail = await incidentService.getLEIIncidentById(10);

    expect(detail.incident.constellation).toMatchObject({
      constellationId: 3,
      status: 'active',
      centerLatitude: 12.345678,
      centerLongitude: -98.765432,
    });
    expect(detail.linkedDuplicates).toEqual([]);
    expect(detail.incident.constellation).not.toHaveProperty('clusterLinks');
  });

  it('returns linked duplicates with dedup candidates for parent reports', async () => {
    const generatedAt = new Date('2026-01-01T01:00:00Z');
    const linkedAt = new Date('2026-01-01T01:30:00Z');

    db.oneOrNone
      .mockResolvedValueOnce({ incident_id: 10 })
      .mockResolvedValueOnce({
        report_id: 20,
        confidence: '0.82',
        created_at: generatedAt,
        dedup_candidates: {
          generatedAt,
          radiusMeters: 500,
          timeHours: 1,
          candidates: [{ incidentId: 11, score: 0.91 }],
        },
      });
    db.manyOrNone.mockResolvedValueOnce([
      {
        incident_id: 12,
        report_id: 22,
        title: 'Duplicate report',
        description: 'Same incident from another reporter',
        category: 'theft',
        severity: 'medium',
        status: 'merged',
        username: 'second-reporter',
        location_name: 'Main St',
        latitude: '12.34',
        longitude: '56.78',
        incident_date: generatedAt,
        created_at: generatedAt,
        linked_at: linkedAt,
        linked_depth: 1,
        photo_urls: ['evidence.jpg'],
        video_url: null,
      },
    ]);

    const dedup = await incidentService.getIncidentDedupCandidates(10);

    expect(dedup).toMatchObject({
      reportId: 20,
      confidence: 0.82,
      dedupCandidates: {
        candidates: [{ incidentId: 11, score: 0.91 }],
      },
      linkedDuplicates: [
        {
          incidentId: 12,
          reportId: 22,
          title: 'Duplicate report',
          status: 'merged',
          reporter: 'second-reporter',
          latitude: 12.34,
          longitude: 56.78,
          linkedAt,
          photoUrls: ['evidence.jpg'],
          videoUrl: null,
        },
      ],
    });
    expect(db.manyOrNone.mock.calls[0][0]).toContain('report_links');
  });
});
