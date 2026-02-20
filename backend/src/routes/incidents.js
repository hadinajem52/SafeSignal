/**
 * Incident Routes
 * Handles HTTP concerns only: request parsing, validation, and response formatting.
 * Business logic is delegated to the incidentService.
 */

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const incidentService = require('../services/incidentService');
const commentService = require('../services/commentService');
const ServiceError = require('../utils/ServiceError');
const {
  VALID_CATEGORIES,
  VALID_SEVERITIES,
  VALID_STATUSES,
  VALID_CLOSURE_OUTCOMES,
} = require('../../../constants/incident');
const { LIMITS } = require('../../../constants/limits');

const router = express.Router();

/**
 * Validation rules for incident creation
 */
const createIncidentValidation = [
  body('title').trim().isLength({ min: LIMITS.TITLE.MIN, max: LIMITS.TITLE.MAX }),
  body('description').trim().isLength({ min: LIMITS.DESCRIPTION.MIN, max: LIMITS.DESCRIPTION.MAX }),
  body('category').isIn(VALID_CATEGORIES),
  body('latitude').isFloat({ min: LIMITS.COORDINATES.LAT.MIN, max: LIMITS.COORDINATES.LAT.MAX }),
  body('longitude').isFloat({ min: LIMITS.COORDINATES.LNG.MIN, max: LIMITS.COORDINATES.LNG.MAX }),
  body('severity').isIn(VALID_SEVERITIES),
  body('enableMlClassification').optional().isBoolean(),
  body('enableMlRisk').optional().isBoolean(),
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
 * @route   GET /api/incidents/lei
 * @desc    Get incidents for law enforcement interface
 * @access  Private (Law Enforcement/Admin)
 */
router.get('/lei', authenticateToken, requireRole(['law_enforcement', 'admin']), async (req, res) => {
  try {
    const { status = 'all' } = req.query;

    if (status !== 'all' && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Invalid status filter',
      });
    }

    const incidents = await incidentService.getLEIIncidents({ status });

    res.json({
      status: 'OK',
      data: incidents,
      count: incidents.length,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch LEI incidents');
  }
});

/**
 * @route   GET /api/incidents/lei/:id
 * @desc    Get incident details for law enforcement
 * @access  Private (Law Enforcement/Admin)
 */
router.get(
  '/lei/:id',
  authenticateToken,
  requireRole(['law_enforcement', 'admin']),
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
      const data = await incidentService.getLEIIncidentById(req.params.id);

      res.json({
        status: 'OK',
        data,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to fetch LEI incident');
    }
  }
);

/**
 * @route   PATCH /api/incidents/lei/:id/status
 * @desc    Update incident status for law enforcement
 * @access  Private (Law Enforcement/Admin)
 */
router.patch(
  '/lei/:id/status',
  authenticateToken,
  requireRole(['law_enforcement', 'admin']),
  [
    param('id').isInt(),
    body('status').isString().trim().isIn(VALID_STATUSES),
    body('closure_outcome').optional().isString().trim().isIn(VALID_CLOSURE_OUTCOMES),
    body('closure_details').optional().isObject(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const updatedIncident = await incidentService.updateLEIStatus(
        req.params.id,
        req.body.status,
        req.body.closure_outcome,
        req.body.closure_details,
        req.user
      );

      res.json({
        status: 'OK',
        message: 'Incident status updated',
        data: updatedIncident,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to update LEI status');
    }
  }
);

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
  requireRole(['moderator', 'admin']),
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
      const incident = await incidentService.verifyIncident(req.params.id, req.user);
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
 * @route   GET /api/incidents/:id/dedup
 * @desc    Get dedup candidates for an incident
 * @access  Private (Moderator/Admin)
 */
router.get(
  '/:id/dedup',
  authenticateToken,
  requireRole(['moderator', 'admin']),
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
      const dedup = await incidentService.getIncidentDedupCandidates(req.params.id);
      res.json({
        status: 'OK',
        data: dedup,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to fetch dedup candidates');
    }
  }
);

/**
 * @route   GET /api/incidents/:id/ml
 * @desc    Get ML summary for an incident
 * @access  Private (Moderator/Admin)
 */
router.get(
  '/:id/ml',
  authenticateToken,
  requireRole(['moderator', 'admin']),
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
      const ml = await incidentService.getIncidentMlSummary(req.params.id);
      res.json({
        status: 'OK',
        data: ml,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to fetch ML summary');
    }
  }
);

/**
 * @route   PATCH /api/incidents/:id/category
 * @desc    Update incident category (moderation feedback)
 * @access  Private (Moderator/Admin)
 */
router.patch(
  '/:id/category',
  authenticateToken,
  requireRole(['moderator', 'admin']),
  [param('id').isInt(), body('category').isIn(VALID_CATEGORIES)],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const updatedIncident = await incidentService.updateIncidentCategoryForModeration(
        req.params.id,
        req.body.category,
        req.user
      );

      res.json({
        status: 'OK',
        message: 'Category updated',
        data: updatedIncident,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to update category');
    }
  }
);

/**
 * @route   POST /api/incidents/:id/duplicates
 * @desc    Link a duplicate incident to a canonical incident
 * @access  Private (Moderator/Admin)
 */
router.post(
  '/:id/duplicates',
  authenticateToken,
  requireRole(['moderator', 'admin']),
  [param('id').isInt(), body('duplicateIncidentId').isInt()],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const result = await incidentService.linkDuplicateIncident(
        parseInt(req.params.id),
        parseInt(req.body.duplicateIncidentId),
        req.user
      );

      res.json({
        status: 'OK',
        message: 'Duplicate linked',
        data: result,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to link duplicate');
    }
  }
);

/**
 * @route   POST /api/incidents/:id/dedup/dismiss
 * @desc    Dismiss the AI's duplicate flag — confirm the incident is distinct.
 *          Records a 'not_duplicate' verdict in report_ml for offline calibration.
 * @access  Private (Moderator/Admin)
 */
router.post(
  '/:id/dedup/dismiss',
  authenticateToken,
  requireRole(['moderator', 'admin']),
  [param('id').isInt()],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const result = await incidentService.dismissDuplicateFlag(
        parseInt(req.params.id),
        req.user
      );

      res.json({
        status: 'OK',
        message: 'Duplicate flag dismissed',
        data: result,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to dismiss duplicate flag');
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
  requireRole(['moderator', 'admin']),
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
      const incident = await incidentService.rejectIncident(req.params.id, req.user);
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

/**
 * @route   POST /api/incidents/:id/escalate
 * @desc    Escalate an incident
 * @access  Private (Moderator/Admin)
 */
router.post(
  '/:id/escalate',
  authenticateToken,
  requireRole(['moderator', 'admin']),
  [
    param('id').isInt(),
    body('reason').isString().trim().notEmpty().withMessage('Reason is required')
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const incident = await incidentService.escalateIncident(
        req.params.id, 
        req.user, 
        req.body.reason
      );
      
      res.json({
        status: 'OK',
        message: 'Incident escalated',
        data: incident,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to escalate incident');
    }
  }
);

/**
 * GET /api/incidents/:id/timeline
 * Get timeline (comments + status changes) for an incident
 * Access: Authenticated users (citizen for own incidents, staff for all)
 */
router.get(
  '/:id/timeline',
  authenticateToken,
  param('id').isInt(),
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const timeline = await commentService.getTimeline(
        parseInt(req.params.id),
        req.user.userId
      );
      
      res.json({
        status: 'OK',
        data: timeline,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to fetch timeline');
    }
  }
);

/**
 * POST /api/incidents/:id/comments
 * Post a new comment on an incident
 * Access: Authenticated users (citizen for own incidents, staff for all)
 */
router.post(
  '/:id/comments',
  authenticateToken,
  [
    param('id').isInt(),
    body('content').trim().isLength({ min: 1, max: 10000 }),
    body('isInternal').optional().isBoolean(),
    body('attachments').optional({ checkFalsy: true }).isArray(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const comment = await commentService.createComment(
        parseInt(req.params.id),
        req.user.userId,
        {
          content: req.body.content,
          isInternal: req.body.isInternal,
          attachments: req.body.attachments,
        }
      );
      
      res.status(201).json({
        status: 'OK',
        message: 'Comment posted successfully',
        data: comment,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to post comment');
    }
  }
);

module.exports = router;
