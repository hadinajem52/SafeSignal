const admin = require('firebase-admin');
const logger = require('./logger');

let appInitialized = false;

const getAdminApp = () => {
  if (appInitialized) {
    return admin.app();
  }

  const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawCredentials) {
    return null;
  }

  try {
    const credentials = JSON.parse(rawCredentials);
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
    appInitialized = true;
    return admin.app();
  } catch (error) {
    logger.warn(`Firebase admin initialization failed: ${error.message}`);
    return null;
  }
};

const tokenPrefix = (token) => String(token || '').slice(0, 8);

async function sendWitnessPromptNotification(token, data) {
  const app = getAdminApp();
  if (!app) {
    logger.info(`Skipping FCM witness prompt; Firebase credentials absent for token ${tokenPrefix(token)}`);
    return { sent: false, skipped: true };
  }

  try {
    await admin.messaging().send({
      token,
      notification: {
        title: 'Activity reported nearby',
        body: 'Did you notice anything unusual in this area recently?',
      },
      data: {
        type: 'witness_prompt',
        constellation_id: String(data.constellationId),
        coarse_latitude: Number(data.coarseLatitude).toFixed(2),
        coarse_longitude: Number(data.coarseLongitude).toFixed(2),
      },
    });
    logger.info(`FCM witness prompt sent to token ${tokenPrefix(token)}`);
    return { sent: true, skipped: false };
  } catch (error) {
    logger.warn(`FCM witness prompt failed for token ${tokenPrefix(token)}: ${error.message}`);
    return { sent: false, skipped: false, error };
  }
}

module.exports = {
  sendWitnessPromptNotification,
};
