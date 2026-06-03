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
const constellationService = require('../src/services/constellationService');
const incidentService = require('../src/services/incidentService');

describe('incident constellation trigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the incident even when async constellation creation fails', async () => {
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
    constellationService.openConstellationForIncident.mockRejectedValue(new Error('boom'));

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
    expect(constellationService.openConstellationForIncident).toHaveBeenCalledWith(result, 7);
  });
});
