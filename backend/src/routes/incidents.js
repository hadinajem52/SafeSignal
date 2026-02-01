/**
 * Incident Routes
 * Handles HTTP concerns only: request parsing, validation, and response formatting.
 * Business logic is delegated to the incidentService.
 */

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const incidentService = require('../services/incidentService');
const ServiceError = require('../utils/ServiceError');

const router = express.Router();

/**
 * Validation rules for incident creation
 */
const createIncidentValidation = [
  body('title').trim().isLength({ min: 5, max: 255 }),
  body('description').trim().isLength({ min: 10, max: 5000 }),
  body('category').isIn(incidentService.VALID_CATEGORIES),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('severity').isIn(incidentService.VALID_SEVERITIES),
];

/**
 * Handle validation errors
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {boolean} True if there are errors
 */
function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      status: 'ERROR',
      message: 'Validation failed',
      errors: errors.array(),
    });
    return true;
  }
  return false;
}

/**
 * Handle service errors
 * @param {Error} error - The error object
 * @param {Object} res - Express response
 * @param {string} defaultMessage - Default error message
 */
function handleServiceError(error, res, defaultMessage) {
  console.error(`${defaultMessage}:`, error);

  if (error instanceof ServiceError) {
    return res.status(error.statusCode).json({
      status: 'ERROR',
      message: error.message,
      code: error.code,
    });
  }

  res.status(500).json({
    status: 'ERROR',
    message: defaultMessage,
  });
}

/**
 * @route   POST /api/incidents/submit
 * @desc    Create a new incident report (alias for POST /)
 * @access  Private
 */
router.post(
  '/submit',
  authenticateToken,
  createIncidentValidation,
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const incident = await incidentService.createIncident(
        req.body,
        req.user.userId
      );

      res.status(201).json({
        status: 'OK',
        message: 'Incident created successfully',
        data: incident,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to create incident');
    }
  }
);

/**
 * @route   POST /api/incidents
 * @desc    Create a new incident report
 * @access  Private
 */
router.post(
  '/',
  authenticateToken,
  createIncidentValidation,
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const incident = await incidentService.createIncident(
        req.body,
        req.user.userId
      );

      res.status(201).json({
        status: 'OK',
        message: 'Incident created successfully',
        data: incident,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to create incident');
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

    const incidents = await incidentService.getAllIncidents({
      category,
      status,
      severity,
      limit,
      offset,
    });

    res.json({
      status: 'OK',
      data: incidents,
      count: incidents.length,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch incidents');
  }
});

/**
 * @route   GET /api/incidents/list
 * @desc    Get current user's incidents (authenticated)
 * @access  Private
 */
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { status, isDraft, limit = 50, offset = 0 } = req.query;

    const result = await incidentService.getUserIncidents(req.user.userId, {
      status,
      isDraft,
      limit,
      offset,
    });

    res.json({
      status: 'SUCCESS',
      data: result,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch incidents');
  }
});

/**
 * @route   GET /api/incidents/:id
 * @desc    Get incident by ID
 * @access  Public
 */
router.get('/:id', [param('id').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Invalid incident ID',
    });
  }

  try {
    const incident = await incidentService.getIncidentById(req.params.id);

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
    handleServiceError(error, res, 'Failed to fetch incident');
  }
});

/**
 * @route   GET /api/incidents/user/:userId
 * @desc    Get incidents by user ID
 * @access  Public
 */
router.get('/user/:userId', [param('userId').isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Invalid user ID',
    });
  }

  try {
    const incidents = await incidentService.getIncidentsByUserId(
      req.params.userId
    );

    res.json({
      status: 'OK',
      data: incidents,
      count: incidents.length,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch user incidents');
  }
});

/**
 * @route   PUT /api/incidents/:id
 * @desc    Update an incident (full update)
 * @access  Private
 */
router.put(
  '/:id',
  authenticateToken,
  [param('id').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Invalid incident ID',
      });
    }

    try {
      const updatedIncident = await incidentService.updateIncident(
        req.params.id,
        req.body,
        req.user
      );

      res.json({
        status: 'SUCCESS',
        message: 'Incident updated successfully',
        data: {
          incident: updatedIncident,
        },
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to update incident');
    }
  }
);

/**
 * @route   PATCH /api/incidents/:id
 * @desc    Partially update an incident
 * @access  Private
 */
router.patch(
  '/:id',
  authenticateToken,
  [param('id').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Invalid incident ID',
      });
    }

    try {
      const updatedIncident = await incidentService.patchIncident(
        req.params.id,
        req.body,
        req.user
      );

      res.json({
        status: 'OK',
        message: 'Incident updated successfully',
        data: updatedIncident,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to update incident');
    }
  }
);

/**
 * @route   DELETE /api/incidents/:id
 * @desc    Delete an incident
 * @access  Private
 */
router.delete(
  '/:id',
  authenticateToken,
  [param('id').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Invalid incident ID',
      });
    }

    try {
      await incidentService.deleteIncident(req.params.id, req.user);

      res.json({
        status: 'OK',
        message: 'Incident deleted successfully',
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to delete incident');
    }
  }
);

/**
 * @route   POST /api/incidents/:id/verify
 * @desc    Verify an incident
 * @access  Private (Moderator/Admin)
 */
router.post(
  '/:id/verify',
  authenticateToken,
  [param('id').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Invalid incident ID',
      });
    }

    try {
      const incident = await incidentService.verifyIncident(req.params.id, req.user.userId);
      res.json({
        status: 'OK',
        message: 'Incident verified',
        data: incident,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to verify incident');
    }
  }
);

/**
 * @route   POST /api/incidents/:id/reject
 * @desc    Reject an incident
 * @access  Private (Moderator/Admin)
 */
router.post(
  '/:id/reject',
  authenticateToken,
  [param('id').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Invalid incident ID',
      });
    }

    try {
      const incident = await incidentService.rejectIncident(req.params.id, req.user.userId);
      res.json({
        status: 'OK',
        message: 'Incident rejected',
        data: incident,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to reject incident');
    }
  }
);

module.exports = router;
