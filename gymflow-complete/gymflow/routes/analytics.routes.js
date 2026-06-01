const router = require('express').Router();
const { Op, fn, col, literal } = require('sequelize');
const { WorkoutSession, SessionSet, PersonalRecord, Exercise } = require('../models');
const { authenticate } = require('../middleware/auth');

// GET /analytics/dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  const userId = req.user.id;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalSessions, recentSessions, totalVolume, prs] = await Promise.all([
    WorkoutSession.count({ where: { user_id: userId, status: 'completed' } }),
    WorkoutSession.findAll({
      where: { user_id: userId, status: 'completed', completed_at: { [Op.gte]: thirtyDaysAgo } },
      order: [['completed_at', 'DESC']],
      limit: 5,
    }),
    WorkoutSession.sum('total_volume_kg', { where: { user_id: userId, status: 'completed' } }),
    PersonalRecord.count({ where: { user_id: userId } }),
  ]);

  // Calculate streak
  const sessions = await WorkoutSession.findAll({
    where: { user_id: userId, status: 'completed' },
    attributes: ['completed_at'],
    order: [['completed_at', 'DESC']],
    limit: 60,
  });

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = [...new Set(sessions.map(s => new Date(s.completed_at).toDateString()))];
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(dates[i]);
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    if (d.toDateString() === expected.toDateString()) streak++;
    else break;
  }

  res.json({
    total_sessions: totalSessions,
    total_volume_kg: totalVolume || 0,
    total_prs: prs,
    current_streak: streak,
    recent_sessions: recentSessions,
  });
});

// GET /analytics/volume
router.get('/volume', authenticate, async (req, res) => {
  const { period = '30d', group_by = 'week' } = req.query;
  const days = parseInt(period) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const sessions = await WorkoutSession.findAll({
    where: { user_id: req.user.id, status: 'completed', completed_at: { [Op.gte]: since } },
    attributes: ['completed_at', 'total_volume_kg', 'duration_seconds', 'total_sets'],
    order: [['completed_at', 'ASC']],
  });

  res.json({ data: sessions });
});

// GET /analytics/muscles
router.get('/muscles', authenticate, async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const sets = await SessionSet.findAll({
    include: [{
      model: WorkoutSession, as: 'session',
      where: { user_id: req.user.id, status: 'completed', completed_at: { [Op.gte]: since } },
      attributes: [],
    }, {
      model: Exercise, as: 'exercise',
      attributes: ['muscle_groups_primary'],
    }],
    attributes: ['exercise_id'],
  });

  const counts = {};
  for (const set of sets) {
    const muscles = set.exercise?.muscle_groups_primary || [];
    for (const m of muscles) {
      counts[m] = (counts[m] || 0) + 1;
    }
  }
  const data = Object.entries(counts).map(([muscle, count]) => ({ muscle, count })).sort((a, b) => b.count - a.count);
  res.json({ data });
});

// GET /analytics/prs
router.get('/prs', authenticate, async (req, res) => {
  const prs = await PersonalRecord.findAll({
    where: { user_id: req.user.id },
    include: [{ model: Exercise, as: 'exercise', attributes: ['id', 'name', 'category'] }],
    order: [['achieved_at', 'DESC']],
  });
  res.json({ prs });
});

// GET /analytics/prs/:exercise_id
router.get('/prs/:exercise_id', authenticate, async (req, res) => {
  const { record_type = '1rm' } = req.query;
  const prs = await PersonalRecord.findAll({
    where: { user_id: req.user.id, exercise_id: req.params.exercise_id, record_type },
    order: [['achieved_at', 'ASC']],
  });
  res.json({ prs });
});

module.exports = router;
