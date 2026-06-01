const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { User } = require('../models');
const { signAccessToken, signRefreshToken, verifyRefreshToken, blacklistToken } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { authenticate } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('first_name').notEmpty().trim(),
  body('last_name').notEmpty().trim(),
], validate, async (req, res) => {
  const { email, password, first_name, last_name, username } = req.body;
  const existing = await User.findOne({ where: { email } });
  if (existing) throw createError('Email already registered', 409);

  const verifyToken = crypto.randomBytes(32).toString('hex');
  const user = await User.create({
    email, password_hash: password, first_name, last_name,
    username: username || null,
    email_verify_token: verifyToken,
  });

  try { await sendVerificationEmail(user, verifyToken); } catch (_) {}

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });

  res.status(201).json({ user: user.toPublicJSON(), accessToken, refreshToken });
});

// POST /login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user || !(await user.comparePassword(password))) {
    throw createError('Invalid email or password', 401);
  }
  if (!user.is_active) throw createError('Account is deactivated', 403);

  await user.update({ last_login_at: new Date() });
  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });

  res.json({ user: user.toPublicJSON(), accessToken, refreshToken });
});

// POST /refresh
router.post('/refresh', async (req, res) => {
  const token = req.headers['x-refresh-token'] || req.body.refreshToken;
  if (!token) throw createError('Refresh token required', 401);

  const decoded = verifyRefreshToken(token);
  const user = await User.findByPk(decoded.userId);
  if (!user || !user.is_active) throw createError('User not found', 401);

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  res.json({ accessToken });
});

// POST /logout
router.post('/logout', authenticate, async (req, res) => {
  await blacklistToken(req.token, 900); // 15 min TTL matches access token
  res.json({ message: 'Logged out successfully' });
});

// GET /me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

// GET /verify-email/:token
router.get('/verify-email/:token', async (req, res) => {
  const user = await User.findOne({ where: { email_verify_token: req.params.token } });
  if (!user) throw createError('Invalid or expired verification token', 400);
  await user.update({ is_email_verified: true, email_verify_token: null });
  res.json({ message: 'Email verified successfully' });
});

// POST /forgot-password
router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], validate, async (req, res) => {
  const user = await User.findOne({ where: { email: req.body.email } });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour
    await user.update({ password_reset_token: token, password_reset_expires: expires });
    try { await sendPasswordResetEmail(user, token); } catch (_) {}
  }
  // Always return success to prevent email enumeration
  res.json({ message: 'If that email exists, a reset link has been sent' });
});

// POST /reset-password/:token
router.post('/reset-password/:token', [body('password').isLength({ min: 8 })], validate, async (req, res) => {
  const user = await User.findOne({ where: { password_reset_token: req.params.token } });
  if (!user || user.password_reset_expires < new Date()) {
    throw createError('Invalid or expired reset token', 400);
  }
  const bcrypt = require('bcryptjs');
  const hashed = await bcrypt.hash(req.body.password, 12);
  await user.update({ password_hash: hashed, password_reset_token: null, password_reset_expires: null });
  res.json({ message: 'Password reset successfully' });
});

module.exports = router;
