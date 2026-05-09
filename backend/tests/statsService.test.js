jest.mock('../src/config/database', () => ({
  manyOrNone: jest.fn(),
  one: jest.fn(),
  oneOrNone: jest.fn(),
}));

const db = require('../src/config/database');
const statsService = require('../src/services/statsService');

describe('statsService witness prompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns no pending prompts when the user has no shareable location', async () => {
    db.oneOrNone.mockResolvedValue(null);

    await expect(statsService.getNearbyConstellationsForUser(8)).resolves.toEqual({
      count: 0,
      constellation_id: null,
      center_latitude: null,
      center_longitude: null,
    });

    expect(db.one).not.toHaveBeenCalled();
  });

  it('returns the full pending prompt count and newest prompt metadata', async () => {
    db.oneOrNone.mockResolvedValue({
      last_known_latitude: 12.34,
      last_known_longitude: -98.76,
    });
    db.one.mockResolvedValue({
      count: 12,
      constellation_id: 45,
      center_latitude: 12.345678,
      center_longitude: -98.765432,
    });

    await expect(statsService.getNearbyConstellationsForUser(8)).resolves.toEqual({
      count: 12,
      constellation_id: 45,
      center_latitude: 12.345678,
      center_longitude: -98.765432,
    });

    expect(db.one.mock.calls[0][0]).toContain('(SELECT COUNT(*) FROM eligible)::int AS count');
    expect(db.one.mock.calls[0][0]).not.toContain('LIMIT 5');
  });
});

describe('statsService DAC analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns aggregate DAC metrics without requiring raw incident rows', async () => {
    db.one
      .mockResolvedValueOnce({
        total_incidents: 879,
        closed_count: 120,
        avg_response: 42,
        actioned_count: 200,
        sla_compliant: 150,
        avg_time_to_close: 1.25,
        p25: 10,
        p50: 20,
        p75: 60,
        p90: 120,
        hist_0: 5,
        hist_1: 10,
        hist_2: 20,
        hist_3: 30,
        hist_4: 40,
        hist_5: 50,
        hist_6: 45,
      })
      .mockResolvedValueOnce({
        total_incidents: 400,
        actioned_count: 100,
        sla_compliant: 80,
        top_category: 'utility',
      });
    db.manyOrNone
      .mockResolvedValueOnce([
        { idx: 28, count: 300 },
        { idx: 29, count: 579 },
      ])
      .mockResolvedValueOnce([{ dow: 0, hour: 9, count: 12 }])
      .mockResolvedValueOnce([
        { status: 'submitted', count: 20 },
        { status: 'verified', count: 80 },
        { status: 'resolved', count: 120 },
      ])
      .mockResolvedValueOnce([
        { category: 'utility', idx: 0, count: 30 },
        { category: 'utility', idx: 1, count: 40 },
      ])
      .mockResolvedValueOnce([{ name: 'Unknown', count: 879 }])
      .mockResolvedValueOnce([
        { reporter_id: 7, name: 'reporter', total: 10, valid: 8 },
      ])
      .mockResolvedValueOnce([{ category: 'utility', count: 879 }])
      .mockResolvedValueOnce([{ category: 'utility', count: 400 }])
      .mockResolvedValueOnce([{ name: 'Unknown', count: 879 }]);

    const analytics = await statsService.getDacAnalytics('30d');

    expect(analytics.incidentsCount).toBe(879);
    expect(analytics.kpis).toMatchObject({
      avgResponse: 42,
      actionedCount: 200,
      slaRate: 75,
      slaCompliant: 150,
      slaBreached: 50,
      closedCount: 120,
    });
    expect(analytics.histogramData).toHaveLength(7);
    expect(analytics.trendTotal).toBe(879);
    expect(analytics.heatPeak).toMatchObject({
      peakDayLabel: 'Mon',
      peakHour: 9,
      peakCount: 12,
    });
    expect(analytics.hotspots[0]).toMatchObject({ name: 'Unknown', count: 879, pct: 100 });
    expect(analytics.reporterStats[0]).toMatchObject({ name: 'reporter', total: 10, valid: 8, pct: 80 });
    expect(analytics.insightsPayload).toMatchObject({
      total_incidents: 879,
      trend_direction: 'rising',
      prev_period: {
        total_incidents: 400,
        sla_rate: 80,
        top_category: 'utility',
      },
    });
    expect(analytics.incidents).toBeUndefined();
  });
});
