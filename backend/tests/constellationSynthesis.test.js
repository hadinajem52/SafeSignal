jest.mock('../src/config/database', () => ({
  oneOrNone: jest.fn(),
  manyOrNone: jest.fn(),
  none: jest.fn(),
}));

jest.mock('../src/utils/mlClient', () => ({
  synthesizeConstellation: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const db = require('../src/config/database');
const mlClient = require('../src/utils/mlClient');
const synthesis = require('../src/services/constellationSynthesis');

const signal = (signal_type, overrides = {}) => ({
  signal_type,
  note: null,
  note_flagged_pii: false,
  submitted_at: new Date('2026-01-01T00:00:00Z'),
  device_latitude_rounded: null,
  device_longitude_rounded: null,
  ...overrides,
});

const constellation = (overrides = {}) => ({
  constellation_id: 3,
  incident_id: 10,
  status: 'active',
  center_latitude: 12.345678,
  center_longitude: -98.765432,
  opens_at: new Date('2026-01-01T00:00:00Z'),
  expires_at: new Date('2026-01-01T02:00:00Z'),
  confidence_state: 'single_report',
  confidence_score: 0.2,
  category: 'suspicious_activity',
  severity: 'medium',
  incident_date: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const validMlState = (overrides = {}) => ({
  confidenceState: 'corroborated',
  confidenceScore: 0.8,
  summary: 'Multiple witnesses reported similar activity.',
  supportingSignals: 3,
  contradictingSignals: 0,
  ongoingAssessment: 'ongoing',
  anomalyFlagged: false,
  clusterMatchIncidentIds: [],
  ...overrides,
});

describe('computeFallbackState', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:30:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns single_report for zero corroborations', () => {
    expect(synthesis.computeFallbackState([], constellation())).toMatchObject({
      confidenceState: 'single_report',
      confidenceScore: 0,
    });
  });

  it('returns corroborated for strong supporting signals', () => {
    const result = synthesis.computeFallbackState([
      signal('saw_something'),
      signal('heard_something'),
      signal('saw_something'),
    ], constellation());

    expect(result).toMatchObject({
      confidenceState: 'corroborated',
      confidenceScore: 1,
      supportingSignals: 3,
    });
  });

  it('checks likely_ended before generic mixed_signals', () => {
    const result = synthesis.computeFallbackState([
      signal('already_left'),
      signal('already_left'),
      signal('already_left'),
      signal('saw_something'),
      signal('heard_something'),
    ], constellation());

    expect(result.confidenceState).toBe('likely_ended');
  });

  it('checks activity_not_confirmed before generic mixed_signals', () => {
    const result = synthesis.computeFallbackState([
      signal('nothing_unusual'),
      signal('nothing_unusual'),
      signal('nothing_unusual'),
      signal('saw_something'),
      signal('heard_something'),
    ], constellation());

    expect(result.confidenceState).toBe('activity_not_confirmed');
  });

  it('returns mixed_signals when contradiction ratio is high', () => {
    const result = synthesis.computeFallbackState([
      signal('saw_something'),
      signal('saw_something'),
      signal('nothing_unusual'),
      signal('already_left'),
      signal('not_sure'),
    ], constellation());

    expect(result.confidenceState).toBe('mixed_signals');
  });
});

describe('triggerSynthesis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('excludes flagged note content from the ML payload and falls back on invalid ML', async () => {
    const corroborations = [
      signal('heard_something', { note: 'safe observation' }),
      signal('saw_something', { note: 'secret@example.com', note_flagged_pii: true }),
      signal('saw_something'),
    ];
    db.oneOrNone.mockResolvedValue(constellation());
    db.manyOrNone.mockResolvedValueOnce(corroborations).mockResolvedValueOnce([]);
    db.none.mockResolvedValue();
    mlClient.synthesizeConstellation.mockImplementation(async (payload) => {
      expect(payload.corroborations[0].note).toBe('safe observation');
      expect(payload.corroborations[1].note).toBeNull();
      return { confidenceState: 'invalid', confidenceScore: 0.9 };
    });

    const result = await synthesis.triggerSynthesis(3);

    expect(result.source).toBe('fallback');
    expect(db.none.mock.calls[0][1][2]).toBe('corroborated');
  });

  it('persists successful ML output', async () => {
    db.oneOrNone.mockResolvedValue(constellation());
    db.manyOrNone.mockResolvedValueOnce([signal('saw_something')]).mockResolvedValueOnce([]);
    db.none.mockResolvedValue();
    mlClient.synthesizeConstellation.mockResolvedValue(validMlState());

    const result = await synthesis.triggerSynthesis(3);

    expect(result.source).toBe('ml');
    expect(db.none.mock.calls[0][1]).toEqual(expect.arrayContaining([
      3,
      'active',
      'corroborated',
      0.8,
      'Multiple witnesses reported similar activity.',
    ]));
  });

  it('sets flagged status and freezes score on backend velocity cap', async () => {
    const baseTime = new Date('2026-01-01T00:00:00Z').getTime();
    const corroborations = Array.from({ length: 5 }, (_, index) => signal('saw_something', {
      submitted_at: new Date(baseTime + index * 10000),
      device_latitude_rounded: 12.34,
      device_longitude_rounded: -98.76,
    }));
    db.oneOrNone.mockResolvedValue(constellation({ confidence_score: 0.2 }));
    db.manyOrNone.mockResolvedValueOnce(corroborations).mockResolvedValueOnce([]);
    db.none.mockResolvedValue();
    mlClient.synthesizeConstellation.mockResolvedValue(validMlState({ confidenceScore: 0.9 }));

    const result = await synthesis.triggerSynthesis(3);

    expect(result.status).toBe('flagged');
    expect(result.confidenceScore).toBe(0.2);
    expect(db.none.mock.calls[0][1][1]).toBe('flagged');
    expect(db.none.mock.calls[0][1][3]).toBe(0.2);
  });

  it('persists backend-derived cluster links using canonical order', async () => {
    db.oneOrNone.mockResolvedValue(constellation({ constellation_id: 5 }));
    db.manyOrNone.mockResolvedValueOnce([]).mockResolvedValueOnce([{ constellation_id: 2 }]);
    db.none.mockResolvedValue();
    mlClient.synthesizeConstellation.mockResolvedValue(null);

    await synthesis.triggerSynthesis(5);

    expect(db.none.mock.calls[1][1]).toEqual([2, 5]);
  });
});
