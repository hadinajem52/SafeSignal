const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const logger = require('./logger');

let appInitialized = false;

const readServiceAccountFile = () => {
  const configuredFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  if (!configuredFile && process.env.NODE_ENV === 'test') {
    return null;
  }

  const serviceAccountFile = configuredFile || path.resolve(__dirname, '../../firebase-service-account.json');

  if (!fs.existsSync(serviceAccountFile)) {
    return null;
  }

  try {
    return fs.readFileSync(serviceAccountFile, 'utf8');
  } catch (error) {
    logger.warn(`Firebase service account file could not be read: ${error.message}`);
    return null;
  }
};

const getAdminApp = () => {
  if (appInitialized) {
    return admin.app();
  }

  const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || readServiceAccountFile();
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

async function sendFcmTestNotification(token) {
  const app = getAdminApp();
  if (!app) {
    logger.info(`Skipping FCM test; Firebase credentials absent for token ${tokenPrefix(token)}`);
    return { sent: false, skipped: true };
  }

  try {
    await admin.messaging().send({
      token,
      notification: {
        title: 'SafeSignal FCM Test',
        body: 'Firebase Cloud Messaging delivery is working for this device.',
      },
      data: {
        type: 'fcm_test',
        sent_at: new Date().toISOString(),
      },
    });
    logger.info(`FCM test sent to token ${tokenPrefix(token)}`);
    return { sent: true, skipped: false };
  } catch (error) {
    logger.warn(`FCM test failed for token ${tokenPrefix(token)}: ${error.message}`);
    return { sent: false, skipped: false, error };
  }
}

module.exports = {
  sendFcmTestNotification,
  sendWitnessPromptNotification,
};
