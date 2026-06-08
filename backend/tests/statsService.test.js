jest.mock('../src/config/database', () => ({
  manyOrNone: jest.fn(),
  one: jest.fn(),
  oneOrNone: jest.fn(),
}));

jest.mock('../src/utils/mlClient', () => ({
  generateAreaInsights: jest.fn(),
}));

const db = require('../src/config/database');
const mlClient = require('../src/utils/mlClient');
const statsService = require('../src/services/statsService');

describe('statsService safety score', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('labels empty incident data as limited data instead of proven safety', () => {
    const score = statsService.calculateSafetyScore([], {
      radius: 1,
      now: '2026-06-08T00:00:00.000Z',
    });

    expect(score).toMatchObject({
      score: 100,
      label: 'Limited Data',
      confidence: 'low',
      incidentCount: 0,
      radiusKm: 1,
      windowDays: 30,
    });
    expect(score.description).toContain('not a safety guarantee');
  });

  it('makes repeated nearby critical incidents worse than one critical incident', () => {
    const now = '2026-06-08T00:00:00.000Z';
    const criticalIncident = {
      severity: 'critical',
      status: 'verified',
      created_at: now,
      distance_km: 0,
    };

    const oneIncident = statsService.calculateSafetyScore([criticalIncident], { now });
    const twoIncidents = statsService.calculateSafetyScore(
      [criticalIncident, criticalIncident],
      { now }
    );

    expect(oneIncident.score).toBeGreaterThan(twoIncidents.score);
    expect(twoIncidents).toMatchObject({
      score: 27,
      label: 'High Activity',
      confidence: 'moderate',
      incidentCount: 2,
    });
  });

  it('damps low-count samples toward the baseline via confidence shrinkage', () => {
    const now = '2026-06-08T00:00:00.000Z';
    const criticalIncident = {
      severity: 'critical',
      status: 'verified',
      created_at: now,
      distance_km: 0,
    };

    // A single fresh critical incident carries 55 raw risk, but with only one
    // report it is weighted at 1/3, so the score stays well above the un-shrunk
    // 45 it would otherwise produce.
    const one = statsService.calculateSafetyScore([criticalIncident], { now });
    expect(one).toMatchObject({ score: 82, confidence: 'moderate', incidentCount: 1 });

    // Three corroborating reports are trusted at full weight and saturate the gauge.
    const three = statsService.calculateSafetyScore(
      [criticalIncident, criticalIncident, criticalIncident],
      { now }
    );
    expect(three).toMatchObject({ score: 0, confidence: 'high', incidentCount: 3 });
  });

  it('filters area safety inputs to recent eligible incidents', async () => {
    db.manyOrNone.mockResolvedValue([
      {
        incident_id: 1,
        category: 'theft',
        severity: 'medium',
        status: 'verified',
        created_at: '2026-06-08T00:00:00.000Z',
        distance_km: 0.2,
      },
    ]);

    const result = await statsService.getAreaSafetyStats(33.8938, 35.5018, 1);

    expect(result.safetyScoreDetails).toMatchObject({
      incidentCount: 1,
      radiusKm: 1,
      windowDays: 30,
    });
    expect(db.manyOrNone.mock.calls[0][0]).toContain('i.status = ANY');
    expect(db.manyOrNone.mock.calls[0][0]).toContain('i.created_at >= NOW()');
    expect(db.manyOrNone.mock.calls[0][1]).toEqual([
      35.5018,
      33.8938,
      1,
      expect.arrayContaining(['verified', 'resolved', 'police_closed']),
      30,
    ]);
  });

  it('rejects invalid area safety coordinates', async () => {
    await expect(statsService.getAreaSafetyStats(999, 35.5018, 1)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });

    expect(db.manyOrNone).not.toHaveBeenCalled();
  });
});

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

  it('does not manufacture response or close durations without lifecycle timestamps', async () => {
    db.one
      .mockResolvedValueOnce({
        total_incidents: 10,
        closed_count: 4,
        response_sample_count: 0,
        close_duration_count: 0,
        avg_response: null,
        actioned_count: 0,
        sla_compliant: 0,
        avg_time_to_close: null,
        p25: 0,
        p50: 0,
        p75: 0,
        p90: 0,
        hist_0: 0,
        hist_1: 0,
        hist_2: 0,
        hist_3: 0,
        hist_4: 0,
        hist_5: 0,
        hist_6: 0,
      })
      .mockResolvedValueOnce({
        total_incidents: 0,
        actioned_count: 0,
        sla_compliant: 0,
        top_category: null,
      });
    db.manyOrNone
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const analytics = await statsService.getDacAnalytics('30d');

    expect(analytics.kpis.avgResponse).toBeNull();
    expect(analytics.kpis.avgTimeToClose).toBeNull();
    expect(analytics.kpis.responseSampleCount).toBe(0);
    expect(analytics.kpis.closeDurationCount).toBe(0);
    expect(analytics.percentiles[0]).toMatchObject({ label: 'P25', val: '—', unit: '' });
    expect(db.one.mock.calls[0][0]).toContain('first_action_at - created_at');
    expect(db.one.mock.calls[0][0]).toContain('closed_at - created_at');
    expect(db.one.mock.calls[0][0]).not.toContain('updated_at - created_at');
  });
});

describe('statsService area insights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const recentRows = () => [
    { category: 'theft', severity: 'high', status: 'verified', created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), hour: 20, distance_km: 0.2 },
    { category: 'theft', severity: 'medium', status: 'verified', created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(), hour: 22, distance_km: 0.5 },
    { category: 'vandalism', severity: 'low', status: 'resolved', created_at: new Date(Date.now() - 50 * 3600 * 1000).toISOString(), hour: 14, distance_km: 0.8 },
  ];

  it('aggregates nearby incidents into an anonymous, counts-only payload', () => {
    const agg = statsService.buildAreaAggregate(recentRows(), 1, { latitude: 33.8938, longitude: 35.5018 });

    expect(agg).toMatchObject({
      radius_km: 1,
      window_days: 7,
      total: 3,
      active: 2,
      resolved: 1,
      dominant_category: 'theft',
      severities: { critical: 0, high: 1, medium: 1, low: 1 },
    });
    expect(agg.categories[0]).toEqual(['theft', 2]);
    // Counts only — no report text, timestamps, or per-incident coordinates leak out.
    expect(JSON.stringify(agg)).not.toContain('created_at');
  });

  it('returns a deterministic all-clear WITHOUT calling Gemini when nothing is nearby', async () => {
    db.manyOrNone.mockResolvedValue([]);
    db.one.mockResolvedValue({ count: 0 });

    const result = await statsService.getAreaInsights(33.8938, 35.5018);

    expect(result).toMatchObject({ level: 'calm', source: 'fallback', headline: 'All quiet nearby' });
    expect(result.stats.total).toBe(0);
    expect(mlClient.generateAreaInsights).not.toHaveBeenCalled();
  });

  it('returns the AI insight and caches it so repeat loads skip Gemini', async () => {
    db.manyOrNone.mockResolvedValue(recentRows());
    db.one.mockResolvedValue({ count: 1 });
    mlClient.generateAreaInsights.mockResolvedValue({
      supported: true,
      insight: {
        headline: 'Evening thefts nearby',
        summary: '2 thefts reported within 1 km this week.',
        tip: 'Keep bags zipped and phones away on evening walks here.',
        level: 'caution',
      },
    });

    const first = await statsService.getAreaInsights(34.01, 35.21);
    const second = await statsService.getAreaInsights(34.01, 35.21);

    expect(first).toMatchObject({ source: 'ai', headline: 'Evening thefts nearby', level: 'caution' });
    expect(first.stats).toMatchObject({ total: 3, dominantCategory: 'theft' });
    expect(second).toEqual(first);
    // Second identical request served from cache — only one Gemini generation.
    expect(mlClient.generateAreaInsights).toHaveBeenCalledTimes(1);
  });

  it('falls back to a tailored deterministic insight when the AI service is unavailable', async () => {
    db.manyOrNone.mockResolvedValue(recentRows());
    db.one.mockResolvedValue({ count: 0 });
    mlClient.generateAreaInsights.mockResolvedValue(null);

    const result = await statsService.getAreaInsights(35.55, 36.66);

    expect(result.source).toBe('fallback');
    expect(result.stats.total).toBe(3);
    expect(result.headline).toBeTruthy();
    expect(['calm', 'caution', 'elevated']).toContain(result.level);
  });
});
