/**
 * Notification Service
 * Applies user settings to incident notifications and weekly digests.
 */

const db = require('../config/database');
const logger = require('../utils/logger');
const ServiceError = require('../utils/ServiceError');
const { emitToUser } = require('../utils/socketService');
const settingsService = require('./settingsService');

const STAFF_ROLES = ['moderator', 'admin', 'law_enforcement'];
const ALERT_SEVERITIES = new Set(['high', 'critical']);
const WEEKLY_DIGEST_INTERVAL_MS = 15 * 60 * 1000;
const DIGEST_SEND_DAY_UTC = 1; // Monday
const DIGEST_SEND_HOUR_UTC = 9; // 09:00 UTC

let digestIntervalId = null;
let digestTickInProgress = false;

function buildIncidentEmailContent(eventType, incident, metadata = {}) {
  const statusLabel = incident.status ? incident.status.replace(/_/g, ' ') : 'updated';
  const incidentRef = `#${incident.incident_id}`;
  const title = incident.title || 'Untitled incident';

  if (eventType === 'incident:new') {
    return {
      subject: `New incident ${incidentRef}: ${title}`,
      message: `A new incident was submitted with ${incident.severity || 'unknown'} severity.`,
    };
  }

  if (eventType === 'incident:auto_verified') {
    return {
      subject: `Incident ${incidentRef} auto-verified`,
      message: `System auto-verified this incident at confidence ${metadata.confidencePercent || 'N/A'}%.`,
    };
  }

  if (eventType === 'incident:status_update') {
    const previous = metadata.previousStatus ? String(metadata.previousStatus).replace(/_/g, ' ') : null;
    const next = metadata.nextStatus ? String(metadata.nextStatus).replace(/_/g, ' ') : null;

    return {
      subject: `Incident ${incidentRef} updated`,
      message: metadata.notes || (previous && next
        ? `Incident moved from "${previous}" to "${next}".`
        : `Incident status changed to "${statusLabel}".`),
    };
  }

  return {
    subject: `Incident ${incidentRef} status update`,
    message: `Incident status changed to "${statusLabel}".`,
  };
}

async function getStaffRecipients() {
  await settingsService.ensureSettingsStorage();

  return db.manyOrNone(
    `SELECT
      u.user_id,
      u.role,
      u.username,
      u.email,
      COALESCE(ms.email_notifications, TRUE) AS email_notifications,
      COALESCE(ms.report_alerts, TRUE) AS report_alerts,
      COALESCE(ms.weekly_digest, FALSE) AS weekly_digest,
      ms.last_weekly_digest_sent_at
    FROM users u
    LEFT JOIN moderator_settings ms ON ms.user_id = u.user_id
    WHERE u.role = ANY($1::text[])
      AND COALESCE(u.is_suspended, FALSE) = FALSE`,
    [STAFF_ROLES]
  );
}

async function notifyStaffIncidentEvent(eventType, incident, metadata = {}) {
  if (!incident || !incident.incident_id) {
    return { notifiedUsers: 0, emailQueued: 0, reportAlertsSent: 0 };
  }

  const recipients = await getStaffRecipients();
  if (recipients.length === 0) {
    return { notifiedUsers: 0, emailQueued: 0, reportAlertsSent: 0 };
  }

  const emailContent = buildIncidentEmailContent(eventType, incident, metadata);
  let emailQueued = 0;
  let reportAlertsSent = 0;
  let notifiedUsers = 0;

  recipients.forEach((recipient) => {
    let userNotified = false;

    if (recipient.email_notifications) {
      emitToUser(recipient.user_id, 'notification:email', {
        incidentId: incident.incident_id,
        eventType,
        subject: emailContent.subject,
        message: emailContent.message,
        timestamp: new Date().toISOString(),
      });
      emailQueued += 1;
      userNotified = true;

      logger.info(
        `Email notification queued for user ${recipient.user_id} (${recipient.email}) on incident ${incident.incident_id}`
      );
    }

    if (eventType === 'incident:new' && ALERT_SEVERITIES.has(incident.severity) && recipient.report_alerts) {
      emitToUser(recipient.user_id, 'notification:report_alert', {
        incidentId: incident.incident_id,
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        incidentDate: incident.incident_date,
        locationName: incident.location_name || null,
        timestamp: new Date().toISOString(),
      });
      reportAlertsSent += 1;
      userNotified = true;
    }

    if (userNotified) {
      notifiedUsers += 1;
    }
  });

  return {
    notifiedUsers,
    emailQueued,
    reportAlertsSent,
  };
}

async function buildWeeklyDigestSummary() {
  return db.one(
    `SELECT
      COUNT(*)::int AS total_reports,
      COALESCE(SUM(CASE WHEN severity IN ('high', 'critical') THEN 1 ELSE 0 END), 0)::int AS high_priority_reports,
      COALESCE(SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END), 0)::int AS verified_reports,
      COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0)::int AS rejected_reports,
      COALESCE(SUM(CASE WHEN status IN ('submitted', 'auto_processed', 'in_review', 'auto_flagged', 'needs_info') THEN 1 ELSE 0 END), 0)::int AS open_reports
    FROM incidents
    WHERE is_draft = FALSE
      AND created_at >= NOW() - INTERVAL '7 days'`
  );
}

async function updateLastDigestSent(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return;
  }

  await db.none(
    `UPDATE moderator_settings
     SET last_weekly_digest_sent_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ANY($1::int[])`,
    [userIds]
  );
}

async function getWeeklyDigestRecipients({ force = false } = {}) {
  await settingsService.ensureSettingsStorage();

  return db.manyOrNone(
    `SELECT
      u.user_id,
      u.email,
      u.username,
      COALESCE(ms.email_notifications, TRUE) AS email_notifications,
      ms.last_weekly_digest_sent_at
    FROM users u
    JOIN moderator_settings ms ON ms.user_id = u.user_id
    WHERE u.role = ANY($1::text[])
      AND COALESCE(u.is_suspended, FALSE) = FALSE
      AND ms.weekly_digest = TRUE
      AND (
        $2::boolean = TRUE
        OR ms.last_weekly_digest_sent_at IS NULL
        OR ms.last_weekly_digest_sent_at <= NOW() - INTERVAL '7 days'
      )`,
    [STAFF_ROLES, force]
  );
}

async function sendWeeklyDigestToEligibleStaff({ force = false } = {}) {
  const [recipients, summary] = await Promise.all([
    getWeeklyDigestRecipients({ force }),
    buildWeeklyDigestSummary(),
  ]);

  if (recipients.length === 0) {
    return { sent: 0, summary };
  }

  const timestamp = new Date().toISOString();
  const recipientIds = [];

  recipients.forEach((recipient) => {
    emitToUser(recipient.user_id, 'notification:weekly_digest', {
      generatedAt: timestamp,
      periodDays: 7,
      summary: {
        totalReports: summary.total_reports,
        highPriorityReports: summary.high_priority_reports,
        verifiedReports: summary.verified_reports,
        rejectedReports: summary.rejected_reports,
        openReports: summary.open_reports,
      },
    });

    if (recipient.email_notifications) {
      emitToUser(recipient.user_id, 'notification:email', {
        eventType: 'weekly_digest',
        subject: 'Weekly moderation digest',
        message: `Weekly summary: ${summary.total_reports} new reports, ${summary.high_priority_reports} high-priority.`,
        timestamp,
      });

      logger.info(`Weekly digest email queued for user ${recipient.user_id} (${recipient.email})`);
    }

    recipientIds.push(recipient.user_id);
  });

  await updateLastDigestSent(recipientIds);

  return {
    sent: recipients.length,
    summary,
  };
}

async function sendWeeklyDigestForUser(userId) {
  const settings = await settingsService.getSettingsForUser(userId);
  if (!settings.weeklyDigest) {
    throw ServiceError.badRequest('Enable weeklyDigest before requesting a digest');
  }

  const summary = await buildWeeklyDigestSummary();
  const timestamp = new Date().toISOString();

  emitToUser(userId, 'notification:weekly_digest', {
    generatedAt: timestamp,
    periodDays: 7,
    summary: {
      totalReports: summary.total_reports,
      highPriorityReports: summary.high_priority_reports,
      verifiedReports: summary.verified_reports,
      rejectedReports: summary.rejected_reports,
      openReports: summary.open_reports,
    },
  });

  if (settings.emailNotifications) {
    emitToUser(userId, 'notification:email', {
      eventType: 'weekly_digest',
      subject: 'Weekly moderation digest',
      message: `Weekly summary: ${summary.total_reports} new reports, ${summary.high_priority_reports} high-priority.`,
      timestamp,
    });
  }

  await updateLastDigestSent([userId]);

  return {
    sent: 1,
    summary,
  };
}

function isDigestWindow(now = new Date()) {
  return (
    now.getUTCDay() === DIGEST_SEND_DAY_UTC &&
    now.getUTCHours() === DIGEST_SEND_HOUR_UTC &&
    now.getUTCMinutes() < 15
  );
}

async function runWeeklyDigestTick(now = new Date()) {
  if (!isDigestWindow(now) || digestTickInProgress) {
    return;
  }

  digestTickInProgress = true;
  try {
    const result = await sendWeeklyDigestToEligibleStaff({ force: false });
    if (result.sent > 0) {
      logger.info(`Weekly digest delivered to ${result.sent} staff users`);
    }
  } catch (error) {
    logger.error(`Weekly digest tick failed: ${error.message}`);
  } finally {
    digestTickInProgress = false;
  }
}

function startWeeklyDigestScheduler() {
  if (digestIntervalId) {
    return;
  }

  digestIntervalId = setInterval(() => {
    runWeeklyDigestTick().catch((error) => {
      logger.error(`Weekly digest scheduler error: ${error.message}`);
    });
  }, WEEKLY_DIGEST_INTERVAL_MS);

  // Run a delayed first tick so servers started during window still send.
  setTimeout(() => {
    runWeeklyDigestTick().catch((error) => {
      logger.error(`Weekly digest initial tick error: ${error.message}`);
    });
  }, 30 * 1000);

  logger.info('Weekly digest scheduler started');
}

module.exports = {
  notifyStaffIncidentEvent,
  sendWeeklyDigestToEligibleStaff,
  sendWeeklyDigestForUser,
  startWeeklyDigestScheduler,
};
