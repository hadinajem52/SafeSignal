let ioInstance = null;

const setSocketServer = (io) => {
  ioInstance = io;
};

const emitEvent = (event, payload) => {
  if (!ioInstance) return;
  ioInstance.emit(event, payload);
};

const emitToRoles = (roles, event, payload) => {
  if (!ioInstance) return;
  const roleList = Array.isArray(roles) ? roles : [roles];
  roleList.forEach((role) => ioInstance.to(role).emit(event, payload));
};

const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user_${userId}`).emit(event, payload);
};

const emitToUsers = (userIds, event, payload) => {
  if (!ioInstance || !Array.isArray(userIds)) return;
  userIds.forEach((userId) => emitToUser(userId, event, payload));
};

/**
 * Emit event to a specific incident room
 * @param {number} incidentId - The incident ID
 * @param {string} event - The event name
 * @param {Object} payload - The event payload
 */
const emitToIncident = (incidentId, event, payload) => {
  if (!ioInstance) return;
  const room = `incident_${incidentId}`;
  ioInstance.to(room).emit(event, payload);
};

/**
 * Emit event to incident internal room (staff only)
 * @param {number} incidentId - The incident ID
 * @param {string} event - The event name
 * @param {Object} payload - The event payload
 */
const emitToIncidentInternal = (incidentId, event, payload) => {
  if (!ioInstance) return;
  const room = `incident_${incidentId}_internal`;
  ioInstance.to(room).emit(event, payload);
};

/**
 * Emit comment to appropriate rooms based on visibility
 * Public comments go to public room, internal comments go to internal room
 * @param {number} incidentId - The incident ID
 * @param {Object} comment - The comment object
 */
const emitComment = (incidentId, comment) => {
  if (!ioInstance) return;
  
  if (comment.is_internal) {
    // Internal comments only go to staff room
    emitToIncidentInternal(incidentId, 'comment:new', comment);
  } else {
    // Public comments go to public room (visible to everyone)
    emitToIncident(incidentId, 'comment:new', comment);
  }
};

module.exports = {
  setSocketServer,
  emitEvent,
  emitToRoles,
  emitToUser,
  emitToUsers,
  emitToIncident,
  emitToIncidentInternal,
  emitComment,
};
