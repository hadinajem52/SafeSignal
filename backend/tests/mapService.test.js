jest.mock('../src/config/database', () => ({
  any: jest.fn(),
}));

const db = require('../src/config/database');
const mapService = require('../src/services/mapService');

describe('mapService constellation aggregates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('omits constellation data unless explicitly requested', async () => {
    db.any.mockResolvedValue([
      {
        incident_id: 9,
        category: 'safety',
        latitude: '12.34567',
        longitude: '98.76543',
        incident_date: new Date('2026-01-01T00:00:00Z'),
      },
    ]);

    const result = await mapService.getMapIncidents({ timeframe: '24h' });

    expect(result.incidents[0].constellation).toBeUndefined();
    expect(db.any.mock.calls[0][0]).not.toContain('incident_constellations');
  });

  it('returns only public confidence aggregates when requested', async () => {
    db.any.mockResolvedValue([
      {
        incident_id: 9,
        category: 'safety',
        latitude: '12.34567',
        longitude: '98.76543',
        incident_date: new Date('2026-01-01T00:00:00Z'),
        constellation_confidence_state: 'corroborated',
        constellation_confidence_score: '0.750',
        constellation_supporting_signals: 3,
        summary: 'must not leak',
        reporter_id: 7,
      },
    ]);

    const result = await mapService.getMapIncidents({
      timeframe: '24h',
      include_constellation: true,
    });

    expect(result.incidents[0]).toEqual({
      id: 9,
      category: 'safety',
      location: { latitude: 12.346, longitude: 98.765 },
      timestamp: new Date('2026-01-01T00:00:00Z'),
      constellation: {
        confidenceState: 'corroborated',
        confidenceScore: 0.75,
        supportingSignals: 3,
      },
    });
    expect(result.incidents[0].summary).toBeUndefined();
    expect(result.incidents[0].reporter_id).toBeUndefined();
  });

  it('joins only active unexpired non-flagged constellations', async () => {
    db.any.mockResolvedValue([]);

    await mapService.getMapIncidents({ timeframe: '24h', include_constellation: true });

    const query = db.any.mock.calls[0][0];
    expect(query).toContain("c.status = 'active'");
    expect(query).toContain("c.status != 'flagged'");
    expect(query).toContain('c.expires_at > NOW()');
  });
});
