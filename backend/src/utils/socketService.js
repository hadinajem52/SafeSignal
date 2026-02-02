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

module.exports = {
  setSocketServer,
  emitEvent,
  emitToRoles,
};
