let ioInstance = null;

const setSocketServer = (io) => {
  ioInstance = io;
};

const emitLeiAlert = (payload) => {
  if (!ioInstance) return;
  ioInstance.to('law_enforcement').emit('lei_alert', payload);
};

module.exports = {
  setSocketServer,
  emitLeiAlert,
};
