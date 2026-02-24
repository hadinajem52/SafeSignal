const shouldLog = __DEV__;

const logger = {
  log: (...args) => {
    if (shouldLog) {
      console.log(...args);
    }
  },
  warn: (...args) => {
    if (shouldLog) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    if (shouldLog) {
      console.error(...args);
    }
  },
};

export default logger;
