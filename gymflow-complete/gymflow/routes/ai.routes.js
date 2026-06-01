const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const { AIConversation, WorkoutSession, WorkoutPlan } = require('../models');
const { authenticate, requireTier } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert AI fitness coach for GymFlow AI. You help users with:
- Personalized workout planning and programming
- Exercise form and technique guidance
- Recovery, nutrition, and performance tips
- Motivation and goal setting

Be concise, evidence-based, and encouraging. Always consider the user's fitness level and goals.`;

// POST /ai/chat
router.post('/chat', authenticate, requireTier('pro', 'elite'), async (req, res) => {
  const { message, conversation_id } = req.body;
  if (!message) throw createError('Message is required', 400);

  let conversation = conversation_id
    ? await AIConversation.findOne({ where: { id: conversation_id, user_id: req.user.id } })
    : null;

  if (!conversation) {
    conversation = await AIConversation.create({
      user_id: req.user.id,
      context_type: req.body.context_type || 'general',
      messages: [],
    });
  }

  const messages = [...(conversation.messages || []), { role: 'user', content: message }];

  const userContext = `User profile: ${req.user.first_name}, fitness level: ${req.user.fitness_level}, goals: ${(req.user.fitness_goals || []).join(', ')}, tier: ${req.user.subscription_tier}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `${SYSTEM_PROMPT}\n\n${userContext}`,
    messages,
  });

  const assistantMessage = response.content[0].text;
  const updatedMessages = [...messages, { role: 'assistant', content: assistantMessage }];

  await conversation.update({
    messages: updatedMessages.slice(-20), // keep last 20 messages
    token_count: (conversation.token_count || 0) + response.usage.input_tokens + response.usage.output_tokens,
  });

  res.json({ reply: assistantMessage, conversation_id: conversation.id });
});

// POST /ai/generate-plan
router.post('/generate-plan', authenticate, requireTier('pro', 'elite'), async (req, res) => {
  const { goal, days_per_week, duration_weeks, equipment, fitness_level, notes } = req.body;

  const prompt = `Generate a detailed ${duration_weeks || 8}-week workout plan for:
- Goal: ${goal || 'general fitness'}
- Days per week: ${days_per_week || 4}
- Fitness level: ${fitness_level || req.user.fitness_level}
- Available equipment: ${(equipment || ['barbell', 'dumbbells', 'cables']).join(', ')}
- Special notes: ${notes || 'none'}

Return a JSON object with this structure:
{
  "name": "Plan Name",
  "description": "Plan description",
  "goal": "strength|hypertrophy|endurance|weight_loss|athletic|general_fitness",
  "difficulty": "beginner|intermediate|advanced",
  "days_per_week": number,
  "days": [
    {
      "name": "Day 1 - Chest & Triceps",
      "day_number": 1,
      "focus": "Push",
      "exercises": [
        {
          "name": "Bench Press",
          "sets": 4,
          "target_reps_min": 6,
          "target_reps_max": 8,
          "rest_seconds": 120,
          "notes": "Focus on controlled descent"
        }
      ]
    }
  ]
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  let plan;
  try {
    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    plan = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    throw createError('Failed to parse AI response. Please try again.', 500);
  }

  res.json({ plan });
});

// GET /ai/conversations
router.get('/conversations', authenticate, requireTier('pro', 'elite'), async (req, res) => {
  const conversations = await AIConversation.findAll({
    where: { user_id: req.user.id },
    attributes: ['id', 'context_type', 'token_count', 'createdAt', 'updatedAt'],
    order: [['updatedAt', 'DESC']],
  });
  res.json({ conversations });
});

// DELETE /ai/conversations/:id
router.delete('/conversations/:id', authenticate, async (req, res) => {
  const conv = await AIConversation.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!conv) throw createError('Conversation not found', 404);
  await conv.destroy();
  res.json({ message: 'Conversation deleted' });
});

module.exports = router;
