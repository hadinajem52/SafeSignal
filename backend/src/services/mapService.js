/**
 * Map Service
 * Handles business logic for map-related operations.
 * Provides privacy-safe incident data for public map display.
 */

const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');

/**
 * Valid timeframe options
 */
const VALID_TIMEFRAMES = ['24h', '7d', '30d', '90d'];

/**
 * Calculate start date from timeframe
 */
const calculateStartDate = (timeframe) => {
  const now = new Date();
  const startDate = new Date();

  switch (timeframe) {
    case '24h':
      startDate.setHours(now.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  return startDate;
};

/**
 * Get incidents for map display
 * Only returns verified/published incidents for privacy
 * 
 * @param {Object} filters - Filter options
 * @param {string} filters.timeframe - Time range (24h, 7d, 30d, 90d)
 * @param {string} filters.category - Incident category
 * @param {number} filters.ne_lat - Northeast latitude (bounding box)
 * @param {number} filters.ne_lng - Northeast longitude (bounding box)
 * @param {number} filters.sw_lat - Southwest latitude (bounding box)
 * @param {number} filters.sw_lng - Southwest longitude (bounding box)
 * @returns {Promise<Object>} Incident data for map
 */
const getMapIncidents = async (filters) => {
  const {
    ne_lat,
    ne_lng,
    sw_lat,
    sw_lng,
    category,
    timeframe = '30d',
  } = filters;

  // Validate timeframe
  if (!VALID_TIMEFRAMES.includes(timeframe)) {
    throw new ServiceError('Invalid timeframe', 400, 'INVALID_TIMEFRAME');
  }

  const startDate = calculateStartDate(timeframe);

  // Build query - only show verified/published incidents for privacy
  let query = `
    SELECT 
      incident_id,
      title,
      category,
      severity,
      latitude,
      longitude,
      incident_date,
      status
    FROM incidents
    WHERE status IN ('verified', 'published')
      AND incident_date >= $1
      AND is_draft = false
  `;

  const params = [startDate];
  let paramIndex = 2;

  // Add bounding box filter if provided
  if (ne_lat && ne_lng && sw_lat && sw_lng) {
    query += ` AND latitude BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
    query += ` AND longitude BETWEEN $${paramIndex + 2} AND $${paramIndex + 3}`;
    params.push(parseFloat(sw_lat), parseFloat(ne_lat), parseFloat(sw_lng), parseFloat(ne_lng));
    paramIndex += 4;
  }

  // Add category filter if provided
  if (category && category !== 'all') {
    query += ` AND category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  query += ` ORDER BY incident_date DESC LIMIT 500`;

  try {
    const result = await db.query(query, params);

    // Format incidents for map display (privacy-safe)
    const incidents = result.rows.map(incident => ({
      id: incident.incident_id,
      title: incident.title,
      category: incident.category,
      severity: incident.severity,
      location: {
        latitude: parseFloat(incident.latitude),
        longitude: parseFloat(incident.longitude),
      },
      timestamp: incident.incident_date,
      status: incident.status,
    }));

    return {
      incidents,
      count: incidents.length,
      timeframe,
      region: ne_lat ? {
        northeast: { lat: parseFloat(ne_lat), lng: parseFloat(ne_lng) },
        southwest: { lat: parseFloat(sw_lat), lng: parseFloat(sw_lng) },
      } : null,
    };
  } catch (error) {
    console.error('Database error in getMapIncidents:', error);
    throw new ServiceError('Failed to fetch incidents', 500, 'DATABASE_ERROR');
  }
};

module.exports = {
  getMapIncidents,
};
