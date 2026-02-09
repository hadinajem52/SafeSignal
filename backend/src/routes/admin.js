/**
 * Admin Routes
 * Handles HTTP concerns only for admin-specific operations.
 */

const express = require('express');
const { param, query, validationResult } = require('express-validator');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const adminService = require('../services/adminService');
const ServiceError = require('../utils/ServiceError');

const router = express.Router();

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

const requireAdmin = [authenticateToken, requireRole('admin')];

router.get('/applications/pending', requireAdmin, async (req, res) => {
  try {
    const applications = await adminService.getPendingApplications();

    res.json({
      status: 'OK',
      data: applications,
      count: applications.length,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch pending applications');
  }
});

router.post(
  '/applications/:id/approve',
  [...requireAdmin, param('id').isInt({ min: 1 })],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const result = await adminService.approveApplication(parseInt(req.params.id, 10));
      res.json({
        status: 'OK',
        message: 'Application approved',
        data: result,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to approve application');
    }
  }
);

router.delete(
  '/applications/:id/reject',
  [...requireAdmin, param('id').isInt({ min: 1 })],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const result = await adminService.rejectApplication(parseInt(req.params.id, 10));
      res.json({
        status: 'OK',
        message: 'Application rejected',
        data: result,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to reject application');
    }
  }
);

router.get('/database/tables', requireAdmin, async (req, res) => {
  try {
    const tables = await adminService.getDatabaseTables();
    res.json({
      status: 'OK',
      data: tables,
      count: tables.length,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch database tables');
  }
});

router.get(
  '/database/tables/:table/rows',
  [
    ...requireAdmin,
    param('table').matches(/^[a-z_][a-z0-9_]*$/i),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const { table } = req.params;
      const { limit = 50 } = req.query;
      const result = await adminService.getTableRows(table, limit);
      res.json({
        status: 'OK',
        data: result,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to fetch table rows');
    }
  }
);

router.delete(
  '/database/tables/:table/rows/:id',
  [
    ...requireAdmin,
    param('table').matches(/^[a-z_][a-z0-9_]*$/i),
    param('id').isInt({ min: 1 }),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const result = await adminService.deleteRow(req.params.table, req.params.id);
      res.json({
        status: 'OK',
        message: 'Row deleted successfully',
        data: result,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to delete row');
    }
  }
);

router.delete(
  '/database/tables/:table',
  [...requireAdmin, param('table').matches(/^[a-z_][a-z0-9_]*$/i)],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    try {
      const result = await adminService.clearTable(req.params.table);
      res.json({
        status: 'OK',
        message: `Table ${result.tableName} cleared`,
        data: result,
      });
    } catch (error) {
      handleServiceError(error, res, 'Failed to clear table');
    }
  }
);

router.delete('/database/all', requireAdmin, async (req, res) => {
  try {
    const result = await adminService.clearAllManagedTables();
    res.json({
      status: 'OK',
      message: 'All managed tables cleared',
      data: result,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to clear managed tables');
  }
});

router.post('/reports/reset', requireAdmin, async (req, res) => {
  try {
    const result = await adminService.resetAllReports();
    res.json({
      status: 'OK',
      message: 'All reports reset to 0',
      data: result,
    });
  } catch (error) {
    handleServiceError(error, res, 'Failed to reset reports');
  }
});

module.exports = router;
