jest.mock('../src/config/database', () => ({
  manyOrNone: jest.fn(),
  one: jest.fn(),
}));

const db = require('../src/config/database');
const incidentService = require('../src/services/incidentService');

const RECENCY_CONDITION = 'COALESCE(i.closed_at, i.incident_date) >=';

describe('incidentService.getPublicFeed timeframe window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.manyOrNone.mockResolvedValue([]);
    db.one.mockResolvedValue({ total: '0' });
  });

  it('omits the recency filter when no timeframe is given (full history)', async () => {
    await incidentService.getPublicFeed({});

    const [rowsSql, rowsParams] = db.manyOrNone.mock.calls[0];
    const [countSql, countParams] = db.one.mock.calls[0];

    expect(rowsSql).not.toContain(RECENCY_CONDITION);
    expect(countSql).not.toContain(RECENCY_CONDITION);
    // Only the LIMIT/OFFSET bind params remain on the rows query.
    expect(rowsParams).toEqual([20, 0]);
    expect(countParams).toEqual([]);
  });

  it('ignores an unknown timeframe value (no recency filter applied)', async () => {
    await incidentService.getPublicFeed({ timeframe: 'bogus' });

    expect(db.manyOrNone.mock.calls[0][0]).not.toContain(RECENCY_CONDITION);
  });

  it('constrains both rows and total when a valid timeframe is given', async () => {
    db.manyOrNone.mockResolvedValue([{ incident_id: 1 }]);
    db.one.mockResolvedValue({ total: '5' });

    const result = await incidentService.getPublicFeed({ timeframe: '30d' });

    const [rowsSql, rowsParams] = db.manyOrNone.mock.calls[0];
    const [countSql, countParams] = db.one.mock.calls[0];

    // Both the data and the count query carry the same window condition.
    expect(rowsSql).toContain(RECENCY_CONDITION);
    expect(countSql).toContain(RECENCY_CONDITION);

    // The window start is a Date bound; rows query also appends LIMIT/OFFSET.
    expect(rowsParams[0]).toBeInstanceOf(Date);
    expect(rowsParams.slice(1)).toEqual([20, 0]);
    expect(countParams).toHaveLength(1);
    expect(countParams[0]).toBeInstanceOf(Date);

    // ~30 days back, allowing a little slack for clock/exec time.
    const daysBack = (Date.now() - rowsParams[0].getTime()) / (24 * 60 * 60 * 1000);
    expect(daysBack).toBeGreaterThan(29.9);
    expect(daysBack).toBeLessThan(30.1);

    expect(result).toEqual({ incidents: [{ incident_id: 1 }], total: 5 });
  });
});
