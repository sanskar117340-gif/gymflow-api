const router = require('express').Router();
const { Op } = require('sequelize');
const { Exercise } = require('../models');
const { authenticate } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

// GET /exercises — browse library
router.get('/', async (req, res) => {
  const { category, difficulty, muscle, search, page = 1, limit = 20 } = req.query;
  const where = { is_approved: true };

  if (category) where.category = category;
  if (difficulty) where.difficulty = difficulty;
  if (muscle) where.muscle_groups_primary = { [Op.contains]: [muscle] };
  if (search) where.name = { [Op.iLike]: `%${search}%` };

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const { count, rows } = await Exercise.findAndCountAll({
    where,
    limit: Math.min(parseInt(limit), 100),
    offset,
    order: [['name', 'ASC']],
  });

  res.json({
    exercises: rows,
    pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) },
  });
});

// GET /exercises/:id
router.get('/:id', async (req, res) => {
  const exercise = await Exercise.findByPk(req.params.id);
  if (!exercise) throw createError('Exercise not found', 404);
  res.json({ exercise });
});

module.exports = router;
