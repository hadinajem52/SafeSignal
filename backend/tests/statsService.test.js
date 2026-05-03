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
