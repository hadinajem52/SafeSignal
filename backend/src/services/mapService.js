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
const PUBLIC_COORDINATE_PRECISION = 3;
const ACTIVE_MAP_INCIDENT_STATUSES = ['verified', 'published', 'dispatched', 'on_scene', 'investigating'];

const toPublicCoordinate = (value) => {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return Number(parsed.toFixed(PUBLIC_COORDINATE_PRECISION));
};

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
 * Active map incidents expose category and coarse location only.
 * 
 * @param {Object} filters - Filter options
 * @param {string} filters.timeframe - Time range (24h, 7d, 30d, 90d)
 * @param {string} filters.category - Incident category
 * @param {number} filters.ne_lat - Northeast latitude (bounding box)
 * @param {number} filters.ne_lng - Northeast longitude (bounding box)
 * @param {number} filters.sw_lat - Southwest latitude (bounding box)
 * @param {number} filters.sw_lng - Southwest longitude (bounding box)
 * @param {boolean} filters.include_constellation - Include public constellation confidence aggregates
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
    include_constellation = false,
  } = filters;

  // Validate timeframe
  if (!VALID_TIMEFRAMES.includes(timeframe)) {
    throw new ServiceError('Invalid timeframe', 400, 'INVALID_TIMEFRAME');
  }

  const startDate = calculateStartDate(timeframe);

  const constellationSelect = include_constellation
    ? `,
      c.confidence_state AS constellation_confidence_state,
      c.confidence_score AS constellation_confidence_score,
      c.supporting_signals AS constellation_supporting_signals`
    : '';
  const constellationJoin = include_constellation
    ? `
    LEFT JOIN LATERAL (
      SELECT confidence_state, confidence_score, supporting_signals
      FROM incident_constellations c
      WHERE c.incident_id = incidents.incident_id
        AND c.status = 'active'
        AND c.status != 'flagged'
        AND c.expires_at > NOW()
      ORDER BY c.created_at DESC
      LIMIT 1
    ) c ON TRUE`
    : '';

  // Build query for active-map display.
  let query = `
    SELECT 
      incidents.incident_id,
      incidents.category,
      incidents.latitude,
      incidents.longitude,
      incidents.incident_date
      ${constellationSelect}
    FROM incidents
    ${constellationJoin}
    WHERE incidents.status = ANY($2::text[])
      AND incidents.incident_date >= $1
      AND incidents.is_draft = false
  `;

  const params = [startDate, ACTIVE_MAP_INCIDENT_STATUSES];
  let paramIndex = 3;

  // Add bounding box filter if provided
  if (
    ne_lat !== undefined && ne_lat !== null &&
    ne_lng !== undefined && ne_lng !== null &&
    sw_lat !== undefined && sw_lat !== null &&
    sw_lng !== undefined && sw_lng !== null
  ) {
    query += ` AND incidents.latitude BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
    query += ` AND incidents.longitude BETWEEN $${paramIndex + 2} AND $${paramIndex + 3}`;
    params.push(parseFloat(sw_lat), parseFloat(ne_lat), parseFloat(sw_lng), parseFloat(ne_lng));
    paramIndex += 4;
  }

  // Add category filter if provided
  if (category && category !== 'all') {
    query += ` AND incidents.category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  query += ` ORDER BY incidents.incident_date DESC LIMIT 500`;

  try {
    const result = await db.any(query, params);

    // Format incidents for map display (privacy-safe)
    const incidents = result.map((incident) => {
      const publicIncident = {
        id: incident.incident_id,
        category: incident.category,
        location: {
          latitude: toPublicCoordinate(incident.latitude),
          longitude: toPublicCoordinate(incident.longitude),
        },
        timestamp: incident.incident_date,
      };

      if (include_constellation && incident.constellation_confidence_state) {
        publicIncident.constellation = {
          confidenceState: incident.constellation_confidence_state,
          confidenceScore: incident.constellation_confidence_score === null
            ? null
            : Number(incident.constellation_confidence_score),
          supportingSignals: incident.constellation_supporting_signals || 0,
        };
      }

      return publicIncident;
    });

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
