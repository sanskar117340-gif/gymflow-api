const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { authenticate, requireRole } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /users/me — get current user profile
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

// PATCH /users/me — update profile
router.patch('/me', authenticate, [
  body('first_name').optional().trim().notEmpty(),
  body('last_name').optional().trim().notEmpty(),
  body('username').optional().trim().isLength({ min: 3, max: 50 }),
  body('weight_kg').optional().isFloat({ min: 20, max: 500 }),
  body('height_cm').optional().isFloat({ min: 50, max: 300 }),
], validate, async (req, res) => {
  const allowed = ['first_name', 'last_name', 'username', 'bio', 'avatar_url',
    'date_of_birth', 'gender', 'weight_kg', 'height_cm', 'fitness_level',
    'fitness_goals', 'preferences'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  await req.user.update(updates);
  res.json({ user: req.user.toPublicJSON() });
});

// PATCH /users/me/password — change password
router.patch('/me/password', authenticate, [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 }),
], validate, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!(await req.user.comparePassword(current_password))) {
    throw createError('Current password is incorrect', 400);
  }
  const hashed = await bcrypt.hash(new_password, 12);
  await req.user.update({ password_hash: hashed });
  res.json({ message: 'Password updated successfully' });
});

// DELETE /users/me — deactivate account
router.delete('/me', authenticate, async (req, res) => {
  await req.user.update({ is_active: false });
  res.json({ message: 'Account deactivated' });
});

module.exports = router;
