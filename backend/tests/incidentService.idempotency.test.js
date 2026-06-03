jest.mock('../src/config/database', () => ({
  one: jest.fn(),
  oneOrNone: jest.fn(),
  manyOrNone: jest.fn(),
  none: jest.fn(),
}));

jest.mock('../src/utils/socketService', () => ({ emitToRoles: jest.fn() }));
jest.mock('../src/services/settingsService', () => ({}));
jest.mock('../src/services/notificationService', () => ({
  notifyReporterIncidentEvent: jest.fn().mockResolvedValue(),
  notifyStaffIncidentEvent: jest.fn().mockResolvedValue(),
}));
jest.mock('../src/utils/mlClient', () => ({}));
jest.mock('../src/services/constellationService', () => ({
  openConstellationForIncident: jest.fn(),
}));
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const db = require('../src/config/database');
const incidentService = require('../src/services/incidentService');

const incidentData = {
  title: 'Suspicious activity',
  description: 'Someone is checking car doors nearby',
  category: 'suspicious_activity',
  latitude: 12.34,
  longitude: -98.76,
  locationName: 'Near park',
  incidentDate: new Date('2026-05-28T12:00:00Z'),
  severity: 'medium',
  isAnonymous: false,
  photoUrls: null,
  videoUrl: null,
  enableMlClassification: false,
  enableMlRisk: false,
};

describe('incident creation idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the existing incident when the idempotency key and payload match', async () => {
    let insertedPayloadHash;
    const existingIncident = {
      incident_id: 10,
      reporter_id: 7,
      ...incidentData,
      is_draft: false,
      status: 'submitted',
    };

    db.oneOrNone.mockImplementation((query, params) => {
      if (query.includes('SELECT is_suspended')) {
        return Promise.resolve({ is_suspended: false });
      }

      if (query.includes('INSERT INTO incidents')) {
        insertedPayloadHash = params[15];
        return Promise.resolve(null);
      }

      return Promise.resolve({
        ...existingIncident,
        idempotency_payload_hash: insertedPayloadHash,
      });
    });

    const result = await incidentService.createIncident(incidentData, 7, {
      idempotencyKey: 'incident-key-1',
    });

    expect(result).toMatchObject({ incident_id: 10, status: 'submitted' });
    expect(db.one).not.toHaveBeenCalled();
    expect(db.oneOrNone).toHaveBeenCalledTimes(3);
  });

  it('rejects idempotency key reuse with a different payload', async () => {
    db.oneOrNone.mockImplementation((query) => {
      if (query.includes('SELECT is_suspended')) {
        return Promise.resolve({ is_suspended: false });
      }

      if (query.includes('INSERT INTO incidents')) {
        return Promise.resolve(null);
      }

      return Promise.resolve({
        incident_id: 10,
        idempotency_payload_hash: 'different-payload-hash',
      });
    });

    await expect(
      incidentService.createIncident(incidentData, 7, {
        idempotencyKey: 'incident-key-1',
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });
});
