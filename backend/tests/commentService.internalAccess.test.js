jest.mock('../src/config/database', () => ({
  manyOrNone: jest.fn(),
  one: jest.fn(),
  oneOrNone: jest.fn(),
}));

jest.mock('../src/utils/socketService', () => ({ emitComment: jest.fn() }));

const db = require('../src/config/database');
const commentService = require('../src/services/commentService');

const incident = {
  incident_id: 10,
  reporter_id: 7,
  status: 'pending',
  is_draft: false,
};

const statusChange = {
  action_type: 'status_changed',
  moderator_id: 2,
  moderator_name: 'mod',
  moderator_role: 'moderator',
  notes: 'Internal moderation note',
  timestamp: new Date('2026-01-01T00:00:00Z'),
};

describe('commentService internal access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides internal comments and action notes from law enforcement timelines', async () => {
    db.oneOrNone
      .mockResolvedValueOnce(incident)
      .mockResolvedValueOnce({ user_id: 4, role: 'law_enforcement' });
    db.manyOrNone
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([statusChange]);

    const timeline = await commentService.getTimeline(10, 4);

    expect(db.manyOrNone.mock.calls[0][0]).toContain('AND c.is_internal = FALSE');
    expect(timeline).toEqual([
      expect.objectContaining({
        item_type: 'system',
        notes: null,
      }),
    ]);
  });

  it('shows internal comments and action notes to admins', async () => {
    db.oneOrNone
      .mockResolvedValueOnce(incident)
      .mockResolvedValueOnce({ user_id: 1, role: 'admin' });
    db.manyOrNone
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([statusChange]);

    const timeline = await commentService.getTimeline(10, 1);

    expect(db.manyOrNone.mock.calls[0][0]).not.toContain('AND c.is_internal = FALSE');
    expect(timeline[0].notes).toBe('Internal moderation note');
  });

  it('rejects law enforcement internal comments', async () => {
    db.oneOrNone
      .mockResolvedValueOnce(incident)
      .mockResolvedValueOnce({ user_id: 4, role: 'law_enforcement', username: 'officer' });

    await expect(
      commentService.createComment(10, 4, {
        content: 'Internal update',
        isInternal: true,
      })
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Only moderators/admins can create internal comments',
    });
    expect(db.one).not.toHaveBeenCalled();
  });
});
