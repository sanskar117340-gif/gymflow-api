const router = require('express').Router();
const { WorkoutSession, SessionSet, Exercise, PersonalRecord, WorkoutPlan, WorkoutDay } = require('../models');
const { authenticate } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

// POST /sessions/start
router.post('/start', authenticate, async (req, res) => {
  const existing = await WorkoutSession.findOne({ where: { user_id: req.user.id, status: 'in_progress' } });
  if (existing) throw createError('You already have an active session. Complete or cancel it first.', 409);

  const session = await WorkoutSession.create({
    user_id: req.user.id,
    plan_id: req.body.plan_id || null,
    day_id: req.body.day_id || null,
    name: req.body.name || 'Workout Session',
    notes: req.body.notes || null,
  });
  res.status(201).json({ session });
});

// POST /sessions/:id/sets — log a set
router.post('/:id/sets', authenticate, async (req, res) => {
  const session = await WorkoutSession.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!session) throw createError('Session not found', 404);
  if (session.status !== 'in_progress') throw createError('Session is not active', 400);

  const set = await SessionSet.create({ session_id: session.id, ...req.body });

  // Update session totals
  const volume = (req.body.weight_kg || 0) * (req.body.reps || 0);
  await session.increment({ total_volume_kg: volume, total_sets: 1, total_reps: req.body.reps || 0 });

  // Check for personal record
  if (req.body.weight_kg && req.body.reps) {
    const pr = await PersonalRecord.findOne({
      where: { user_id: req.user.id, exercise_id: req.body.exercise_id, record_type: 'max_weight' },
    });
    if (!pr || req.body.weight_kg > pr.value) {
      await PersonalRecord.upsert({
        user_id: req.user.id, exercise_id: req.body.exercise_id,
        record_type: 'max_weight', value: req.body.weight_kg, session_id: session.id,
      });
    }
  }

  res.status(201).json({ set });
});

// POST /sessions/:id/complete
router.post('/:id/complete', authenticate, async (req, res) => {
  const session = await WorkoutSession.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!session) throw createError('Session not found', 404);
  if (session.status !== 'in_progress') throw createError('Session is not active', 400);

  const duration = Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000);
  await session.update({
    status: 'completed',
    completed_at: new Date(),
    duration_seconds: duration,
    rating: req.body.rating || null,
    mood_after: req.body.mood_after || null,
    notes: req.body.notes || session.notes,
  });
  res.json({ session });
});

// POST /sessions/:id/cancel
router.post('/:id/cancel', authenticate, async (req, res) => {
  const session = await WorkoutSession.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!session) throw createError('Session not found', 404);
  await session.update({ status: 'cancelled' });
  res.json({ message: 'Session cancelled' });
});

// GET /sessions/active
router.get('/active', authenticate, async (req, res) => {
  const session = await WorkoutSession.findOne({
    where: { user_id: req.user.id, status: 'in_progress' },
    include: [{ model: SessionSet, as: 'sets', include: [{ model: Exercise, as: 'exercise' }] }],
  });
  res.json({ session });
});

// GET /sessions/history
router.get('/history', authenticate, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const { count, rows } = await WorkoutSession.findAndCountAll({
    where: { user_id: req.user.id, status: 'completed' },
    limit: Math.min(parseInt(limit), 50), offset,
    order: [['completed_at', 'DESC']],
  });
  res.json({ sessions: rows, pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) } });
});

// GET /sessions/:id
router.get('/:id', authenticate, async (req, res) => {
  const session = await WorkoutSession.findOne({
    where: { id: req.params.id, user_id: req.user.id },
    include: [{ model: SessionSet, as: 'sets', include: [{ model: Exercise, as: 'exercise' }] }],
  });
  if (!session) throw createError('Session not found', 404);
  res.json({ session });
});

module.exports = router;
