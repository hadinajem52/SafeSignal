const express = require('express');
const authenticateToken = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

/**
 * @route   GET /api/stats/moderator/dashboard
 * @desc    Get dashboard statistics for moderators
 * @access  Private
 */
router.get('/moderator/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get total incident counts
    const incidentStats = await db.one(`
      SELECT 
        COUNT(*) as totalIncidents,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pendingReports,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verifiedReports,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejectedReports
      FROM incidents
      WHERE is_draft = FALSE
    `);

    // Get user statistics
    const userStats = await db.one(`
      SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN is_suspended = FALSE THEN 1 ELSE 0 END) as activeUsers,
        SUM(CASE WHEN is_suspended = TRUE THEN 1 ELSE 0 END) as suspendedUsers
      FROM users
    `);

    // Get recent incidents
    const recentIncidents = await db.manyOrNone(`
      SELECT 
        incident_id, title, status, category, severity, 
        created_at, username, location_name
      FROM incidents i
      JOIN users u ON i.reporter_id = u.user_id
      WHERE i.is_draft = FALSE
      ORDER BY i.created_at DESC
      LIMIT 4
    `);

    res.json({
      status: 'OK',
      data: {
        totalIncidents: parseInt(incidentStats.totalIncidents || 0),
        pendingReports: parseInt(incidentStats.pendingReports || 0),
        verifiedReports: parseInt(incidentStats.verifiedReports || 0),
        rejectedReports: parseInt(incidentStats.rejectedReports || 0),
        totalUsers: parseInt(userStats.totalUsers || 0),
        activeUsers: parseInt(userStats.activeUsers || 0),
        suspendedUsers: parseInt(userStats.suspendedUsers || 0),
        recentIncidents: recentIncidents || [],
      },
    });
  } catch (error) {
    console.error('Error fetching moderator dashboard stats:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to fetch moderator dashboard statistics',
    });
  }
});

/**
 * @route   GET /api/stats/dashboard
 * @desc    Get dashboard statistics for mobile app users
 * @access  Private
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { latitude, longitude, radius = 5 } = req.query;

    // Get safety score for the area
    let safetyScore = null;
    if (latitude && longitude) {
      const incidents = await db.manyOrNone(`
        SELECT severity, created_at
        FROM incidents i
        WHERE i.is_draft = FALSE
          AND ST_Distance(
            ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography,
            ST_SetSRID(ST_Point(i.longitude::float, i.latitude::float), 4326)::geography
          ) / 1000 <= $3::float
      `, [longitude, latitude, radius]);

      const severityScores = {
        low: 5,
        medium: 15,
        high: 35,
        critical: 60,
      };

      let totalScore = 0;
      incidents.forEach(incident => {
        totalScore += severityScores[incident.severity] || 0;
      });

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

      safetyScore = {
        score,
        label,
        description,
      };
    }

    // Get active incidents nearby (last 7 days)
    const activeNearby = await db.one(`
      SELECT COUNT(*) as count
      FROM incidents
      WHERE is_draft = FALSE
        AND status = 'verified'
        AND created_at >= NOW() - INTERVAL '7 days'
        ${latitude && longitude ? `AND ST_Distance(
          ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography,
          ST_SetSRID(ST_Point(longitude::float, latitude::float), 4326)::geography
        ) / 1000 <= $3::float` : ''}
    `, latitude && longitude ? [longitude, latitude, radius] : []);

    // Get resolved incidents this week
    const resolvedThisWeek = await db.one(`
      SELECT COUNT(*) as count
      FROM incidents
      WHERE is_draft = FALSE
        AND status = 'resolved'
        AND created_at >= NOW() - INTERVAL '7 days'
    `);

    // Get trending categories (this week)
    const trendingCategories = await db.manyOrNone(`
      SELECT category, COUNT(*) as count
      FROM incidents
      WHERE is_draft = FALSE
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `);

    // Calculate percentage change for trending categories
    const trendingWithChange = await Promise.all(
      (trendingCategories || []).map(async (cat) => {
        const prevWeek = await db.one(`
          SELECT COUNT(*) as count
          FROM incidents
          WHERE is_draft = FALSE
            AND category = $1
            AND created_at >= NOW() - INTERVAL '14 days'
            AND created_at < NOW() - INTERVAL '7 days'
        `, [cat.category]);

        const change = prevWeek.count > 0 
          ? Math.round(((cat.count - prevWeek.count) / prevWeek.count) * 100)
          : (cat.count > 0 ? 100 : 0);

        return {
          category: cat.category,
          count: parseInt(cat.count),
          changePercentage: change,
        };
      })
    );

    // Get user's contribution stats
    const userStats = await db.one(`
      SELECT 
        COUNT(*) as totalReports,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verifiedReports,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolvedReports,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pendingReports
      FROM incidents
      WHERE reporter_id = $1 AND is_draft = FALSE
    `, [userId]);

    // Get recent activity for the user
    const recentActivity = await db.manyOrNone(`
      SELECT incident_id, title as incidentTitle, category as type, created_at as timestamp
      FROM incidents
      WHERE reporter_id = $1 AND is_draft = FALSE
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId]);

    res.json({
      status: 'SUCCESS',
      data: {
        safetyScore,
        quickStats: {
          activeNearby: parseInt(activeNearby.count),
          resolvedThisWeek: parseInt(resolvedThisWeek.count),
        },
        trendingCategories: trendingWithChange,
        userStats: {
          totalReports: parseInt(userStats.totalReports || 0),
          verifiedReports: parseInt(userStats.verifiedReports || 0),
          resolvedReports: parseInt(userStats.resolvedReports || 0),
          pendingReports: parseInt(userStats.pendingReports || 0),
        },
        recentActivity: recentActivity || [],
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to fetch dashboard statistics',
    });
  }
});

/**
 * @route   GET /api/stats/area-safety
 * @desc    Get safety statistics for a specific area
 * @access  Public
 */
router.get('/area-safety', async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Latitude and longitude are required',
      });
    }

    // Calculate incidents within radius
    const incidents = await db.manyOrNone(`
      SELECT i.incident_id, i.title, i.category, i.severity, i.created_at,
             ST_Distance(
               ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography,
               ST_SetSRID(ST_Point(i.longitude::float, i.latitude::float), 4326)::geography
             ) / 1000 as distance_km
      FROM incidents i
      WHERE i.is_draft = FALSE
        AND ST_Distance(
          ST_SetSRID(ST_Point($1::float, $2::float), 4326)::geography,
          ST_SetSRID(ST_Point(i.longitude::float, i.latitude::float), 4326)::geography
        ) / 1000 <= $3::float
      ORDER BY distance_km ASC
      LIMIT 50
    `, [longitude, latitude, radius]);

    // Calculate safety score based on incidents
    const severityScores = {
      low: 10,
      medium: 20,
      high: 40,
      critical: 60,
    };

    let totalScore = 0;
    const categoryCounts = {};

    incidents.forEach(incident => {
      totalScore += severityScores[incident.severity] || 0;
      categoryCounts[incident.category] = (categoryCounts[incident.category] || 0) + 1;
    });

    // Normalize score to 0-100 (100 = safest, 0 = least safe)
    const safetyScore = Math.max(0, 100 - Math.min(100, totalScore / incidents.length || 0));

    res.json({
      status: 'OK',
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseFloat(radius),
        safetyScore: Math.round(safetyScore),
        totalIncidents: incidents.length,
        incidents: incidents,
        categories: categoryCounts,
      },
    });
  } catch (error) {
    console.error('Error calculating area safety:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to calculate area safety',
    });
  }
});

module.exports = router;
