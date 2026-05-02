const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_REGEX = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/;

function containsPii(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return false;
  }

  return EMAIL_REGEX.test(text) || PHONE_REGEX.test(text);
}

module.exports = {
  containsPii,
};
