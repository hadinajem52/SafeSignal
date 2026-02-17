/**
 * Authentication Service
 * Handles all authentication business logic: login, registration, token management.
 * Routes should only handle HTTP concerns.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const ServiceError = require('../utils/ServiceError');
const { emitToRoles } = require('../utils/socketService');

// JWT configuration - centralized here, not in routes
const JWT_SECRET = process.env.JWT_SECRET || 'safesignal-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_SALT_ROUNDS = 12;

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object with user_id, email, role
 * @returns {string} JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Format user data for API response (strips sensitive fields)
 * @param {Object} user - Raw user from database
 * @returns {Object} Safe user object for response
 */
function formatUserResponse(user) {
  return {
    userId: user.user_id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

/**
 * Login a user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's plain text password
 * @returns {Promise<Object>} Object containing token and user data
 * @throws {ServiceError} If credentials are invalid
 */
async function login(email, password) {
  // Find user by email
  const user = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);

  if (!user) {
    throw ServiceError.unauthorized('Invalid credentials');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw ServiceError.unauthorized('Invalid credentials');
  }

  if (user.is_suspended) {
    throw ServiceError.forbidden('Account is suspended');
  }

  const isStaffRole = ['moderator', 'law_enforcement'].includes(user.role);
  if (isStaffRole && !user.is_verified) {
    throw ServiceError.forbidden('Account pending admin approval');
  }

  // Generate token and return
  const token = generateToken(user);

  return {
    token,
    user: formatUserResponse(user),
  };
}

/**
 * Register a new user
 * @param {string} username - Desired username
 * @param {string} email - User's email
 * @param {string} password - User's plain text password
 * @param {string} [requestedRole='citizen'] - Desired role from registration form
 * @returns {Promise<Object>} Created user data
 * @throws {ServiceError} If user already exists
 */
async function register(username, email, password, requestedRole = 'citizen') {
  // Check if user already exists
  const existingUser = await db.oneOrNone(
    'SELECT user_id FROM users WHERE email = $1 OR username = $2',
    [email, username]
  );

  if (existingUser) {
    throw ServiceError.conflict('User already exists');
  }

  const allowedRequestedRoles = ['citizen', 'moderator', 'law_enforcement'];
  const normalizedRequestedRole = allowedRequestedRoles.includes(requestedRole)
    ? requestedRole
    : 'citizen';
  const requiresAdminApproval = ['moderator', 'law_enforcement'].includes(normalizedRequestedRole);

  // Hash password
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user
  const newUser = await db.one(
    `INSERT INTO users (username, email, password_hash, role, is_verified)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING user_id, username, email, role`,
    [
      username,
      email,
      passwordHash,
      normalizedRequestedRole,
      !requiresAdminApproval,
    ]
  );

  if (requiresAdminApproval) {
    emitToRoles('admin', 'staff_application:new', {
      userId: newUser.user_id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      appliedAt: new Date().toISOString(),
    });
  }

  return formatUserResponse(newUser);
}

/**
 * Handle Google OAuth sign-in (creates user if doesn't exist)
 * @param {string} idToken - Google ID token (for future verification)
 * @param {string} email - User's email from Google
 * @param {string} name - User's name from Google
 * @returns {Promise<Object>} Object containing token and user data
 * @throws {ServiceError} If sign-in fails
 */
async function googleLogin(idToken, email, name) {
  if (!idToken || !email) {
    throw ServiceError.badRequest('idToken and email are required');
  }

  // Check if user exists
  let user = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);

  if (!user) {
    // Create new user from Google sign-in
    const username = name || email.split('@')[0];

    try {
      user = await db.one(
        `INSERT INTO users (username, email, role, is_verified, created_at)
         VALUES ($1, $2, 'citizen', TRUE, NOW())
         RETURNING user_id, username, email, role`,
        [username, email]
      );
    } catch (dbError) {
      // Handle race condition: user was created between check and insert
      if (dbError.message.includes('duplicate key')) {
        user = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);
        if (!user) {
          throw new ServiceError('Failed to create or retrieve user', 500, 'DB_ERROR');
        }
      } else {
        throw dbError;
      }
    }
  }

  if (user.is_suspended) {
    throw ServiceError.forbidden('Account is suspended');
  }

  const isStaffRole = ['moderator', 'law_enforcement'].includes(user.role);
  if (isStaffRole && !user.is_verified) {
    throw ServiceError.forbidden('Account pending admin approval');
  }

  // Generate token and return
  const token = generateToken(user);

  return {
    token,
    user: formatUserResponse(user),
  };
}

/**
 * Get current user's profile by ID
 * @param {number} userId - User's ID from token
 * @returns {Promise<Object>} User profile data
 * @throws {ServiceError} If user not found
 */
async function getCurrentUser(userId) {
  const user = await db.oneOrNone(
    'SELECT user_id, username, email, role, is_verified, created_at FROM users WHERE user_id = $1',
    [userId]
  );

  if (!user) {
    throw ServiceError.notFound('User');
  }

  return {
    userId: user.user_id,
    username: user.username,
    email: user.email,
    role: user.role,
    isVerified: user.is_verified,
    createdAt: user.created_at,
  };
}

module.exports = {
  login,
  register,
  googleLogin,
  getCurrentUser,
  // Expose for testing purposes
  generateToken,
};
