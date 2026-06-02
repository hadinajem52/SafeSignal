jest.mock('../src/config/database', () => ({
  one: jest.fn(),
  oneOrNone: jest.fn(),
  none: jest.fn(),
}));

jest.mock('../src/utils/mlClient', () => ({
  analyzeReportMedia: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const fs = require('fs');
const db = require('../src/config/database');
const mlClient = require('../src/utils/mlClient');
const mediaJudgmentService = require('../src/services/mediaJudgmentService');

const baseContext = {
  incident_id: 12,
  title: 'Car crash',
  description: 'Two cars collided near the north gate',
  category: 'traffic_incident',
  severity: 'high',
  photo_urls: [],
  video_url: null,
  report_id: 22,
  ml_id: 33,
  media_judgment_status: null,
  media_judgment: null,
  media_judgment_error: null,
  media_judgment_input_hash: null,
  media_judgment_generated_at: null,
};

function mockTerminalUpdate() {
  db.one.mockImplementation((_query, params) => Promise.resolve({
    media_judgment_status: params[1],
    media_judgment: params[2],
    media_judgment_error: params[3],
    media_judgment_generated_at: new Date('2026-05-30T10:00:00Z'),
  }));
}

describe('mediaJudgmentService', () => {
  let statSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    statSpy = jest.spyOn(fs, 'statSync').mockReturnValue({
      isFile: () => true,
      size: 1234,
    });
    db.none.mockResolvedValue();
    mockTerminalUpdate();
  });

  afterEach(() => {
    statSpy.mockRestore();
  });

  it('records skipped judgment when the report has no stored media', async () => {
    db.oneOrNone
      .mockResolvedValueOnce(baseContext)
      .mockResolvedValueOnce(null);

    const result = await mediaJudgmentService.analyzeIncidentMedia(12);

    expect(result.status).toBe('skipped');
    expect(result.judgment.overallVerdict).toBe('insufficient_media');
    expect(mlClient.analyzeReportMedia).not.toHaveBeenCalled();
  });

  it('records unsupported when the ML provider cannot analyze media', async () => {
    db.oneOrNone
      .mockResolvedValueOnce({
        ...baseContext,
        photo_urls: ['/uploads/incidents/evidence.jpg'],
      })
      .mockResolvedValueOnce(null);
    mlClient.analyzeReportMedia.mockResolvedValue({
      supported: false,
      status: 'unsupported',
      error: 'Current ML provider does not support media analysis',
    });

    const result = await mediaJudgmentService.analyzeIncidentMedia(12);

    expect(result.status).toBe('unsupported');
    expect(result.error).toBe('Current ML provider does not support media analysis');
  });

  it('records completed judgment without updating incident moderation status', async () => {
    const judgment = {
      overallVerdict: 'supports_report',
      validityRecommendation: 'likely_valid',
      confidence: 0.86,
    };
    db.oneOrNone
      .mockResolvedValueOnce({
        ...baseContext,
        photo_urls: ['/uploads/incidents/evidence.jpg'],
      })
      .mockResolvedValueOnce(null);
    mlClient.analyzeReportMedia.mockResolvedValue({
      supported: true,
      status: 'completed',
      judgment,
    });

    const result = await mediaJudgmentService.analyzeIncidentMedia(12);

    expect(result.status).toBe('completed');
    expect(result.judgment).toBe(judgment);
    const queries = [
      ...db.none.mock.calls.map(([query]) => query),
      ...db.one.mock.calls.map(([query]) => query),
    ].join('\n');
    expect(queries).not.toMatch(/UPDATE incidents/i);
  });

  it('sends canonical duplicate media when the opened report is marked as duplicate', async () => {
    const judgment = {
      overallVerdict: 'supports_report',
      validityRecommendation: 'likely_valid',
      confidence: 0.86,
    };
    db.oneOrNone
      .mockResolvedValueOnce({
        ...baseContext,
        photo_urls: ['/uploads/incidents/current.jpg'],
      })
      .mockResolvedValueOnce({
        incident_id: 8,
        title: 'Original crash',
        description: 'Original report of the north gate crash',
        category: 'traffic_incident',
        severity: 'high',
        photo_urls: ['/uploads/incidents/original.jpg'],
        video_url: '/uploads/incidents/original.mp4',
        comparison_role: 'canonical_original',
      });
    mlClient.analyzeReportMedia.mockResolvedValue({
      supported: true,
      status: 'completed',
      judgment,
    });

    const result = await mediaJudgmentService.analyzeIncidentMedia(12);

    const payload = mlClient.analyzeReportMedia.mock.calls[0][0];
    expect(result.status).toBe('completed');
    expect(payload.metadata.duplicate).toMatchObject({
      relationship: 'canonical_original',
      report: {
        incidentId: 8,
        title: 'Original crash',
      },
    });
    expect(payload.metadata.duplicate.media).toHaveLength(2);
    expect(payload.mediaFiles.map((file) => file.role)).toEqual([
      'report',
      'canonical_original',
      'canonical_original',
    ]);
  });

  it('sends linked duplicate media when the opened report is canonical', async () => {
    const judgment = {
      overallVerdict: 'supports_report',
      validityRecommendation: 'needs_review',
      confidence: 0.64,
    };
    db.oneOrNone
      .mockResolvedValueOnce({
        ...baseContext,
        photo_urls: ['/uploads/incidents/canonical.jpg'],
      })
      .mockResolvedValueOnce({
        incident_id: 15,
        title: 'Duplicate crash',
        description: 'Second report of the north gate crash',
        category: 'traffic_incident',
        severity: 'high',
        photo_urls: ['/uploads/incidents/duplicate.jpg'],
        video_url: null,
        comparison_role: 'linked_duplicate',
      });
    mlClient.analyzeReportMedia.mockResolvedValue({
      supported: true,
      status: 'completed',
      judgment,
    });

    const result = await mediaJudgmentService.analyzeIncidentMedia(12);

    const payload = mlClient.analyzeReportMedia.mock.calls[0][0];
    expect(result.status).toBe('completed');
    expect(payload.metadata.duplicate).toMatchObject({
      relationship: 'linked_duplicate',
      report: {
        incidentId: 15,
        title: 'Duplicate crash',
      },
    });
    expect(payload.metadata.duplicate.media).toHaveLength(1);
    expect(payload.mediaFiles.map((file) => file.role)).toEqual([
      'report',
      'linked_duplicate',
    ]);
  });

  it('records failed when the ML client returns no result', async () => {
    db.oneOrNone
      .mockResolvedValueOnce({
        ...baseContext,
        video_url: '/uploads/incidents/evidence.mp4',
      })
      .mockResolvedValueOnce(null);
    mlClient.analyzeReportMedia.mockResolvedValue(null);

    const result = await mediaJudgmentService.analyzeIncidentMedia(12);

    expect(result.status).toBe('failed');
    expect(result.error).toBe('ML media analysis unavailable');
  });

  it('records failed when the incident references missing stored media', async () => {
    statSpy.mockImplementation(() => {
      const error = new Error('ENOENT');
      error.code = 'ENOENT';
      throw error;
    });
    db.oneOrNone
      .mockResolvedValueOnce({
        ...baseContext,
        photo_urls: ['/uploads/incidents/missing.jpg'],
      })
      .mockResolvedValueOnce(null);

    const result = await mediaJudgmentService.analyzeIncidentMedia(12);

    expect(result.status).toBe('failed');
    expect(result.error).toContain('Stored media file is missing');
    expect(mlClient.analyzeReportMedia).not.toHaveBeenCalled();
  });
});
