const { canAccessInternalComments, isStaffRole } = require('../src/utils/roleAccess');

describe('roleAccess', () => {
  it('treats law enforcement as staff without internal-comment access', () => {
    expect(isStaffRole('law_enforcement')).toBe(true);
    expect(canAccessInternalComments('law_enforcement')).toBe(false);
  });

  it('allows moderators and admins to access internal comments', () => {
    expect(canAccessInternalComments('moderator')).toBe(true);
    expect(canAccessInternalComments('admin')).toBe(true);
  });
});
