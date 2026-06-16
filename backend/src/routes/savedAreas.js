/**
 * Saved Areas Routes
 * CRUD for user-defined watched areas.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const savedAreaService = require('../services/savedAreaService');
const ServiceError = require('../utils/ServiceError');
const { LIMITS } = require('../../../constants/limits');

const router = express.Router();

router.use(authenticateToken);

function rejectValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ status: 'ERROR', message: 'Validation failed', errors: errors.array() });
    return true;
  }
  return false;
}

function handleError(error, res, defaultMessage) {
  if (error instanceof ServiceError) {
    return res.status(error.statusCode).json({ status: 'ERROR', message: error.message, code: error.code });
  }
  console.error(`${defaultMessage}:`, error);
  return res.status(500).json({ status: 'ERROR', message: defaultMessage });
}

router.get('/', async (req, res) => {
  try {
    const areas = await savedAreaService.listAreas(req.user.userId);
    res.json({ status: 'SUCCESS', data: areas });
  } catch (error) {
    handleError(error, res, 'Failed to fetch saved areas');
  }
});

router.post(
  '/',
  [
    body('label').optional().isString().trim().isLength({ max: 100 }),
    body('latitude').isFloat({ min: LIMITS.COORDINATES.LAT.MIN, max: LIMITS.COORDINATES.LAT.MAX }),
    body('longitude').isFloat({ min: LIMITS.COORDINATES.LNG.MIN, max: LIMITS.COORDINATES.LNG.MAX }),
    body('radiusKm').optional().isFloat({ gt: 0, max: 50 }),
  ],
  async (req, res) => {
    if (rejectValidationErrors(req, res)) return;
    try {
      const area = await savedAreaService.createArea(req.user.userId, {
        label: req.body.label,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        radiusKm: req.body.radiusKm,
      });
      res.status(201).json({ status: 'SUCCESS', data: area });
    } catch (error) {
      handleError(error, res, 'Failed to save area');
    }
  }
);

router.delete('/:id', [param('id').isInt()], async (req, res) => {
  if (rejectValidationErrors(req, res)) return;
  try {
    await savedAreaService.deleteArea(req.user.userId, Number(req.params.id));
    res.json({ status: 'SUCCESS' });
  } catch (error) {
    handleError(error, res, 'Failed to delete saved area');
  }
});

module.exports = router;
