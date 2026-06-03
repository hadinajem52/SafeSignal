jest.mock('../src/config/database', () => ({
  manyOrNone: jest.fn(),
  one: jest.fn(),
  none: jest.fn(),
}));

jest.mock('../src/utils/socketService', () => ({
  emitToUser: jest.fn(),
}));

jest.mock('../src/services/settingsService', () => ({
  ensureSettingsStorage: jest.fn(),
  getSettingsForUser: jest.fn(),
}));

const { emitToUser } = require('../src/utils/socketService');
const notificationService = require('../src/services/notificationService');

describe('notificationService reporter updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['verified', 'Report #12 verified'],
    ['rejected', 'Report #12 rejected'],
    ['needs_info', 'Report #12 needs more information'],
    ['merged', 'Report #12 merged'],
    ['police_closed', 'Report #12 closed'],
  ])('notifies the reporter when a report becomes %s', async (nextStatus, notificationTitle) => {
    const result = await notificationService.notifyReporterIncidentEvent('incident:status_update', {
      incident_id: 12,
      reporter_id: 7,
      title: 'Broken streetlight',
      status: nextStatus,
    }, {
      previousStatus: 'submitted',
      nextStatus,
    });

    expect(result).toEqual({ sent: true, skipped: false });
    expect(emitToUser).toHaveBeenCalledWith(7, 'notification:report_update', expect.objectContaining({
      incidentId: 12,
      status: nextStatus,
      notificationTitle,
    }));
  });

  it('skips reporter notifications for non-actionable status updates', async () => {
    const result = await notificationService.notifyReporterIncidentEvent('incident:status_update', {
      incident_id: 12,
      reporter_id: 7,
      title: 'Broken streetlight',
      status: 'in_review',
    }, {
      previousStatus: 'submitted',
      nextStatus: 'in_review',
    });

    expect(result).toEqual({ sent: false, skipped: true });
    expect(emitToUser).not.toHaveBeenCalled();
  });

  it('skips reporter notifications when the status did not change', async () => {
    const result = await notificationService.notifyReporterIncidentEvent('incident:status_update', {
      incident_id: 12,
      reporter_id: 7,
      title: 'Broken streetlight',
      status: 'verified',
    }, {
      previousStatus: 'verified',
      nextStatus: 'verified',
    });

    expect(result).toEqual({ sent: false, skipped: true });
    expect(emitToUser).not.toHaveBeenCalled();
  });

  it('skips reporter notifications when the reporter made the change', async () => {
    const result = await notificationService.notifyReporterIncidentEvent('incident:status_update', {
      incident_id: 12,
      reporter_id: 7,
      title: 'Broken streetlight',
      status: 'verified',
    }, {
      actorUserId: 7,
      previousStatus: 'submitted',
      nextStatus: 'verified',
    });

    expect(result).toEqual({ sent: false, skipped: true });
    expect(emitToUser).not.toHaveBeenCalled();
  });
});
