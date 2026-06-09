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
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const db = require('../src/config/database');
const incidentService = require('../src/services/incidentService');

describe('incident constellation trigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not auto-open a constellation when an incident is created', async () => {
    const incident = {
      incident_id: 10,
      reporter_id: 7,
      title: 'Suspicious activity',
      description: 'Someone is checking car doors nearby',
      category: 'suspicious_activity',
      latitude: 12.34,
      longitude: -98.76,
      location_name: 'Near park',
      incident_date: new Date(),
      severity: 'medium',
      is_anonymous: false,
      is_draft: false,
      photo_urls: null,
      status: 'submitted',
    };

    db.oneOrNone.mockResolvedValue({ is_suspended: false });
    db.one.mockResolvedValueOnce(incident).mockResolvedValueOnce({ report_id: 55 });
    db.manyOrNone.mockResolvedValue([]);
    db.none.mockResolvedValue();

    const result = await incidentService.createIncident(
      {
        title: incident.title,
        description: incident.description,
        category: incident.category,
        latitude: incident.latitude,
        longitude: incident.longitude,
        locationName: incident.location_name,
        incidentDate: incident.incident_date,
        severity: incident.severity,
        enableMlClassification: false,
        enableMlRisk: false,
      },
      7
    );

    expect(result).toMatchObject({ incident_id: 10, status: 'submitted' });
    await new Promise(process.nextTick);

    // Constellations are now activated manually by a moderator, never on report
    // creation: no incident_constellations write should occur here.
    const executedSql = [
      ...db.one.mock.calls,
      ...db.none.mock.calls,
      ...db.oneOrNone.mock.calls,
      ...db.manyOrNone.mock.calls,
    ].map(([sql]) => String(sql));
    expect(executedSql.some((sql) => /incident_constellations/i.test(sql))).toBe(false);
  });
});
