const LIMITS = {
  MAX_PHOTOS: 5,
  TITLE: { MIN: 5, MAX: 255 },
  DESCRIPTION: { MIN: 10, MAX: 5000 },
  COORDINATES: {
    LAT: { MIN: -90, MAX: 90 },
    LNG: { MIN: -180, MAX: 180 },
  },
  DEDUP: {
    RADIUS_METERS: 1000,
    TIME_HOURS: 4,
    MAX_CANDIDATES: 20,
  },
  ML: {
    TOXICITY_THRESHOLD: 0.2,
    RISK_HIGH: 0.5,
    RISK_AUTOFLAG: 0.8,
  },
};

module.exports = {
  LIMITS,
};
