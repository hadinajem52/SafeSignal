/**
 * Stats Service
 * Handles statistical analysis, safety score calculations, and dashboard data aggregation.
 * Centralizes complex PostGIS queries and scoring algorithms.
 */

const crypto = require('crypto');
const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');
const mlClient = require('../utils/mlClient');
const { LIMITS } = require('../../../constants/limits');

const DEFAULT_SAFETY_RADIUS_KM = 0.5;
const MAX_SAFETY_RADIUS_KM = 1;
const SAFETY_SCORE_WINDOW_DAYS = 30;
// Reports needed before accumulated risk is trusted at full weight. Below this,
// risk is damped toward the neutral baseline (see calculateSafetyScore) so a
// single noisy report can't dominate the score.
const SAFETY_CONFIDENCE_FULL_COUNT = 3;
const CONSTELLATION_RADIUS_METERS = 500;
const DAY_MS = 24 * 60 * 60 * 1000;
const SLA_MINUTES = 30;

const ACTIONED_STATUSES = [
    'verified',
    'dispatched',
    'on_scene',
    'investigating',
    'police_closed',
    'published',
    'resolved',
    'archived',
];

const CLOSED_STATUSES = ['police_closed', 'resolved', 'archived'];
const DISPATCHED_STATUSES = ['dispatched', 'on_scene', 'investigating', 'police_closed', 'resolved', 'archived'];
const ON_SCENE_STATUSES = ['on_scene', 'investigating', 'police_closed', 'resolved', 'archived'];
const ACTIVE_NEARBY_STATUSES = ['verified', 'dispatched', 'on_scene', 'investigating', 'published'];
const SAFETY_SCORE_STATUSES = [...ACTIVE_NEARBY_STATUSES, 'resolved', 'police_closed'];

const FUNNEL_STAGES = [
    { label: 'Received', statuses: null, color: 'var(--dac-blue)' },
    { label: 'Verified', statuses: ACTIONED_STATUSES, color: 'var(--dac-blue)' },
    { label: 'Dispatched', statuses: DISPATCHED_STATUSES, color: 'var(--dac-amber)' },
    { label: 'On Scene', statuses: ON_SCENE_STATUSES, color: 'var(--dac-amber)' },
    { label: 'Closed', statuses: CLOSED_STATUSES, color: 'var(--dac-green)' },
];

const HISTOGRAM_BUCKETS = [
    { label: '0-5m', min: 0, max: 5, color: 'var(--dac-green)' },
    { label: '5-15m', min: 5, max: 15, color: 'var(--dac-green)' },
    { label: '15-30m', min: 15, max: 30, color: 'var(--dac-blue)' },
    { label: '30-60m', min: 30, max: 60, color: 'var(--dac-blue)' },
    { label: '1-2h', min: 60, max: 120, color: 'var(--dac-amber)' },
    { label: '2-4h', min: 120, max: 240, color: 'var(--dac-amber)' },
    { label: '>4h', min: 240, max: null, color: 'var(--dac-red)' },
];

const DAYS_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PERIODS = {
    '7d': {
        periodMs: 7 * DAY_MS,
        trendBuckets: 7,
        trendMs: DAY_MS,
        trendInterval: '1 day',
        catBuckets: 7,
        catMs: DAY_MS,
        catInterval: '1 day',
        trendXLabels: ['1', '2', '3', '4', '5', '6', '7'],
    },
    '30d': {
        periodMs: 30 * DAY_MS,
        trendBuckets: 30,
        trendMs: DAY_MS,
        trendInterval: '1 day',
        catBuckets: 4,
        catMs: 7 * DAY_MS,
        catInterval: '7 days',
        trendXLabels: ['1', '5', '10', '15', '20', '25', '30'],
    },
    '90d': {
        periodMs: 90 * DAY_MS,
        trendBuckets: 30,
        trendMs: 3 * DAY_MS,
        trendInterval: '3 days',
        catBuckets: 4,
        catMs: 22.5 * DAY_MS,
        catInterval: '22.5 days',
        trendXLabels: ['3d', '15d', '30d', '45d', '60d', '75d', '90d'],
    },
    '1y': {
        periodMs: 365 * DAY_MS,
        trendBuckets: 52,
        trendMs: 7 * DAY_MS,
        trendInterval: '7 days',
        catBuckets: 4,
        catMs: 91 * DAY_MS,
        catInterval: '91 days',
        trendXLabels: ['W1', 'W10', 'W20', 'W30', 'W40', 'W52'],
    },
};

const SEVERITY_RISK_WEIGHTS = {
    low: 4,
    medium: 12,
    high: 28,
    critical: 55,
};

const STATUS_RISK_MULTIPLIERS = {
    verified: 1,
    dispatched: 1,
    on_scene: 1,
    investigating: 0.9,
    published: 0.75,
    police_closed: 0.35,
    resolved: 0.25,
};

function normalizeSafetyRadius(radius) {
    const parsedRadius = Number(radius);

    if (!Number.isFinite(parsedRadius) || parsedRadius <= 0) {
        return DEFAULT_SAFETY_RADIUS_KM;
    }

    return Math.min(parsedRadius, MAX_SAFETY_RADIUS_KM);
}

function parseCoordinates(latitude, longitude, { required = false } = {}) {
    const hasLatitude = latitude !== undefined && latitude !== null && latitude !== '';
    const hasLongitude = longitude !== undefined && longitude !== null && longitude !== '';

    if (!hasLatitude && !hasLongitude) {
        if (required) {
            throw ServiceError.badRequest('Latitude and longitude are required');
        }

        return null;
    }

    if (!hasLatitude || !hasLongitude) {
        throw ServiceError.badRequest('Latitude and longitude must be provided together');
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (
        !Number.isFinite(parsedLatitude) ||
        !Number.isFinite(parsedLongitude) ||
        parsedLatitude < LIMITS.COORDINATES.LAT.MIN ||
        parsedLatitude > LIMITS.COORDINATES.LAT.MAX ||
        parsedLongitude < LIMITS.COORDINATES.LNG.MIN ||
        parsedLongitude > LIMITS.COORDINATES.LNG.MAX
    ) {
        throw ServiceError.badRequest('Invalid coordinates');
    }

    return {
        latitude: parsedLatitude,
        longitude: parsedLongitude,
    };
}

function clampScore(value) {
    return Math.max(0, Math.min(100, value));
}

function getIncidentAgeDays(incident, now) {
    const timestamp = new Date(incident.created_at || incident.createdAt).getTime();

    if (!Number.isFinite(timestamp)) {
        return 0;
    }

    return Math.max(0, (now.getTime() - timestamp) / DAY_MS);
}

function getRecencyMultiplier(incident, now, windowDays) {
    const ageRatio = Math.min(getIncidentAgeDays(incident, now) / windowDays, 1);
    return 1 - ageRatio * 0.65;
}

function getDistanceMultiplier(incident, radiusKm) {
    const distanceKm = Number(incident.distance_km);

    if (!Number.isFinite(distanceKm) || distanceKm < 0) {
        return 1;
    }

    const distanceRatio = Math.min(distanceKm / radiusKm, 1);
    return 1 - distanceRatio * 0.5;
}

function calculateIncidentRisk(incident, now, radiusKm, windowDays) {
    const severityRisk = SEVERITY_RISK_WEIGHTS[incident.severity] || 0;
    const statusMultiplier = STATUS_RISK_MULTIPLIERS[incident.status] || 0;

    return severityRisk *
        statusMultiplier *
        getRecencyMultiplier(incident, now, windowDays) *
        getDistanceMultiplier(incident, radiusKm);
}

function getSafetyConfidence(incidentCount) {
    if (incidentCount === 0) {
        return 'low';
    }

    return incidentCount < 3 ? 'moderate' : 'high';
}

function describeSafetyScore(score, incidentCount, radiusKm, windowDays) {
    if (incidentCount === 0) {
        return {
            label: 'Limited Data',
            description: `No verified incidents were reported within ${radiusKm} km in the last ${windowDays} days. This reflects reports, not a safety guarantee.`,
        };
    }

    if (score >= 85) {
        return {
            label: 'Low Activity',
            description: 'Recent verified incident activity near this area is low.',
        };
    }

    if (score >= 70) {
        return {
            label: 'Moderate Activity',
            description: 'Some recent verified incidents were reported near this area.',
        };
    }

    if (score >= 50) {
        return {
            label: 'Elevated Activity',
            description: 'Recent verified incidents suggest elevated activity near this area.',
        };
    }

    return {
        label: 'High Activity',
        description: 'Recent verified incidents suggest high activity near this area. Stay alert.',
    };
}

/**
 * Calculate a reported-activity safety score from recent, verified incidents.
 * @param {Array} incidents - List of nearby incidents with severity, status, created_at, and distance_km
 * @returns {Object} Score object { score, label, description }
 */
function calculateSafetyScore(incidents, options = {}) {
    const radiusKm = normalizeSafetyRadius(options.radius);
    const windowDays = SAFETY_SCORE_WINDOW_DAYS;
    const now = options.now ? new Date(options.now) : new Date();
    const incidentCount = incidents.length;
    const totalRisk = incidents.reduce(
        (sum, incident) => sum + calculateIncidentRisk(incident, now, radiusKm, windowDays),
        0
    );
    // Confidence shrinkage: a handful of reports is a noisy sample, so damp the
    // accumulated risk toward the neutral baseline until enough incidents
    // corroborate it. One report counts ~1/3, two ~2/3, three or more fully —
    // this stops a single severe incident from dominating the gauge.
    const confidenceFactor = Math.min(1, incidentCount / SAFETY_CONFIDENCE_FULL_COUNT);
    const score = clampScore(Math.round(100 - totalRisk * confidenceFactor));
    const { label, description } = describeSafetyScore(score, incidentCount, radiusKm, windowDays);

    return {
        score,
        label,
        description,
        confidence: getSafetyConfidence(incidentCount),
        incidentCount,
        radiusKm,
        windowDays,
        generatedAt: now.toISOString(),
    };
}

/**
 * Get aggregated statistics for the moderator dashboard
 * @returns {Promise<Object>} Dashboard statistics
 */
async function getModeratorStats() {
    // Get total incident counts
    const incidentStats = await db.one(`
    SELECT 
      COUNT(*) as "totalIncidents",
      SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as "pendingReports",
      SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as "verifiedReports",
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as "rejectedReports"
    FROM incidents
    WHERE is_draft = FALSE
  `);

    // Get user statistics
    const userStats = await db.one(`
    SELECT 
      COUNT(*) as "totalUsers",
      SUM(CASE WHEN is_suspended = FALSE THEN 1 ELSE 0 END) as "activeUsers",
      SUM(CASE WHEN is_suspended = TRUE THEN 1 ELSE 0 END) as "suspendedUsers"
    FROM users
  `);

    // Get recent incidents
    const recentIncidents = await db.manyOrNone(`
    SELECT 
      i.incident_id, i.title, i.status, i.category, i.severity, 
      i.created_at, u.username, i.location_name
    FROM incidents i
    JOIN users u ON i.reporter_id = u.user_id
    WHERE i.is_draft = FALSE
    ORDER BY i.created_at DESC
    LIMIT 4
  `);

    return {
        totalIncidents: parseInt(incidentStats.totalIncidents || 0),
        pendingReports: parseInt(incidentStats.pendingReports || 0),
        verifiedReports: parseInt(incidentStats.verifiedReports || 0),
        rejectedReports: parseInt(incidentStats.rejectedReports || 0),
        totalUsers: parseInt(userStats.totalUsers || 0),
        activeUsers: parseInt(userStats.activeUsers || 0),
        suspendedUsers: parseInt(userStats.suspendedUsers || 0),
        recentIncidents: recentIncidents || [],
    };
}

function getDacPeriodConfig(period) {
    return PERIODS[period] || PERIODS['30d'];
}

function toInt(value) {
    return parseInt(value || 0, 10);
}

function toNumber(value) {
    return Number.parseFloat(value || 0);
}

function formatResponseMinutes(minutes) {
    const value = Number(minutes || 0);

    if (value >= 60) {
        return { val: (value / 60).toFixed(1), unit: 'hr' };
    }

    return { val: Math.round(value), unit: 'min' };
}

function getPeakLabel(trendLine, config, now) {
    const maxValue = Math.max(...trendLine);

    if (maxValue === 0) {
        return '—';
    }

    const peakIndex = trendLine.indexOf(maxValue);
    const peakDate = new Date(now.getTime() - (config.trendBuckets - 1 - peakIndex) * config.trendMs);
    const format = config.trendMs <= DAY_MS
        ? { weekday: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric' };

    return peakDate.toLocaleDateString('en-US', format);
}

function getCategoryBucketLabels(config, now) {
    const format = config.catMs < 60 * DAY_MS
        ? { month: 'short', day: 'numeric' }
        : { month: 'short', year: '2-digit' };

    return Array.from({ length: config.catBuckets }, (_, index) => {
        const bucketStart = now.getTime() - (config.catBuckets - index) * config.catMs;
        return new Date(bucketStart).toLocaleDateString('en-US', format);
    });
}

function buildHeatmap(rows) {
    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));

    rows.forEach((row) => {
        heatmap[toInt(row.dow)][toInt(row.hour)] = toInt(row.count);
    });

    return heatmap;
}

function getHeatPeak(heatmap) {
    let peakDow = 0;
    let peakHour = 0;
    let peakCount = 0;

    heatmap.forEach((row, dow) => {
        row.forEach((count, hour) => {
            if (count > peakCount) {
                peakDow = dow;
                peakHour = hour;
                peakCount = count;
            }
        });
    });

    return {
        peakDow,
        peakHour,
        peakCount,
        peakDayLabel: DAYS_LABELS[peakDow],
    };
}

function getReporterColor(percent) {
    if (percent >= 75) return 'var(--dac-green)';
    if (percent >= 40) return 'var(--dac-amber)';
    return 'var(--dac-red)';
}

async function getDacKpis(now, cutoff, periodMinutes) {
    const row = await db.one(`
      WITH scoped AS (
        SELECT status, created_at, first_action_at, closed_at
        FROM incidents
        WHERE is_draft = FALSE
          AND created_at >= $1::timestamptz
          AND created_at < $2::timestamptz
      ),
      response_times AS (
        SELECT EXTRACT(EPOCH FROM (first_action_at - created_at)) / 60.0 AS minutes
        FROM scoped
        WHERE status = ANY($3::text[])
          AND first_action_at IS NOT NULL
          AND EXTRACT(EPOCH FROM (first_action_at - created_at)) / 60.0 > 0
          AND EXTRACT(EPOCH FROM (first_action_at - created_at)) / 60.0 < $5::float
      ),
      close_times AS (
        SELECT EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400.0 AS days
        FROM scoped
        WHERE status = ANY($4::text[])
          AND closed_at IS NOT NULL
          AND closed_at > created_at
      )
      SELECT
        (SELECT COUNT(*) FROM scoped)::int AS total_incidents,
        (SELECT COUNT(*) FROM scoped WHERE status = ANY($4::text[]))::int AS closed_count,
        (SELECT COUNT(*) FROM response_times)::int AS response_sample_count,
        (SELECT COUNT(*) FROM close_times)::int AS close_duration_count,
        (SELECT ROUND(AVG(minutes)) FROM response_times)::int AS avg_response,
        (SELECT COUNT(*) FROM response_times)::int AS actioned_count,
        (SELECT COUNT(*) FROM response_times WHERE minutes <= ${SLA_MINUTES})::int AS sla_compliant,
        (SELECT AVG(days) FROM close_times) AS avg_time_to_close,
        COALESCE((SELECT percentile_cont(0.25) WITHIN GROUP (ORDER BY minutes) FROM response_times), 0) AS p25,
        COALESCE((SELECT percentile_cont(0.50) WITHIN GROUP (ORDER BY minutes) FROM response_times), 0) AS p50,
        COALESCE((SELECT percentile_cont(0.75) WITHIN GROUP (ORDER BY minutes) FROM response_times), 0) AS p75,
        COALESCE((SELECT percentile_cont(0.90) WITHIN GROUP (ORDER BY minutes) FROM response_times), 0) AS p90,
        ${HISTOGRAM_BUCKETS.map((bucket, index) => {
            if (bucket.max === null) {
                return `(SELECT COUNT(*) FROM response_times WHERE minutes >= ${bucket.min})::int AS hist_${index}`;
            }

            return `(SELECT COUNT(*) FROM response_times WHERE minutes >= ${bucket.min} AND minutes < ${bucket.max})::int AS hist_${index}`;
        }).join(',\n        ')}
    `, [cutoff, now, ACTIONED_STATUSES, CLOSED_STATUSES, periodMinutes]);

    const totalIncidents = toInt(row.total_incidents);
    const actionedCount = toInt(row.actioned_count);
    const closedCount = toInt(row.closed_count);
    const slaCompliant = toInt(row.sla_compliant);
    const slaBreached = actionedCount - slaCompliant;
    const responseSampleCount = toInt(row.response_sample_count);
    const closeDurationCount = toInt(row.close_duration_count);

    return {
        totalIncidents,
        kpis: {
            avgResponse: row.avg_response === null || row.avg_response === undefined ? null : toInt(row.avg_response),
            slaRate: actionedCount > 0 ? Math.round((slaCompliant / actionedCount) * 100) : 0,
            resolutionRate: totalIncidents > 0 ? Math.round((closedCount / totalIncidents) * 100) : 0,
            avgTimeToClose: row.avg_time_to_close === null || row.avg_time_to_close === undefined
                ? null
                : toNumber(row.avg_time_to_close).toFixed(1),
            responseTimes: [],
            actionedCount,
            responseSampleCount,
            closeDurationCount,
            slaCompliant,
            slaBreached,
            closedCount,
        },
        histogramData: HISTOGRAM_BUCKETS.map((bucket, index) => ({
            label: bucket.label,
            max: bucket.max === null ? null : bucket.max,
            color: bucket.color,
            count: toInt(row[`hist_${index}`]),
        })),
        percentiles: responseSampleCount > 0
            ? [
                { label: 'P25', ...formatResponseMinutes(row.p25), color: 'var(--dac-green)', fill: 25 },
                { label: 'P50', ...formatResponseMinutes(row.p50), color: 'var(--dac-blue)', fill: 50 },
                { label: 'P75', ...formatResponseMinutes(row.p75), color: 'var(--dac-amber)', fill: 75 },
                { label: 'P90', ...formatResponseMinutes(row.p90), color: 'var(--dac-red)', fill: 90 },
            ]
            : [
                { label: 'P25', val: '—', unit: '', color: 'var(--dac-green)', fill: 25 },
                { label: 'P50', val: '—', unit: '', color: 'var(--dac-blue)', fill: 50 },
                { label: 'P75', val: '—', unit: '', color: 'var(--dac-amber)', fill: 75 },
                { label: 'P90', val: '—', unit: '', color: 'var(--dac-red)', fill: 90 },
            ],
    };
}

async function getDacTrend(now, config) {
    const rows = await db.manyOrNone(`
      WITH cfg AS (
        SELECT $1::timestamptz AS now_ts, $2::int AS buckets, $3::interval AS bucket_interval
      ),
      buckets AS (
        SELECT
          idx,
          cfg.now_ts - ((cfg.buckets - idx) * cfg.bucket_interval) AS bucket_start,
          cfg.bucket_interval
        FROM cfg, generate_series(0, cfg.buckets - 1) AS idx
      )
      SELECT b.idx::int, COUNT(i.incident_id)::int AS count
      FROM buckets b
      LEFT JOIN incidents i
        ON i.is_draft = FALSE
       AND i.created_at >= b.bucket_start
       AND i.created_at < b.bucket_start + b.bucket_interval
      GROUP BY b.idx
      ORDER BY b.idx
    `, [now, config.trendBuckets, config.trendInterval]);

    const trendLine = Array.from({ length: config.trendBuckets }, () => 0);
    rows.forEach((row) => {
        trendLine[toInt(row.idx)] = toInt(row.count);
    });

    const trendTotal = trendLine.reduce((sum, value) => sum + value, 0);
    const weeks = (config.trendBuckets * config.trendMs) / (7 * DAY_MS);

    return {
        trendLine,
        trendMax: Math.max(...trendLine, 1),
        trendTotal,
        trendWeeklyAvg: weeks > 0 ? (trendTotal / weeks).toFixed(1) : '0.0',
        trendXLabels: config.trendXLabels,
        peakLabel: getPeakLabel(trendLine, config, now),
    };
}

async function getDacHeatmap(cutoff, now) {
    const rows = await db.manyOrNone(`
      SELECT
        ((EXTRACT(DOW FROM created_at)::int + 6) % 7)::int AS dow,
        EXTRACT(HOUR FROM created_at)::int AS hour,
        COUNT(*)::int AS count
      FROM incidents
      WHERE is_draft = FALSE
        AND created_at >= $1::timestamptz
        AND created_at < $2::timestamptz
      GROUP BY dow, hour
    `, [cutoff, now]);

    const heatmap = buildHeatmap(rows);

    return {
        heatmap,
        heatMax: Math.max(...heatmap.flat(), 1),
        heatPeak: getHeatPeak(heatmap),
    };
}

async function getDacFunnel(cutoff, now) {
    const rows = await db.manyOrNone(`
      SELECT status, COUNT(*)::int AS count
      FROM incidents
      WHERE is_draft = FALSE
        AND created_at >= $1::timestamptz
        AND created_at < $2::timestamptz
      GROUP BY status
    `, [cutoff, now]);
    const statusCounts = rows.reduce((counts, row) => {
        counts[row.status] = toInt(row.count);
        return counts;
    }, {});
    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    return FUNNEL_STAGES.map((stage) => ({
        label: stage.label,
        color: stage.color,
        count: stage.statuses
            ? stage.statuses.reduce((sum, status) => sum + (statusCounts[status] || 0), 0)
            : total,
    }));
}

async function getDacCategoryData(now, config) {
    const rows = await db.manyOrNone(`
      WITH cfg AS (
        SELECT $1::timestamptz AS now_ts, $2::int AS buckets, $3::interval AS bucket_interval
      ),
      buckets AS (
        SELECT
          idx,
          cfg.now_ts - ((cfg.buckets - idx) * cfg.bucket_interval) AS bucket_start,
          cfg.bucket_interval
        FROM cfg, generate_series(0, cfg.buckets - 1) AS idx
      )
      SELECT i.category, b.idx::int, COUNT(i.incident_id)::int AS count
      FROM buckets b
      JOIN incidents i
        ON i.is_draft = FALSE
       AND i.created_at >= b.bucket_start
       AND i.created_at < b.bucket_start + b.bucket_interval
      WHERE i.category IS NOT NULL
      GROUP BY i.category, b.idx
      ORDER BY i.category, b.idx
    `, [now, config.catBuckets, config.catInterval]);

    const catTrend = {};
    rows.forEach((row) => {
        if (!catTrend[row.category]) {
            catTrend[row.category] = Array.from({ length: config.catBuckets }, () => 0);
        }
        catTrend[row.category][toInt(row.idx)] = toInt(row.count);
    });

    const activeCats = Object.entries(catTrend)
        .filter(([, values]) => values.some((count) => count > 0))
        .sort(([, a], [, b]) => b.reduce((sum, value) => sum + value, 0) - a.reduce((sum, value) => sum + value, 0))
        .slice(0, 6);

    return {
        catTrend,
        catMax: Math.max(...Object.values(catTrend).flat(), 1),
        activeCats,
        catBucketLabels: getCategoryBucketLabels(config, now),
    };
}

async function getDacHotspots(cutoff, now) {
    const rows = await db.manyOrNone(`
      SELECT COALESCE(NULLIF(location_name, ''), 'Unknown') AS name, COUNT(*)::int AS count
      FROM incidents
      WHERE is_draft = FALSE
        AND created_at >= $1::timestamptz
        AND created_at < $2::timestamptz
      GROUP BY name
      ORDER BY count DESC, name ASC
      LIMIT 5
    `, [cutoff, now]);
    const maxCount = rows[0]?.count || 1;

    return rows.map((row) => ({
        name: row.name.length > 30 ? `${row.name.slice(0, 28)}…` : row.name,
        count: toInt(row.count),
        pct: Math.round((toInt(row.count) / maxCount) * 100),
    }));
}

async function getDacReporterStats(cutoff, now) {
    const rows = await db.manyOrNone(`
      SELECT
        i.reporter_id,
        COALESCE(NULLIF(u.username, ''), 'User #' || i.reporter_id::text) AS name,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE i.status = ANY($3::text[]))::int AS valid
      FROM incidents i
      LEFT JOIN users u ON u.user_id = i.reporter_id
      WHERE i.is_draft = FALSE
        AND i.reporter_id IS NOT NULL
        AND i.created_at >= $1::timestamptz
        AND i.created_at < $2::timestamptz
      GROUP BY i.reporter_id, u.username
      HAVING COUNT(*) >= 2
      ORDER BY total DESC, valid DESC
      LIMIT 5
    `, [cutoff, now, ACTIONED_STATUSES]);

    return rows.map((row) => {
        const total = toInt(row.total);
        const valid = toInt(row.valid);
        const pct = total > 0 ? Math.round((valid / total) * 100) : 0;

        return {
            id: row.reporter_id,
            name: row.name,
            initials: row.name.slice(0, 2).toUpperCase(),
            total,
            valid,
            pct,
            color: getReporterColor(pct),
        };
    });
}

async function getDacInsightInputs(cutoff, now, previousCutoff, funnelData, heatPeak, kpis, period) {
    const [currentCategoryRows, previousCategoryRows, previousStatsRow, hotspotRows] = await Promise.all([
        db.manyOrNone(`
          SELECT category, COUNT(*)::int AS count
          FROM incidents
          WHERE is_draft = FALSE
            AND created_at >= $1::timestamptz
            AND created_at < $2::timestamptz
          GROUP BY category
          ORDER BY count DESC
        `, [cutoff, now]),
        db.manyOrNone(`
          SELECT category, COUNT(*)::int AS count
          FROM incidents
          WHERE is_draft = FALSE
            AND created_at >= $1::timestamptz
            AND created_at < $2::timestamptz
          GROUP BY category
          ORDER BY count DESC
        `, [previousCutoff, cutoff]),
        db.one(`
          WITH scoped AS (
            SELECT status, created_at, first_action_at, category
            FROM incidents
            WHERE is_draft = FALSE
              AND created_at >= $1::timestamptz
              AND created_at < $2::timestamptz
          ),
          response_times AS (
            SELECT EXTRACT(EPOCH FROM (first_action_at - created_at)) / 60.0 AS minutes
            FROM scoped
            WHERE status = ANY($3::text[])
              AND first_action_at IS NOT NULL
              AND EXTRACT(EPOCH FROM (first_action_at - created_at)) / 60.0 > 0
              AND EXTRACT(EPOCH FROM (first_action_at - created_at)) / 60.0 < $4::float
          )
          SELECT
            (SELECT COUNT(*) FROM scoped)::int AS total_incidents,
            (SELECT COUNT(*) FROM response_times)::int AS actioned_count,
            (SELECT COUNT(*) FROM response_times WHERE minutes <= ${SLA_MINUTES})::int AS sla_compliant,
            (SELECT category FROM scoped GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1) AS top_category
        `, [previousCutoff, cutoff, ACTIONED_STATUSES, (new Date(now) - new Date(cutoff)) / 60000]),
        db.manyOrNone(`
          SELECT COALESCE(NULLIF(location_name, ''), 'Unknown') AS name, COUNT(*)::int AS count
          FROM incidents
          WHERE is_draft = FALSE
            AND created_at >= $1::timestamptz
            AND created_at < $2::timestamptz
          GROUP BY name
          ORDER BY count DESC, name ASC
          LIMIT 5
        `, [cutoff, now]),
    ]);

    const currentCategoryCounts = currentCategoryRows.map((row) => [row.category || 'unknown', toInt(row.count)]);
    const previousCategoryCounts = previousCategoryRows.map((row) => [row.category || 'unknown', toInt(row.count)]);
    const [topCategoryName, topCategoryCount] = currentCategoryCounts[0] || [null, 0];
    const previousTopCategoryName = previousCategoryCounts[0]?.[0] || null;
    const previousMatchingCategoryCount = topCategoryName
        ? previousCategoryCounts.find(([category]) => category === topCategoryName)?.[1] || 0
        : 0;
    const categoryDelta = topCategoryName
        ? {
            category: topCategoryName,
            current_count: topCategoryCount,
            prev_count: previousMatchingCategoryCount,
            pct_change: previousMatchingCategoryCount > 0
                ? Number.parseFloat((((topCategoryCount - previousMatchingCategoryCount) / previousMatchingCategoryCount) * 100).toFixed(1))
                : topCategoryCount > 0 ? 100 : 0,
        }
        : null;
    const previousActionedCount = toInt(previousStatsRow.actioned_count);

    return {
        currentCategoryCounts,
        topHotspots: hotspotRows.map((row) => ({ name: row.name, count: toInt(row.count) })),
        previousPeriod: toInt(previousStatsRow.total_incidents) > 0
            ? {
                total_incidents: toInt(previousStatsRow.total_incidents),
                sla_rate: previousActionedCount > 0
                    ? Math.round((toInt(previousStatsRow.sla_compliant) / previousActionedCount) * 100)
                    : 0,
                top_category: previousTopCategoryName,
            }
            : null,
        categoryDelta,
        insightsPayloadBase: {
            period,
            kpis: {
                avg_response_min: kpis.avgResponse,
                sla_rate: kpis.slaRate,
                sla_compliant: kpis.slaCompliant,
                sla_breached: kpis.slaBreached,
                resolution_rate: kpis.resolutionRate,
                avg_time_to_close_days: kpis.avgTimeToClose === null ? null : Number.parseFloat(kpis.avgTimeToClose),
            },
            top_categories: currentCategoryCounts.slice(0, 6),
            top_hotspots: hotspotRows.map((row) => ({ name: row.name, count: toInt(row.count) })),
            peak_activity: {
                day: heatPeak.peakDayLabel,
                hour: heatPeak.peakHour,
                count: heatPeak.peakCount,
            },
            funnel: funnelData.map((stage) => ({ label: stage.label, count: stage.count })),
            prev_period: null,
            trend_direction: 'stable',
            p75_response_min: null,
            category_delta: categoryDelta,
        },
    };
}

async function getDacAnalytics(period = '30d') {
    const normalizedPeriod = PERIODS[period] ? period : '30d';
    const config = getDacPeriodConfig(normalizedPeriod);
    const now = new Date();
    const cutoff = new Date(now.getTime() - config.periodMs);
    const previousCutoff = new Date(now.getTime() - 2 * config.periodMs);
    const periodMinutes = config.periodMs / 60000;

    const [kpiData, trendData, heatmapData, funnelData, categoryData, hotspots, reporterStats] = await Promise.all([
        getDacKpis(now, cutoff, periodMinutes),
        getDacTrend(now, config),
        getDacHeatmap(cutoff, now),
        getDacFunnel(cutoff, now),
        getDacCategoryData(now, config),
        getDacHotspots(cutoff, now),
        getDacReporterStats(cutoff, now),
    ]);
    const insightInputs = await getDacInsightInputs(
        cutoff,
        now,
        previousCutoff,
        funnelData,
        heatmapData.heatPeak,
        kpiData.kpis,
        normalizedPeriod
    );
    const midpoint = Math.ceil(trendData.trendLine.length / 2);
    const firstHalfTotal = trendData.trendLine.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
    const secondHalfTotal = trendData.trendLine.slice(midpoint).reduce((sum, value) => sum + value, 0);
    const trendDirection = secondHalfTotal > firstHalfTotal
        ? 'rising'
        : secondHalfTotal < firstHalfTotal ? 'falling' : 'stable';
    const p75Metric = kpiData.percentiles[2];
    const p75Value = Number.parseFloat(p75Metric?.val);
    const p75ResponseMinutes = Number.isFinite(p75Value)
        ? Number.parseFloat(p75Metric.val) * (p75Metric.unit === 'hr' ? 60 : 1)
        : null;

    return {
        period: normalizedPeriod,
        generatedAt: now.toISOString(),
        incidentsCount: kpiData.totalIncidents,
        kpis: kpiData.kpis,
        histogramData: kpiData.histogramData,
        histMax: Math.max(...kpiData.histogramData.map((bucket) => bucket.count), 1),
        percentiles: kpiData.percentiles,
        ...trendData,
        ...heatmapData,
        funnelData,
        ...categoryData,
        hotspots,
        reporterStats,
        insightsPayload: {
            ...insightInputs.insightsPayloadBase,
            total_incidents: kpiData.totalIncidents,
            prev_period: insightInputs.previousPeriod,
            trend_direction: trendDirection,
            p75_response_min: p75ResponseMinutes,
        },
    };
}

/**
 * Get dashboard data for a mobile user
 * @param {number} userId - The user's ID
 * @param {Object} coords - Coordinates { latitude, longitude, radius }
 * @returns {Promise<Object>} User dashboard data
 */
async function getUserDashboardStats(userId, { latitude, longitude, radius = DEFAULT_SAFETY_RADIUS_KM }) {
    const coords = parseCoordinates(latitude, longitude);
    const normalizedRadius = normalizeSafetyRadius(radius);
    const hasCoords = Boolean(coords);

    // Single spatial scan returns all nearby incidents + active count in one pass
    const nearbyIncidentsPromise = hasCoords
        ? db.manyOrNone(`
      SELECT
        severity,
        created_at,
        status,
        ST_Distance(
          i.location,
          ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography
        ) / 1000 as distance_km
      FROM incidents i
      WHERE i.is_draft = FALSE
        AND i.status = ANY($4::text[])
        AND i.created_at >= NOW() - ($5::int * INTERVAL '1 day')
        AND ST_DWithin(
          i.location,
          ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography,
          $3::float * 1000
        )
    `, [coords.longitude, coords.latitude, normalizedRadius, SAFETY_SCORE_STATUSES, SAFETY_SCORE_WINDOW_DAYS])
        : Promise.resolve([]);

    const activeNearbyPromise = hasCoords
        ? Promise.resolve(null) // derived from nearbyIncidentsPromise after await
        : db.one(`
    SELECT COUNT(*) as count
    FROM incidents
    WHERE is_draft = FALSE
      AND status = ANY($1::text[])
      AND created_at >= NOW() - INTERVAL '7 days'
  `, [ACTIVE_NEARBY_STATUSES]);

    const resolvedThisWeekPromise = db.one(`
    SELECT COUNT(*) as count
    FROM incidents
    WHERE is_draft = FALSE
      AND status IN ('resolved', 'police_closed')
      AND created_at >= NOW() - INTERVAL '7 days'
  `);

    const userStatsPromise = db.one(`
    SELECT 
      COUNT(*)::int as "totalReports",
      COALESCE(SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END), 0)::int as "verifiedReports",
      COALESCE(SUM(CASE WHEN status IN ('resolved', 'police_closed') THEN 1 ELSE 0 END), 0)::int as "resolvedReports",
      COALESCE(SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END), 0)::int as "pendingReports"
    FROM incidents
    WHERE reporter_id = $1 AND is_draft = FALSE
  `, [userId]);

    const recentActivityPromise = db.manyOrNone(`
    SELECT incident_id, title as incidentTitle, category as type, created_at as timestamp
    FROM incidents
    WHERE reporter_id = $1 AND is_draft = FALSE
    ORDER BY created_at DESC
    LIMIT 5
  `, [userId]);

    const nearbyConstellationsPromise = getNearbyConstellationsForUser(userId);

    const [
        nearbyIncidents,
        activeNearbyRow,
        resolvedThisWeek,
        userStats,
        recentActivity,
        nearbyConstellations,
    ] = await Promise.all([
        nearbyIncidentsPromise,
        activeNearbyPromise,
        resolvedThisWeekPromise,
        userStatsPromise,
        recentActivityPromise,
        nearbyConstellationsPromise,
    ]);

    const safetyScore = hasCoords ? calculateSafetyScore(nearbyIncidents, { radius: normalizedRadius }) : null;

    // When coords present, derive active count from the shared spatial query result
    const activeNearbyCount = hasCoords
        ? nearbyIncidents.filter(
            (i) => ACTIVE_NEARBY_STATUSES.includes(i.status) &&
            new Date(i.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length
        : parseInt(activeNearbyRow.count);

    return {
        safetyScore,
        quickStats: {
            activeNearby: activeNearbyCount,
            resolvedThisWeek: parseInt(resolvedThisWeek.count),
        },
        userStats: {
            totalReports: parseInt(userStats.totalReports || 0),
            verifiedReports: parseInt(userStats.verifiedReports || 0),
            resolvedReports: parseInt(userStats.resolvedReports || 0),
            pendingReports: parseInt(userStats.pendingReports || 0),
        },
        recentActivity: recentActivity || [],
        witnessPrompts: {
            count: nearbyConstellations.count,
            firstNearbyConstellationId: nearbyConstellations.constellation_id || null,
            coarseLatitude: nearbyConstellations.center_latitude === undefined || nearbyConstellations.center_latitude === null
                ? null
                : Number(Number(nearbyConstellations.center_latitude).toFixed(2)),
            coarseLongitude: nearbyConstellations.center_longitude === undefined || nearbyConstellations.center_longitude === null
                ? null
                : Number(Number(nearbyConstellations.center_longitude).toFixed(2)),
        },
    };
}

async function getNearbyConstellationsForUser(userId) {
    const user = await db.oneOrNone(`
      SELECT last_known_latitude, last_known_longitude
      FROM users
      WHERE user_id = $1
        AND location_consent = TRUE
        AND last_known_latitude IS NOT NULL
        AND last_known_longitude IS NOT NULL
    `, [userId]);

    if (!user) {
        return { count: 0, constellation_id: null, center_latitude: null, center_longitude: null };
    }

    return db.one(`
      WITH eligible AS (
        SELECT c.constellation_id, c.center_latitude, c.center_longitude, c.opens_at
        FROM incident_constellations c
        JOIN incidents i ON i.incident_id = c.incident_id
        WHERE c.status = 'active'
          AND c.expires_at > NOW()
          AND i.reporter_id <> $1
          AND NOT EXISTS (
            SELECT 1
            FROM incident_corroborations ic
            WHERE ic.constellation_id = c.constellation_id
              AND ic.user_id = $1
          )
          AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(c.center_longitude::float, c.center_latitude::float), 4326)::geography,
            ST_SetSRID(ST_MakePoint($2::float, $3::float), 4326)::geography,
            $4
          )
      ),
      first_prompt AS (
        SELECT constellation_id, center_latitude, center_longitude
        FROM eligible
        ORDER BY opens_at DESC
        LIMIT 1
      )
      SELECT
        (SELECT COUNT(*) FROM eligible)::int AS count,
        first_prompt.constellation_id,
        first_prompt.center_latitude,
        first_prompt.center_longitude
      FROM first_prompt
      UNION ALL
      SELECT 0, NULL, NULL, NULL
      WHERE NOT EXISTS (SELECT 1 FROM first_prompt)
    `, [
        userId,
        Number(user.last_known_longitude),
        Number(user.last_known_latitude),
        CONSTELLATION_RADIUS_METERS,
    ]);
}

/**
 * Get detailed safety statistics for a specific area (Public/Shared)
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} radius - in km
 * @returns {Promise<Object>} Area safety details
 */
async function getAreaSafetyStats(latitude, longitude, radius = DEFAULT_SAFETY_RADIUS_KM) {
    const coords = parseCoordinates(latitude, longitude, { required: true });
    const normalizedRadius = normalizeSafetyRadius(radius);

    // Calculate incidents within radius
    const incidents = await db.manyOrNone(`
    SELECT i.incident_id, i.title, i.category, i.severity, i.created_at,
           i.status,
           ST_Distance(
             i.location,
             ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography
           ) / 1000 as distance_km
    FROM incidents i
    WHERE i.is_draft = FALSE
      AND i.status = ANY($4::text[])
      AND i.created_at >= NOW() - ($5::int * INTERVAL '1 day')
      AND ST_DWithin(
        i.location,
        ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography,
        $3::float * 1000
      )
    ORDER BY distance_km ASC
  `, [coords.longitude, coords.latitude, normalizedRadius, SAFETY_SCORE_STATUSES, SAFETY_SCORE_WINDOW_DAYS]);

    const scoreData = calculateSafetyScore(incidents, { radius: normalizedRadius });

    // Aggregate category counts
    const categoryCounts = {};
    incidents.forEach(incident => {
        categoryCounts[incident.category] = (categoryCounts[incident.category] || 0) + 1;
    });

    return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        radius: normalizedRadius,
        safetyScore: scoreData.score,
        safetyLabel: scoreData.label,
        safetyDescription: scoreData.description,
        safetyScoreDetails: scoreData,
        totalIncidents: incidents.length,
        incidents: incidents.slice(0, 50),
        categories: categoryCounts,
    };
}

// ── Area AI insights ──────────────────────────────────────────────────────────
// Citizen-facing read of recent nearby activity. Scope is intentionally tighter
// than the safety score: a 1 km / 7 day window of "what's been happening near me".
const AREA_INSIGHTS_RADIUS_KM = 1;
const AREA_INSIGHTS_WINDOW_DAYS = 7;
const AREA_RESOLVED_STATUSES = ['resolved', 'police_closed'];
// Token guardrail: identical area situations share one Gemini generation for the TTL.
const AREA_INSIGHTS_CACHE_TTL_MS = 30 * 60 * 1000;
const AREA_INSIGHTS_CACHE_MAX = 500;

const areaInsightsCache = new Map();

function areaCacheGet(key) {
    const hit = areaInsightsCache.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
        areaInsightsCache.delete(key);
        return null;
    }
    // Refresh LRU recency
    areaInsightsCache.delete(key);
    areaInsightsCache.set(key, hit);
    return hit.value;
}

function areaCacheSet(key, value) {
    if (areaInsightsCache.size >= AREA_INSIGHTS_CACHE_MAX) {
        const oldest = areaInsightsCache.keys().next().value;
        if (oldest !== undefined) areaInsightsCache.delete(oldest);
    }
    areaInsightsCache.set(key, { value, expiresAt: Date.now() + AREA_INSIGHTS_CACHE_TTL_MS });
}

function bucketForHour(hour) {
    if (hour >= 6 && hour <= 11) return 'morning';
    if (hour >= 12 && hour <= 17) return 'afternoon';
    if (hour >= 18 && hour <= 21) return 'evening';
    return 'night';
}

function deriveTrend(currentTotal, prevTotal) {
    if (!Number.isFinite(prevTotal) || prevTotal === 0) {
        return currentTotal > 0 ? 'rising' : 'stable';
    }
    const ratio = currentTotal / prevTotal;
    if (ratio >= 1.25) return 'rising';
    if (ratio <= 0.75) return 'falling';
    return 'stable';
}

/**
 * Reduce raw nearby incidents into a compact, anonymous payload. No report text
 * or coordinates are included — only counts — so input tokens stay tiny and no
 * PII reaches the model.
 */
function buildAreaAggregate(rows, prevTotal, coords) {
    const now = Date.now();
    const total = rows.length;

    const severities = { critical: 0, high: 0, medium: 0, low: 0 };
    const timeOfDay = { night: 0, morning: 0, afternoon: 0, evening: 0 };
    const categoryCounts = {};
    const dailyCounts = [0, 0, 0, 0, 0, 0, 0]; // index 0 = oldest day, 6 = today

    let active = 0;
    let resolved = 0;
    let nearestKm = null;
    let mostRecentHours = null;

    for (const row of rows) {
        if (severities[row.severity] !== undefined) severities[row.severity] += 1;

        const created = new Date(row.created_at);
        const hour = Number.isFinite(row.hour) ? row.hour : created.getHours();
        timeOfDay[bucketForHour(hour)] += 1;

        categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1;

        if (ACTIVE_NEARBY_STATUSES.includes(row.status)) active += 1;
        if (AREA_RESOLVED_STATUSES.includes(row.status)) resolved += 1;

        const ageMs = now - created.getTime();
        const daysAgo = Math.floor(ageMs / DAY_MS);
        const dayIndex = Math.min(6, Math.max(0, 6 - daysAgo));
        dailyCounts[dayIndex] += 1;

        const distanceKm = Number(row.distance_km);
        if (Number.isFinite(distanceKm)) {
            nearestKm = nearestKm === null ? distanceKm : Math.min(nearestKm, distanceKm);
        }
        const ageHours = ageMs / (60 * 60 * 1000);
        if (Number.isFinite(ageHours)) {
            mostRecentHours = mostRecentHours === null ? ageHours : Math.min(mostRecentHours, ageHours);
        }
    }

    const categories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const busiestEntry = Object.entries(timeOfDay)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])[0];

    return {
        geo: [Math.round(coords.latitude * 1000) / 1000, Math.round(coords.longitude * 1000) / 1000],
        radius_km: AREA_INSIGHTS_RADIUS_KM,
        window_days: AREA_INSIGHTS_WINDOW_DAYS,
        total,
        active,
        resolved,
        categories,
        severities,
        time_of_day: timeOfDay,
        busiest_period: busiestEntry ? busiestEntry[0] : null,
        daily_counts: dailyCounts,
        prev_window_total: Number.isFinite(prevTotal) ? prevTotal : 0,
        trend: deriveTrend(total, prevTotal),
        // Rounded so continuously-drifting values don't bust the cache every request.
        nearest_km: nearestKm === null ? null : Math.round(nearestKm * 10) / 10,
        most_recent_hours: mostRecentHours === null ? null : Math.round(mostRecentHours),
        dominant_category: categories.length ? categories[0][0] : null,
    };
}

function titleCase(value) {
    const text = String(value || '').replace(/_/g, ' ');
    return text ? text[0].toUpperCase() + text.slice(1) : text;
}

/**
 * Deterministic insight used when there are no incidents (skips Gemini entirely)
 * or when the AI service is unavailable. Still tailored to the aggregate.
 */
function buildFallbackInsight(agg) {
    if (agg.total === 0) {
        return {
            headline: 'All quiet nearby',
            summary: `No incidents reported within ${agg.radius_km} km in the last ${agg.window_days} days.`,
            tip: 'Nothing to act on right now — check back later for fresh reports in your area.',
            level: 'calm',
        };
    }

    const level =
        agg.severities.critical > 0 || agg.total >= 6 || agg.trend === 'rising'
            ? 'elevated'
            : agg.total >= 3 || agg.dominant_category
                ? 'caution'
                : 'calm';

    const countWord = agg.total === 1 ? 'report' : 'reports';
    const domCat = agg.dominant_category ? titleCase(agg.dominant_category) : 'Incidents';
    const timing = agg.busiest_period ? `, most often in the ${agg.busiest_period}` : '';

    const headline =
        level === 'elevated'
            ? 'Heightened activity nearby'
            : level === 'caution'
                ? 'Some activity nearby'
                : 'Mostly calm nearby';

    const summary = `${agg.total} ${countWord} within ${agg.radius_km} km in the last ${agg.window_days} days${timing}. ${domCat} ${
        agg.categories[0] && agg.categories[0][1] > 1 ? 'reports lead' : 'leads'
    } the activity.`;

    const tip = agg.busiest_period
        ? `Activity peaks in the ${agg.busiest_period} — plan walks and errands around quieter hours when you can.`
        : `${domCat} is the most reported type nearby — factor that into your plans around here.`;

    return { headline, summary, tip, level };
}

function buildInsightStats(agg) {
    return {
        total: agg.total,
        active: agg.active,
        resolved: agg.resolved,
        radiusKm: agg.radius_km,
        windowDays: agg.window_days,
        dominantCategory: agg.dominant_category,
        busiestPeriod: agg.busiest_period,
        trend: agg.trend,
        nearestKm: agg.nearest_km,
        mostRecentHours: agg.most_recent_hours,
    };
}

/**
 * Generate an AI read of recent activity within 1 km over the last 7 days.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object>} { headline, summary, tip, level, source, stats }
 */
async function getAreaInsights(latitude, longitude) {
    const coords = parseCoordinates(latitude, longitude, { required: true });

    const params = [coords.longitude, coords.latitude, AREA_INSIGHTS_RADIUS_KM, SAFETY_SCORE_STATUSES, AREA_INSIGHTS_WINDOW_DAYS];

    const [rows, prevRow] = await Promise.all([
        db.manyOrNone(`
      SELECT
        category,
        severity,
        status,
        created_at,
        EXTRACT(HOUR FROM created_at)::int AS hour,
        ST_Distance(
          i.location,
          ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography
        ) / 1000 AS distance_km
      FROM incidents i
      WHERE i.is_draft = FALSE
        AND i.status = ANY($4::text[])
        AND i.created_at >= NOW() - ($5::int * INTERVAL '1 day')
        AND ST_DWithin(
          i.location,
          ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography,
          $3::float * 1000
        )
    `, params),
        db.one(`
      SELECT COUNT(*)::int AS count
      FROM incidents i
      WHERE i.is_draft = FALSE
        AND i.status = ANY($4::text[])
        AND i.created_at >= NOW() - (($5::int * 2) * INTERVAL '1 day')
        AND i.created_at < NOW() - ($5::int * INTERVAL '1 day')
        AND ST_DWithin(
          i.location,
          ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography,
          $3::float * 1000
        )
    `, params),
    ]);

    const aggregate = buildAreaAggregate(rows, prevRow ? prevRow.count : 0, coords);

    // Guardrail: nothing to report → deterministic answer, no Gemini call.
    if (aggregate.total === 0) {
        return { ...buildFallbackInsight(aggregate), source: 'fallback', stats: buildInsightStats(aggregate) };
    }

    // Guardrail: identical situations within the TTL reuse one generation.
    const cacheKey = crypto.createHash('sha1').update(JSON.stringify(aggregate)).digest('hex');
    const cached = areaCacheGet(cacheKey);
    if (cached) return cached;

    let insight = null;
    const ml = await mlClient.generateAreaInsights(aggregate);
    if (ml && ml.supported && ml.insight) {
        insight = { ...ml.insight, source: 'ai', stats: buildInsightStats(aggregate) };
    }

    if (!insight) {
        // ML unavailable / non-Gemini provider — return a tailored fallback, but do
        // not cache it so we recover as soon as the service is back.
        return { ...buildFallbackInsight(aggregate), source: 'fallback', stats: buildInsightStats(aggregate) };
    }

    areaCacheSet(cacheKey, insight);
    return insight;
}

module.exports = {
    getModeratorStats,
    getDacAnalytics,
    getUserDashboardStats,
    getNearbyConstellationsForUser,
    getAreaSafetyStats,
    getAreaInsights,
    calculateSafetyScore,
    // Exported for unit tests
    buildAreaAggregate,
    buildFallbackInsight,
};
