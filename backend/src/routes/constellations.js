const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const constellationService = require('../services/constellationService');
const ServiceError = require('../utils/ServiceError');
const { LIMITS } = require('../../../constants/limits');

const router = express.Router();

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user.userId),
  message: { status: 'ERROR', message: 'Too many constellation reads' },
});

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

function handleServiceError(error, res, defaultMessage) {
  if (error instanceof ServiceError) {
    return res.status(error.statusCode).json({
      status: 'ERROR',
      message: error.message,
      code: error.code,
    });
  }

  return res.status(500).json({
    status: 'ERROR',
    message: defaultMessage,
  });
}

router.get(
  '/:id',
  authenticateToken,
  readLimiter,
  [param('id').isInt()],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const constellation = await constellationService.getConstellationForUser(
        Number(req.params.id),
        req.user.userId,
        req.user.role
      );

      if (!constellation) {
        return res.status(404).json({ status: 'ERROR', message: 'Constellation not found' });
      }

      return res.json({ status: 'OK', data: constellation });
    } catch (error) {
      return handleServiceError(error, res, 'Failed to fetch constellation');
    }
  }
);

router.post(
  '/:id/corroborate',
  authenticateToken,
  [
    param('id').isInt(),
    body('signalType').isIn([...constellationService.VALID_SIGNAL_TYPES]),
    body('note').optional({ nullable: true }).isString().isLength({ max: LIMITS.CONSTELLATION.NOTE_MAX_LENGTH }),
    body('deviceLatitude').optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
    body('deviceLongitude').optional({ nullable: true }).isFloat({ min: -180, max: 180 }),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const result = await constellationService.submitCorroboration(
        Number(req.params.id),
        req.user.userId,
        req.body
      );

      if (!result) {
        return res.status(404).json({ status: 'ERROR', message: 'Constellation not found' });
      }

      return res.status(201).json({ status: 'OK', data: result });
    } catch (error) {
      return handleServiceError(error, res, 'Failed to submit corroboration');
    }
  }
);

module.exports = router;
