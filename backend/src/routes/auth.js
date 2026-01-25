const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'safesignal-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
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

      const { email, password } = req.body;

      // Find user
      const user = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);

      if (!user) {
        return res.status(401).json({
          status: 'ERROR',
          message: 'Invalid credentials',
        });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          status: 'ERROR',
          message: 'Invalid credentials',
        });
      }

      // Generate JWT
      const token = jwt.sign(
        {
          userId: user.user_id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        status: 'OK',
        message: 'Login successful',
        data: {
          token,
          user: {
            userId: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        status: 'ERROR',
        message: 'Login failed',
      });
    }
  }
);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3, max: 50 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
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

      const { username, email, password } = req.body;

      // Check if user exists
      const existingUser = await db.oneOrNone(
        'SELECT user_id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );

      if (existingUser) {
        return res.status(409).json({
          status: 'ERROR',
          message: 'User already exists',
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash(password, salt);

      // Create user
      const newUser = await db.one(
        `INSERT INTO users (username, email, password_hash, role, is_verified)
         VALUES ($1, $2, $3, 'citizen', TRUE)
         RETURNING user_id, username, email, role`,
        [username, email, password_hash]
      );

      res.status(201).json({
        status: 'OK',
        message: 'Registration successful',
        data: newUser,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        status: 'ERROR',
        message: 'Registration failed',
      });
    }
  }
);

module.exports = router;
