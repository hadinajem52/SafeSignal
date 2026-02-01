const express = require('express');
const router = express.Router();
const mapService = require('../services/mapService');
const ServiceError = require('../utils/ServiceError');

/**
 * GET /api/map/incidents
 * Get incidents for map display (public, privacy-safe)
 * Returns coarse location data and verified incidents only
 */
router.get('/incidents', async (req, res) => {
  try {
    const filters = {
      ne_lat: req.query.ne_lat,
      ne_lng: req.query.ne_lng,
      sw_lat: req.query.sw_lat,
      sw_lng: req.query.sw_lng,
      category: req.query.category,
      timeframe: req.query.timeframe || '30d',
    };

    const data = await mapService.getMapIncidents(filters);

    res.json({
      status: 'SUCCESS',
      data,
    });
  } catch (error) {
    console.error('Error in GET /api/map/incidents:', error);

    if (error instanceof ServiceError) {
      return res.status(error.statusCode).json({
        status: 'ERROR',
        message: error.message,
        code: error.code,
      });
    }

    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to fetch map incidents',
    });
  }
});

module.exports = router;
