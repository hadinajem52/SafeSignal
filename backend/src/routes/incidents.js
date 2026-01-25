const express = require('express');
const { body, validationResult, param } = require('express-validator');
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/incidents
 * @desc    Create a new incident report
 * @access  Private
 */
router.post(
  '/',
  authenticateToken,
  [
    body('title').trim().isLength({ min: 5, max: 255 }),
    body('description').trim().isLength({ min: 10, max: 5000 }),
    body('category').isIn([
      'theft',
      'assault',
      'vandalism',
      'suspicious_activity',
      'traffic_incident',
      'noise_complaint',
      'fire',
      'medical_emergency',
      'hazard',
      'other',
    ]),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('severity').isIn(['low', 'medium', 'high', 'critical']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'ERROR',
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const {
        title,
        description,
        category,
        latitude,
        longitude,
        locationName,
        incidentDate,
        severity,
        isAnonymous,
        isDraft,
        photoUrls,
      } = req.body;

      const incident = await db.one(
        `INSERT INTO incidents (
          reporter_id, title, description, category, latitude, longitude,
          location_name, incident_date, severity, is_anonymous, is_draft, photo_urls, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          req.user.userId,
          title,
          description,
          category,
          latitude,
          longitude,
          locationName || null,
          incidentDate || new Date(),
          severity,
          isAnonymous || false,
          isDraft || false,
          photoUrls || null,
          isDraft ? 'draft' : 'submitted',
        ]
      );

      res.status(201).json({
        status: 'OK',
        message: 'Incident created successfully',
        data: incident,
      });
    } catch (error) {
      console.error('Error creating incident:', error);
      res.status(500).json({
        status: 'ERROR',
        message: 'Failed to create incident',
      });
    }
  }
);

/**
 * @route   GET /api/incidents
 * @desc    Get all incidents with optional filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { category, status, severity, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT i.*, u.username, u.email 
      FROM incidents i
      JOIN users u ON i.reporter_id = u.user_id
      WHERE i.is_draft = FALSE
    `;
    const params = [];
    let paramCount = 1;

    if (category) {
      query += ` AND i.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (status) {
      query += ` AND i.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (severity) {
      query += ` AND i.severity = $${paramCount}`;
      params.push(severity);
      paramCount++;
    }

    query += ` ORDER BY i.incident_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const incidents = await db.manyOrNone(query, params);

    res.json({
      status: 'OK',
      data: incidents,
      count: incidents.length,
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to fetch incidents',
    });
  }
});

/**
 * @route   GET /api/incidents/:id
 * @desc    Get incident by ID
 * @access  Public
 */
router.get('/:id', [param('id').isInt()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Invalid incident ID',
      });
    }

    const incident = await db.oneOrNone(
      `SELECT i.*, u.username, u.email FROM incidents i
       JOIN users u ON i.reporter_id = u.user_id
       WHERE i.incident_id = $1`,
      [req.params.id]
    );

    if (!incident) {
      return res.status(404).json({
        status: 'ERROR',
        message: 'Incident not found',
      });
    }

    res.json({
      status: 'OK',
      data: incident,
    });
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to fetch incident',
    });
  }
});

/**
 * @route   GET /api/incidents/user/:userId
 * @desc    Get incidents by user ID
 * @access  Public
 */
router.get('/user/:userId', [param('userId').isInt()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Invalid user ID',
      });
    }

    const incidents = await db.manyOrNone(
      `SELECT * FROM incidents WHERE reporter_id = $1 ORDER BY incident_date DESC`,
      [req.params.userId]
    );

    res.json({
      status: 'OK',
      data: incidents,
      count: incidents.length,
    });
  } catch (error) {
    console.error('Error fetching user incidents:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to fetch user incidents',
    });
  }
});

/**
 * @route   PATCH /api/incidents/:id
 * @desc    Update an incident
 * @access  Private
 */
router.patch(
  '/:id',
  authenticateToken,
  [param('id').isInt()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'ERROR',
          message: 'Invalid incident ID',
        });
      }

      const incident = await db.oneOrNone(
        'SELECT * FROM incidents WHERE incident_id = $1',
        [req.params.id]
      );

      if (!incident) {
        return res.status(404).json({
          status: 'ERROR',
          message: 'Incident not found',
        });
      }

      // Check ownership or admin role
      if (incident.reporter_id !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'ERROR',
          message: 'Unauthorized to update this incident',
        });
      }

      const { title, description, category, severity, status } = req.body;

      const updatedIncident = await db.one(
        `UPDATE incidents 
         SET title = COALESCE($2, title),
             description = COALESCE($3, description),
             category = COALESCE($4, category),
             severity = COALESCE($5, severity),
             status = COALESCE($6, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE incident_id = $1
         RETURNING *`,
        [req.params.id, title, description, category, severity, status]
      );

      res.json({
        status: 'OK',
        message: 'Incident updated successfully',
        data: updatedIncident,
      });
    } catch (error) {
      console.error('Error updating incident:', error);
      res.status(500).json({
        status: 'ERROR',
        message: 'Failed to update incident',
      });
    }
  }
);

/**
 * @route   DELETE /api/incidents/:id
 * @desc    Delete an incident
 * @access  Private
 */
router.delete('/:id', authenticateToken, [param('id').isInt()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Invalid incident ID',
      });
    }

    const incident = await db.oneOrNone(
      'SELECT * FROM incidents WHERE incident_id = $1',
      [req.params.id]
    );

    if (!incident) {
      return res.status(404).json({
        status: 'ERROR',
        message: 'Incident not found',
      });
    }

    // Check ownership or admin role
    if (incident.reporter_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'ERROR',
        message: 'Unauthorized to delete this incident',
      });
    }

    await db.none('DELETE FROM incidents WHERE incident_id = $1', [req.params.id]);

    res.json({
      status: 'OK',
      message: 'Incident deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting incident:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to delete incident',
    });
  }
});

module.exports = router;
