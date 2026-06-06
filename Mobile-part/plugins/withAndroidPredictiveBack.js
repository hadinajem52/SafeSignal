const { withAndroidManifest } = require('@expo/config-plugins');

const ANDROID_NAMESPACE = 'http://schemas.android.com/apk/res/android';

module.exports = function withAndroidPredictiveBack(config) {
  return withAndroidManifest(config, (expoConfig) => {
    const manifest = expoConfig.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:android'] = manifest.$['xmlns:android'] || ANDROID_NAMESPACE;

    const application = Array.isArray(manifest.application) ? manifest.application[0] : null;
    if (application) {
      application.$ = application.$ || {};
      application.$['android:enableOnBackInvokedCallback'] = 'true';
    }

    return expoConfig;
  });
};
