jest.mock('../src/config/database', () => ({
  manyOrNone: jest.fn(),
  result: jest.fn(),
}));

jest.mock('../src/services/constellationSynthesis', () => ({
  triggerSynthesis: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const db = require('../src/config/database');
const constellationSynthesis = require('../src/services/constellationSynthesis');
const maintenance = require('../src/jobs/constellationMaintenance');

describe('constellationMaintenance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks active constellations expired after their expiry time', async () => {
    db.result.mockResolvedValue({ rowCount: 2 });

    await expect(maintenance.markExpiredConstellations()).resolves.toBe(2);

    expect(db.result).toHaveBeenCalledWith(expect.stringContaining("status = 'expired'"));
    expect(db.result.mock.calls[0][0]).toContain("WHERE status = 'active'");
    expect(db.result.mock.calls[0][0]).toContain('expires_at <= NOW()');
  });

  it('synthesizes at most 100 active unexpired constellations with pending changes', async () => {
    db.manyOrNone.mockResolvedValue([
      { constellation_id: 11 },
      { constellation_id: 12 },
    ]);
    constellationSynthesis.triggerSynthesis.mockResolvedValue();

    await expect(maintenance.runPendingConstellationSynthesis()).resolves.toEqual({
      scanned: 2,
      synthesized: 2,
      failed: 0,
    });

    expect(db.manyOrNone).toHaveBeenCalledWith(expect.stringContaining('has_unprocessed_changes = TRUE'), [100]);
    expect(db.manyOrNone.mock.calls[0][0]).toContain("status = 'active'");
    expect(db.manyOrNone.mock.calls[0][0]).toContain('expires_at > NOW()');
    expect(constellationSynthesis.triggerSynthesis).toHaveBeenCalledWith(11);
    expect(constellationSynthesis.triggerSynthesis).toHaveBeenCalledWith(12);
  });

  it('continues pending synthesis after one row fails', async () => {
    db.manyOrNone.mockResolvedValue([
      { constellation_id: 11 },
      { constellation_id: 12 },
    ]);
    constellationSynthesis.triggerSynthesis
      .mockRejectedValueOnce(new Error('ML unavailable'))
      .mockResolvedValueOnce();

    await expect(maintenance.runPendingConstellationSynthesis()).resolves.toEqual({
      scanned: 2,
      synthesized: 1,
      failed: 1,
    });

    expect(constellationSynthesis.triggerSynthesis).toHaveBeenCalledTimes(2);
  });

  it('clears user coordinates after 30 days without revoking consent', async () => {
    db.result.mockResolvedValue({ rowCount: 3 });

    await expect(maintenance.clearStaleUserLocations()).resolves.toBe(3);

    expect(db.result).toHaveBeenCalledWith(expect.stringContaining('last_known_latitude = NULL'));
    expect(db.result.mock.calls[0][0]).toContain('last_known_longitude = NULL');
    expect(db.result.mock.calls[0][0]).toContain('location_updated_at = NULL');
    expect(db.result.mock.calls[0][0]).toContain("NOW() - INTERVAL '30 days'");
    expect(db.result.mock.calls[0][0]).not.toContain('location_consent = FALSE');
  });
});
