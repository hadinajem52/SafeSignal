jest.mock('../src/config/database', () => ({
  manyOrNone: jest.fn(),
  one: jest.fn(),
  oneOrNone: jest.fn(),
  none: jest.fn(),
}));

jest.mock('../src/utils/mlClient', () => ({
  detectToxicity: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../src/services/constellationSynthesis', () => ({
  triggerSynthesis: jest.fn().mockResolvedValue(),
}));

jest.mock('../src/utils/fcmClient', () => ({
  sendWitnessPromptNotification: jest.fn().mockResolvedValue({ sent: true, skipped: false }),
}));

const db = require('../src/config/database');
const mlClient = require('../src/utils/mlClient');
const constellationSynthesis = require('../src/services/constellationSynthesis');
const fcmClient = require('../src/utils/fcmClient');
const constellationService = require('../src/services/constellationService');

const freshIncident = () => ({
  incident_id: 10,
  reporter_id: 7,
  is_draft: false,
  latitude: 12.345678,
  longitude: -98.765432,
  incident_date: new Date().toISOString(),
  status: 'submitted',
});

const activeConstellation = (overrides = {}) => ({
  constellation_id: 3,
  incident_id: 10,
  reporter_id: 7,
  status: 'active',
  center_latitude: 12.345678,
  center_longitude: -98.765432,
  radius_meters: 500,
  opens_at: new Date(),
  expires_at: new Date(Date.now() + 60 * 60 * 1000),
  confidence_state: 'single_report',
  confidence_score: 0,
  summary: 'safe summary',
  supporting_signals: 0,
  contradicting_signals: 0,
  ongoing_assessment: 'unknown',
  has_unprocessed_changes: false,
  ...overrides,
});

describe('constellationService eligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts a fresh safe incident', async () => {
    db.oneOrNone.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    db.one.mockResolvedValue({ count: 0 });

    await expect(constellationService.evaluateEligibility(freshIncident(), 7)).resolves.toEqual({
      eligible: true,
      reason: null,
    });
  });

  it('rejects drafts', async () => {
    await expect(
      constellationService.evaluateEligibility({ ...freshIncident(), is_draft: true }, 7)
    ).resolves.toMatchObject({ eligible: false, reason: 'draft_incident' });
    expect(db.oneOrNone).not.toHaveBeenCalled();
  });

  it('rejects auto-flagged incidents before any DB lookup', async () => {
    await expect(
      constellationService.evaluateEligibility({ ...freshIncident(), status: 'auto_flagged' })
    ).resolves.toMatchObject({ eligible: false, reason: 'toxic_or_abusive' });
    expect(db.oneOrNone).not.toHaveBeenCalled();
  });

  it('rejects closed or rejected incidents', async () => {
    await expect(
      constellationService.evaluateEligibility({ ...freshIncident(), status: 'police_closed' })
    ).resolves.toMatchObject({ eligible: false, reason: 'incident_not_actionable' });
    expect(db.oneOrNone).not.toHaveBeenCalled();
  });

  it('rejects duplicate active constellations', async () => {
    db.oneOrNone.mockResolvedValueOnce(null).mockResolvedValueOnce({ constellation_id: 3 });

    await expect(constellationService.evaluateEligibility(freshIncident())).resolves.toMatchObject({
      eligible: false,
      reason: 'active_constellation_exists',
    });
  });
});

describe('constellationService manual activation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const staleIncidentRow = (overrides = {}) => ({
    incident_id: 10,
    reporter_id: 7,
    is_draft: false,
    status: 'submitted',
    latitude: 12.345678,
    longitude: -98.765432,
    // 6 hours old — would fail the automatic freshness window, allowed for manual.
    incident_date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  });

  it('activates a constellation for a stale report when a moderator triggers it', async () => {
    db.oneOrNone
      .mockResolvedValueOnce(staleIncidentRow()) // load incident
      .mockResolvedValueOnce(null) // toxicity check
      .mockResolvedValueOnce(null); // no active constellation
    db.one.mockResolvedValue(activeConstellation());
    db.none.mockResolvedValue();
    db.manyOrNone.mockResolvedValue([]); // no nearby targets to notify

    const result = await constellationService.activateConstellationForIncident(10, 99);

    expect(db.one).toHaveBeenCalled();
    expect(result).toMatchObject({
      constellationId: 3,
      status: 'active',
      confidenceState: 'single_report',
    });
  });

  it('returns 404 when the incident does not exist', async () => {
    db.oneOrNone.mockResolvedValueOnce(null);

    await expect(
      constellationService.activateConstellationForIncident(404, 99)
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(db.one).not.toHaveBeenCalled();
  });

  it('rejects activation when an active constellation already exists', async () => {
    db.oneOrNone
      .mockResolvedValueOnce(staleIncidentRow()) // load incident
      .mockResolvedValueOnce(null) // toxicity check
      .mockResolvedValueOnce({ constellation_id: 3 }); // active exists

    await expect(
      constellationService.activateConstellationForIncident(10, 99)
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(db.one).not.toHaveBeenCalled();
  });
});

describe('constellationService reads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lets the reporter read a privacy-limited constellation', async () => {
    db.oneOrNone.mockResolvedValue(activeConstellation());

    const result = await constellationService.getConstellationForUser(3, 7, 'citizen');

    expect(result).toMatchObject({
      constellationId: 3,
      centerLatitude: 12.35,
      centerLongitude: -98.77,
    });
    expect(result).not.toHaveProperty('summary');
    expect(result).not.toHaveProperty('confidenceState');
  });

  it('lets an in-radius citizen read a privacy-limited constellation', async () => {
    db.oneOrNone.mockResolvedValueOnce(activeConstellation()).mockResolvedValueOnce({ exists: 1 });

    const result = await constellationService.getConstellationForUser(3, 8, 'citizen');

    expect(result).toMatchObject({ constellationId: 3, centerLatitude: 12.35 });
  });

  it('returns null for unauthorized citizens', async () => {
    db.oneOrNone.mockResolvedValueOnce(activeConstellation()).mockResolvedValueOnce(null);

    await expect(constellationService.getConstellationForUser(3, 8, 'citizen')).resolves.toBeNull();
  });

  it('returns stripped flagged payloads to authorized non-staff users', async () => {
    db.oneOrNone.mockResolvedValue(activeConstellation({ status: 'flagged' }));

    const result = await constellationService.getConstellationForUser(3, 7, 'citizen');

    expect(result).toEqual({
      constellationId: 3,
      incidentId: 10,
      status: 'flagged',
      expiresAt: expect.any(Date),
    });
  });
});

describe('constellationService notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('targets nearby consented users with coarse notification payload data', async () => {
    db.manyOrNone.mockResolvedValue([
      { user_id: 8, push_token: 'token_abc123456' },
      { user_id: 9, push_token: 'token_def123456' },
    ]);
    db.oneOrNone
      .mockResolvedValueOnce({ delivery_id: 41 })
      .mockResolvedValueOnce({ delivery_id: 42 });
    db.one.mockResolvedValue({ cooldown_count: 0, hourly_count: 0 });
    db.none.mockResolvedValue();

    const result = await constellationService.notifyNearbyUsers(activeConstellation());

    expect(result).toEqual({ sent: 2, suppressed: 0, skipped: 0, targetCount: 2 });
    expect(db.manyOrNone.mock.calls[0][0]).toContain('push_token IS NOT NULL');
    expect(db.manyOrNone.mock.calls[0][0]).toContain("push_token_updated_at > NOW() - INTERVAL '7 days'");
    expect(db.manyOrNone.mock.calls[0][0]).toContain('location_consent = TRUE');
    expect(db.manyOrNone.mock.calls[0][0]).toContain('u.is_suspended = FALSE');
    expect(db.oneOrNone.mock.calls[0][0]).toContain('ON CONFLICT (user_id, constellation_id) DO NOTHING');
    expect(db.one.mock.calls[0][0]).toContain('witness_prompt_deliveries');
    expect(fcmClient.sendWitnessPromptNotification).toHaveBeenCalledWith('token_abc123456', {
      constellationId: 3,
      coarseLatitude: 12.35,
      coarseLongitude: -98.77,
    });
  });

  it('logs skipped notification sends without throwing', async () => {
    db.manyOrNone.mockResolvedValue([{ user_id: 8, push_token: 'token_abc123456' }]);
    db.oneOrNone.mockResolvedValue({ delivery_id: 41 });
    db.one.mockResolvedValue({ cooldown_count: 0, hourly_count: 0 });
    db.none.mockResolvedValue();
    fcmClient.sendWitnessPromptNotification.mockResolvedValueOnce({ sent: false, skipped: true });

    await expect(constellationService.notifyNearbyUsers(activeConstellation())).resolves.toMatchObject({
      sent: 0,
      skipped: 1,
    });
  });

  it('suppresses witness pushes during the per-user cooldown', async () => {
    db.manyOrNone.mockResolvedValue([{ user_id: 8, push_token: 'token_abc123456' }]);
    db.oneOrNone.mockResolvedValue({ delivery_id: 41 });
    db.one.mockResolvedValue({ cooldown_count: 1, hourly_count: 1 });
    db.none.mockResolvedValue();

    await expect(constellationService.notifyNearbyUsers(activeConstellation())).resolves.toEqual({
      sent: 0,
      suppressed: 1,
      skipped: 0,
      targetCount: 1,
    });

    expect(fcmClient.sendWitnessPromptNotification).not.toHaveBeenCalled();
    expect(db.none).toHaveBeenCalledWith(expect.stringContaining('UPDATE witness_prompt_deliveries'), [
      41,
      'suppressed',
      'cooldown_rate_limited',
      null,
    ]);
  });

  it('does not resend the same constellation prompt to the same user', async () => {
    db.manyOrNone.mockResolvedValue([{ user_id: 8, push_token: 'token_abc123456' }]);
    db.oneOrNone.mockResolvedValue(null);

    await expect(constellationService.notifyNearbyUsers(activeConstellation())).resolves.toEqual({
      sent: 0,
      suppressed: 0,
      skipped: 1,
      targetCount: 1,
    });

    expect(db.one).not.toHaveBeenCalled();
    expect(fcmClient.sendWitnessPromptNotification).not.toHaveBeenCalled();
  });
});

describe('constellationService corroboration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mlClient.detectToxicity.mockResolvedValue({ isToxic: false, isSevere: false });
  });

  it('returns null for missing corroboration targets', async () => {
    db.oneOrNone.mockResolvedValue(null);

    await expect(
      constellationService.submitCorroboration(999, 8, { signalType: 'heard_something' })
    ).resolves.toBeNull();
  });

  it('rejects reporter corroborations', async () => {
    db.oneOrNone.mockResolvedValue(activeConstellation());

    await expect(
      constellationService.submitCorroboration(3, 7, { signalType: 'heard_something' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects flagged corroborations', async () => {
    db.oneOrNone.mockResolvedValue(activeConstellation({ status: 'flagged' }));

    await expect(
      constellationService.submitCorroboration(3, 8, { signalType: 'heard_something' })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects expired corroborations', async () => {
    db.oneOrNone.mockResolvedValue(activeConstellation({ expires_at: new Date(Date.now() - 1000) }));

    await expect(
      constellationService.submitCorroboration(3, 8, { signalType: 'heard_something' })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('maps duplicate corroborations to conflict', async () => {
    db.oneOrNone.mockResolvedValue(activeConstellation());
    db.one.mockResolvedValueOnce({ count: 0 }).mockRejectedValueOnce({ code: '23505' });

    await expect(
      constellationService.submitCorroboration(3, 8, { signalType: 'heard_something' })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('stores PII notes as flagged and returns only the corroboration id', async () => {
    db.oneOrNone.mockResolvedValue(activeConstellation());
    db.one.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ corroboration_id: 22 });
    db.none.mockResolvedValue();

    const result = await constellationService.submitCorroboration(3, 8, {
      signalType: 'heard_something',
      note: 'email me at witness@example.com',
      deviceLatitude: 12.34,
      deviceLongitude: -98.76,
    });

    expect(result).toEqual({ corroboration_id: 22 });
    expect(db.one.mock.calls[1][1][4]).toBe(true);
    expect(result).not.toHaveProperty('note');
  });

  it('schedules async synthesis after successful persistence', async () => {
    db.oneOrNone.mockResolvedValue(activeConstellation());
    db.one.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ corroboration_id: 24 });
    db.none.mockResolvedValue();

    await constellationService.submitCorroboration(3, 8, {
      signalType: 'heard_something',
    });

    expect(constellationSynthesis.triggerSynthesis).toHaveBeenCalledWith(3);
  });

  it('flags notes when toxicity checks fail but still stores the signal', async () => {
    mlClient.detectToxicity.mockResolvedValue(null);
    db.oneOrNone.mockResolvedValue(activeConstellation());
    db.one.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ corroboration_id: 23 });
    db.none.mockResolvedValue();

    const result = await constellationService.submitCorroboration(3, 8, {
      signalType: 'saw_something',
      note: 'unusual activity near the store',
    });

    expect(result).toEqual({ corroboration_id: 23 });
    expect(db.one.mock.calls[1][1][4]).toBe(true);
  });
});
