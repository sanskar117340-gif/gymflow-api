const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { WorkoutPlan, WorkoutDay, WorkoutDayExercise, Exercise, User } = require('../models');
const { authenticate, requireTier } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /workouts — my plans
router.get('/', authenticate, async (req, res) => {
  const plans = await WorkoutPlan.findAll({
    where: { user_id: req.user.id, is_active: true },
    include: [{ model: WorkoutDay, as: 'days', include: [{ model: WorkoutDayExercise, as: 'exercises', include: [{ model: Exercise, as: 'exercise' }] }] }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ plans });
});

// GET /workouts/public — browse public plans
router.get('/public', async (req, res) => {
  const { page = 1, limit = 20, goal, difficulty } = req.query;
  const where = { is_public: true, is_active: true };
  if (goal) where.goal = goal;
  if (difficulty) where.difficulty = difficulty;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const { count, rows } = await WorkoutPlan.findAndCountAll({
    where, limit: Math.min(parseInt(limit), 50), offset,
    include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'username'] }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ plans: rows, pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) } });
});

// GET /workouts/:id
router.get('/:id', authenticate, async (req, res) => {
  const plan = await WorkoutPlan.findOne({
    where: { id: req.params.id },
    include: [{ model: WorkoutDay, as: 'days', include: [{ model: WorkoutDayExercise, as: 'exercises', include: [{ model: Exercise, as: 'exercise' }] }] }],
  });
  if (!plan) throw createError('Plan not found', 404);
  if (plan.user_id !== req.user.id && !plan.is_public) throw createError('Access denied', 403);
  res.json({ plan });
});

// POST /workouts — create plan
router.post('/', authenticate, [
  body('name').notEmpty().trim(),
], validate, async (req, res) => {
  // Free users limited to 3 plans
  if (req.user.subscription_tier === 'free') {
    const count = await WorkoutPlan.count({ where: { user_id: req.user.id, is_active: true } });
    if (count >= 3) throw createError('Free plan limited to 3 workout plans. Upgrade to Pro for unlimited.', 403);
  }

  const { name, description, goal, difficulty, days_per_week, is_public, tags, days } = req.body;
  const plan = await WorkoutPlan.create({
    user_id: req.user.id, name, description, goal, difficulty,
    days_per_week: days_per_week || 4, is_public: is_public || false, tags: tags || [],
  });

  if (days && Array.isArray(days)) {
    for (const day of days) {
      const workoutDay = await WorkoutDay.create({ plan_id: plan.id, ...day });
      if (day.exercises) {
        for (const ex of day.exercises) {
          await WorkoutDayExercise.create({ day_id: workoutDay.id, ...ex });
        }
      }
    }
  }

  const full = await WorkoutPlan.findByPk(plan.id, {
    include: [{ model: WorkoutDay, as: 'days', include: [{ model: WorkoutDayExercise, as: 'exercises' }] }],
  });
  res.status(201).json({ plan: full });
});

// PUT /workouts/:id — update plan
router.put('/:id', authenticate, async (req, res) => {
  const plan = await WorkoutPlan.findByPk(req.params.id);
  if (!plan) throw createError('Plan not found', 404);
  if (plan.user_id !== req.user.id) throw createError('Access denied', 403);

  const allowed = ['name', 'description', 'goal', 'difficulty', 'days_per_week', 'is_public', 'tags', 'thumbnail_url'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  await plan.update(updates);
  res.json({ plan });
});

// DELETE /workouts/:id — soft delete
router.delete('/:id', authenticate, async (req, res) => {
  const plan = await WorkoutPlan.findByPk(req.params.id);
  if (!plan) throw createError('Plan not found', 404);
  if (plan.user_id !== req.user.id) throw createError('Access denied', 403);
  await plan.update({ is_active: false });
  res.json({ message: 'Plan deleted' });
});

module.exports = router;
