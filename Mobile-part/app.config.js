const fs = require('fs');
const appJson = require('./app.json');

module.exports = () => {
  const config = appJson.expo;
  const googleServicesFile = process.env.GOOGLE_SERVICES_FILE || './google-services.json';
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    config?.android?.config?.googleMaps?.apiKey ||
    '';

  return {
    ...config,
    android: {
      ...config.android,
      ...(fs.existsSync(googleServicesFile) ? { googleServicesFile } : {}),
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
