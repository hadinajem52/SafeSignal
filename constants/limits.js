const LIMITS = {
  MAX_PHOTOS: 5,
  TITLE: { MIN: 5, MAX: 255 },
  DESCRIPTION: { MIN: 10, MAX: 5000 },
  COORDINATES: {
    LAT: { MIN: -90, MAX: 90 },
    LNG: { MIN: -180, MAX: 180 },
  },
};

module.exports = {
  LIMITS,
};