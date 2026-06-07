const STAFF_ROLES = new Set(['moderator', 'admin', 'law_enforcement']);
const INTERNAL_COMMENT_ROLES = new Set(['moderator', 'admin']);

function isStaffRole(role) {
  return STAFF_ROLES.has(role);
}

function canAccessInternalComments(role) {
  return INTERNAL_COMMENT_ROLES.has(role);
}

module.exports = {
  canAccessInternalComments,
  isStaffRole,
};
