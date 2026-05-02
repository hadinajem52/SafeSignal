const { containsPii } = require('../src/utils/piiScanner');

describe('piiScanner', () => {
  it('detects email addresses', () => {
    expect(containsPii('reach me at witness@example.com')).toBe(true);
  });

  it('detects phone numbers', () => {
    expect(containsPii('call 415-555-1212')).toBe(true);
  });

  it('allows safe text', () => {
    expect(containsPii('I heard a loud noise near the corner')).toBe(false);
  });
});
