/**
 * Stats Service
 * Handles statistical analysis, safety score calculations, and dashboard data aggregation.
 * Centralizes complex PostGIS queries and scoring algorithms.
 */

const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');

/**
 * Severity weightings for safety score calculation
 * Adjustable central configuration
 */
const SEVERITY_SCORES = {
    low: 5,
    medium: 15,
    high: 35,
    critical: 60,
};

/**
 * Calculate safety score based on a list of incidents
 * @param {Array} incidents - List of incidents with 'severity' property
 * @returns {Object} Score object { score, label, description }
 */
function calculateSafetyScore(incidents) {
    let totalScore = 0;

    incidents.forEach(incident => {
        totalScore += SEVERITY_SCORES[incident.severity] || 0;
    });

    // Calculate average score per incident, then inverse it for "Safety" (100 is best)
    // Logic: More severe incidents = Higher totalScore = Lower Safety Score
    const avgScore = incidents.length > 0 ? totalScore / incidents.length : 0;
    const score = Math.max(0, Math.round(100 - Math.min(100, avgScore)));

    let label = 'Safe';
    let description = 'This area appears to be safe with few reported incidents.';

    if (score >= 80) {
        label = 'Very Safe';
        description = 'This area has an excellent safety record.';
    } else if (score >= 60) {
        label = 'Safe';
        description = 'This area is generally safe with moderate incident reports.';
    } else if (score >= 40) {
        label = 'Caution';
        description = 'Exercise caution in this area due to recent incidents.';
    } else {
        label = 'High Risk';
        description = 'This area has elevated incident activity. Stay alert.';
    }

    return {
        score,
        label,
        description,
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

/**
 * Get dashboard data for a mobile user
 * @param {number} userId - The user's ID
 * @param {Object} coords - Coordinates { latitude, longitude, radius }
 * @returns {Promise<Object>} User dashboard data
 */
async function getUserDashboardStats(userId, { latitude, longitude, radius = 5 }) {
    const hasCoords = latitude && longitude;

    const nearbyIncidentsPromise = hasCoords
        ? db.manyOrNone(`
      SELECT severity, created_at
      FROM incidents i
      WHERE i.is_draft = FALSE
        AND ST_DWithin(
          i.location,
          ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography,
          $3::float * 1000
        )
    `, [longitude, latitude, radius])
        : Promise.resolve([]);

    const activeNearbyPromise = db.one(`
    SELECT COUNT(*) as count
    FROM incidents
    WHERE is_draft = FALSE
      AND status = 'verified'
      AND created_at >= NOW() - INTERVAL '7 days'
      ${hasCoords ? `AND ST_DWithin(
        location,
        ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography,
        $3::float * 1000
      )` : ''}
  `, hasCoords ? [longitude, latitude, radius] : []);

    const resolvedThisWeekPromise = db.one(`
    SELECT COUNT(*) as count
    FROM incidents
    WHERE is_draft = FALSE
      AND status = 'resolved'
      AND created_at >= NOW() - INTERVAL '7 days'
  `);

    const trendingWithChangePromise = db.manyOrNone(`
    WITH current_week AS (
      SELECT category, COUNT(*) as count
      FROM incidents
      WHERE is_draft = FALSE
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY category
    ),
    prev_week AS (
      SELECT category, COUNT(*) as count
      FROM incidents
      WHERE is_draft = FALSE
        AND created_at >= NOW() - INTERVAL '14 days'
        AND created_at < NOW() - INTERVAL '7 days'
      GROUP BY category
    )
    SELECT c.category,
           c.count,
           CASE
             WHEN COALESCE(p.count, 0) = 0 THEN CASE WHEN c.count > 0 THEN 100 ELSE 0 END
             ELSE ROUND(((c.count - p.count)::float / p.count) * 100)
           END as "changePercentage"
    FROM current_week c
    LEFT JOIN prev_week p ON c.category = p.category
    ORDER BY c.count DESC
    LIMIT 5
  `);

    const userStatsPromise = db.one(`
    SELECT 
      COUNT(*) as totalReports,
      SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verifiedReports,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolvedReports,
      SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pendingReports
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

    const [
        nearbyIncidents,
        activeNearby,
        resolvedThisWeek,
        trendingWithChange,
        userStats,
        recentActivity,
    ] = await Promise.all([
        nearbyIncidentsPromise,
        activeNearbyPromise,
        resolvedThisWeekPromise,
        trendingWithChangePromise,
        userStatsPromise,
        recentActivityPromise,
    ]);

    const safetyScore = hasCoords ? calculateSafetyScore(nearbyIncidents) : null;

    return {
        safetyScore,
        quickStats: {
            activeNearby: parseInt(activeNearby.count),
            resolvedThisWeek: parseInt(resolvedThisWeek.count),
        },
        trendingCategories: trendingWithChange || [],
        userStats: {
            totalReports: parseInt(userStats.totalReports || 0),
            verifiedReports: parseInt(userStats.verifiedReports || 0),
            resolvedReports: parseInt(userStats.resolvedReports || 0),
            pendingReports: parseInt(userStats.pendingReports || 0),
        },
        recentActivity: recentActivity || [],
    };
}

/**
 * Get detailed safety statistics for a specific area (Public/Shared)
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} radius - in km
 * @returns {Promise<Object>} Area safety details
 */
async function getAreaSafetyStats(latitude, longitude, radius = 5) {
    // Calculate incidents within radius
    const incidents = await db.manyOrNone(`
    SELECT i.incident_id, i.title, i.category, i.severity, i.created_at,
           ST_Distance(
             i.location,
             ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography
           ) / 1000 as distance_km
    FROM incidents i
    WHERE i.is_draft = FALSE
      AND ST_DWithin(
        i.location,
        ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography,
        $3::float * 1000
      )
    ORDER BY distance_km ASC
    LIMIT 50
  `, [longitude, latitude, radius]);

    // Calculate safety score
    // We reuse the pure function logic here!
    const scoreData = calculateSafetyScore(incidents);

    // Aggregate category counts
    const categoryCounts = {};
    incidents.forEach(incident => {
        categoryCounts[incident.category] = (categoryCounts[incident.category] || 0) + 1;
    });

    return {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseFloat(radius),
        safetyScore: scoreData.score,
        safetyLabel: scoreData.label,             // Added structured data
        safetyDescription: scoreData.description, // Added structured data
        totalIncidents: incidents.length,
        incidents: incidents,
        categories: categoryCounts,
    };
}

module.exports = {
    getModeratorStats,
    getUserDashboardStats,
    getAreaSafetyStats,
    calculateSafetyScore, // Exposed for testing
};
