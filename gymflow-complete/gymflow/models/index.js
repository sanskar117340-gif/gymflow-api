const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

// ─── User ──────────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  first_name: { type: DataTypes.STRING(100), allowNull: false },
  last_name:  { type: DataTypes.STRING(100), allowNull: false },
  username: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: true,
  },
  avatar_url:   { type: DataTypes.TEXT, allowNull: true },
  bio:          { type: DataTypes.TEXT, allowNull: true },
  date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'non_binary', 'prefer_not_to_say'),
    allowNull: true,
  },
  weight_kg:  { type: DataTypes.FLOAT, allowNull: true },
  height_cm:  { type: DataTypes.FLOAT, allowNull: true },
  fitness_level: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'elite'),
    defaultValue: 'beginner',
  },
  fitness_goals: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  role: {
    type: DataTypes.ENUM('user', 'trainer', 'admin'),
    defaultValue: 'user',
  },
  subscription_tier: {
    type: DataTypes.ENUM('free', 'pro', 'elite'),
    defaultValue: 'free',
  },
  is_email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  email_verify_token: { type: DataTypes.STRING, allowNull: true },
  password_reset_token: { type: DataTypes.STRING, allowNull: true },
  password_reset_expires: { type: DataTypes.DATE, allowNull: true },
  last_login_at: { type: DataTypes.DATE, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  stripe_customer_id: { type: DataTypes.STRING, allowNull: true },
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      unit_system: 'imperial',
      rest_timer_default: 90,
      notifications_enabled: true,
      weekly_goal_days: 4,
    },
  },
}, {
  tableName: 'users',
  indexes: [
    { fields: ['email'] },
    { fields: ['username'] },
    { fields: ['stripe_customer_id'] },
  ],
});

User.prototype.comparePassword = async function (plainText) {
  return bcrypt.compare(plainText, this.password_hash);
};

User.prototype.toPublicJSON = function () {
  const { password_hash, email_verify_token, password_reset_token, ...pub } = this.toJSON();
  return pub;
};

User.beforeCreate(async (user) => {
  if (user.password_hash) {
    user.password_hash = await bcrypt.hash(user.password_hash, 12);
  }
});

// ─── Exercise Library ─────────────────────────────────────────────────────────
const Exercise = sequelize.define('Exercise', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, unique: true, allowNull: false },
  description: { type: DataTypes.TEXT },
  instructions: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
  category: {
    type: DataTypes.ENUM('strength', 'cardio', 'flexibility', 'balance', 'plyometric', 'sport'),
    allowNull: false,
  },
  muscle_groups_primary: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  muscle_groups_secondary: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  equipment: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    defaultValue: 'beginner',
  },
  movement_pattern: {
    type: DataTypes.ENUM('push', 'pull', 'hinge', 'squat', 'carry', 'rotation', 'gait'),
    allowNull: true,
  },
  force_type: {
    type: DataTypes.ENUM('push', 'pull', 'static', 'dynamic'),
    allowNull: true,
  },
  image_url: { type: DataTypes.TEXT, allowNull: true },
  video_url: { type: DataTypes.TEXT, allowNull: true },
  is_custom:    { type: DataTypes.BOOLEAN, defaultValue: false },
  created_by:   { type: DataTypes.UUID, allowNull: true }, // FK to User for custom exercises
  is_approved:  { type: DataTypes.BOOLEAN, defaultValue: true },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
}, {
  tableName: 'exercises',
  indexes: [
    { fields: ['slug'] },
    { fields: ['category'] },
    { fields: ['difficulty'] },
  ],
});

// ─── Workout Plan ─────────────────────────────────────────────────────────────
const WorkoutPlan = sequelize.define('WorkoutPlan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  goal: {
    type: DataTypes.ENUM('strength', 'hypertrophy', 'endurance', 'weight_loss', 'athletic', 'general_fitness'),
    allowNull: true,
  },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    defaultValue: 'intermediate',
  },
  days_per_week: { type: DataTypes.INTEGER, defaultValue: 4 },
  estimated_duration_weeks: { type: DataTypes.INTEGER, allowNull: true },
  is_ai_generated: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_public: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  tags: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  thumbnail_url: { type: DataTypes.TEXT, allowNull: true },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
}, {
  tableName: 'workout_plans',
  indexes: [{ fields: ['user_id'] }, { fields: ['is_public'] }],
});

// ─── Workout Day (within a plan) ──────────────────────────────────────────────
const WorkoutDay = sequelize.define('WorkoutDay', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  plan_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false }, // e.g. "Day 1 - Chest & Triceps"
  day_number: { type: DataTypes.INTEGER, allowNull: false },
  focus: { type: DataTypes.STRING }, // e.g. "Upper Body", "Push"
  notes: { type: DataTypes.TEXT },
}, { tableName: 'workout_days' });

// ─── Workout Day Exercise (exercises in a day) ────────────────────────────────
const WorkoutDayExercise = sequelize.define('WorkoutDayExercise', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  day_id: { type: DataTypes.UUID, allowNull: false },
  exercise_id: { type: DataTypes.UUID, allowNull: false },
  order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
  sets: { type: DataTypes.INTEGER, defaultValue: 3 },
  target_reps_min: { type: DataTypes.INTEGER, allowNull: true },
  target_reps_max: { type: DataTypes.INTEGER, allowNull: true },
  target_duration_seconds: { type: DataTypes.INTEGER, allowNull: true },
  rest_seconds: { type: DataTypes.INTEGER, defaultValue: 90 },
  weight_suggestion_kg: { type: DataTypes.FLOAT, allowNull: true },
  rpe_target: { type: DataTypes.FLOAT, allowNull: true }, // Rate of Perceived Exertion 1-10
  notes: { type: DataTypes.TEXT },
  is_superset: { type: DataTypes.BOOLEAN, defaultValue: false },
  superset_group: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'workout_day_exercises' });

// ─── Workout Session (a completed or in-progress workout) ─────────────────────
const WorkoutSession = sequelize.define('WorkoutSession', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  plan_id: { type: DataTypes.UUID, allowNull: true },
  day_id: { type: DataTypes.UUID, allowNull: true },
  name: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT },
  status: {
    type: DataTypes.ENUM('in_progress', 'completed', 'cancelled'),
    defaultValue: 'in_progress',
  },
  started_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  duration_seconds: { type: DataTypes.INTEGER, allowNull: true },
  total_volume_kg: { type: DataTypes.FLOAT, defaultValue: 0 },
  total_sets: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_reps: { type: DataTypes.INTEGER, defaultValue: 0 },
  calories_burned: { type: DataTypes.FLOAT, allowNull: true },
  rating: { type: DataTypes.INTEGER, allowNull: true }, // 1-5
  mood_before: { type: DataTypes.INTEGER, allowNull: true }, // 1-5
  mood_after:  { type: DataTypes.INTEGER, allowNull: true },
  location: { type: DataTypes.STRING, allowNull: true },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
}, {
  tableName: 'workout_sessions',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['started_at'] },
  ],
});

// ─── Session Set (individual set logs) ───────────────────────────────────────
const SessionSet = sequelize.define('SessionSet', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  session_id: { type: DataTypes.UUID, allowNull: false },
  exercise_id: { type: DataTypes.UUID, allowNull: false },
  set_number: { type: DataTypes.INTEGER, allowNull: false },
  reps: { type: DataTypes.INTEGER, allowNull: true },
  weight_kg: { type: DataTypes.FLOAT, allowNull: true },
  duration_seconds: { type: DataTypes.INTEGER, allowNull: true },
  distance_meters: { type: DataTypes.FLOAT, allowNull: true },
  rpe: { type: DataTypes.FLOAT, allowNull: true },
  is_warmup: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_drop_set: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_failure: { type: DataTypes.BOOLEAN, defaultValue: false },
  notes: { type: DataTypes.TEXT },
  logged_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'session_sets',
  indexes: [{ fields: ['session_id'] }, { fields: ['exercise_id'] }],
});

// ─── Personal Records ─────────────────────────────────────────────────────────
const PersonalRecord = sequelize.define('PersonalRecord', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  exercise_id: { type: DataTypes.UUID, allowNull: false },
  record_type: {
    type: DataTypes.ENUM('1rm', '3rm', '5rm', 'max_reps', 'max_weight', 'max_volume'),
    allowNull: false,
  },
  value: { type: DataTypes.FLOAT, allowNull: false },
  unit: { type: DataTypes.STRING(10), defaultValue: 'kg' },
  achieved_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  session_id: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'personal_records',
  indexes: [{ fields: ['user_id', 'exercise_id', 'record_type'] }],
});

// ─── Subscription ─────────────────────────────────────────────────────────────
const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  stripe_subscription_id: { type: DataTypes.STRING, unique: true },
  stripe_price_id: { type: DataTypes.STRING },
  tier: {
    type: DataTypes.ENUM('free', 'pro', 'elite'),
    defaultValue: 'free',
  },
  billing_interval: {
    type: DataTypes.ENUM('monthly', 'yearly'),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'trialing', 'past_due', 'canceled', 'incomplete'),
    defaultValue: 'active',
  },
  current_period_start: { type: DataTypes.DATE, allowNull: true },
  current_period_end:   { type: DataTypes.DATE, allowNull: true },
  cancel_at_period_end: { type: DataTypes.BOOLEAN, defaultValue: false },
  trial_ends_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'subscriptions' });

// ─── AI Conversation History ──────────────────────────────────────────────────
const AIConversation = sequelize.define('AIConversation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  session_id: { type: DataTypes.UUID, allowNull: true },
  messages: { type: DataTypes.JSONB, defaultValue: [] },
  context_type: {
    type: DataTypes.ENUM('general', 'workout_planning', 'form_check', 'nutrition', 'recovery'),
    defaultValue: 'general',
  },
  token_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'ai_conversations',
  indexes: [{ fields: ['user_id'] }],
});

// ─── Associations ─────────────────────────────────────────────────────────────
User.hasMany(WorkoutPlan,    { foreignKey: 'user_id', as: 'plans' });
User.hasMany(WorkoutSession, { foreignKey: 'user_id', as: 'sessions' });
User.hasOne(Subscription,    { foreignKey: 'user_id', as: 'subscription' });
User.hasMany(PersonalRecord, { foreignKey: 'user_id', as: 'prs' });
User.hasMany(AIConversation, { foreignKey: 'user_id', as: 'conversations' });

WorkoutPlan.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
WorkoutPlan.hasMany(WorkoutDay, { foreignKey: 'plan_id', as: 'days' });

WorkoutDay.belongsTo(WorkoutPlan, { foreignKey: 'plan_id', as: 'plan' });
WorkoutDay.hasMany(WorkoutDayExercise, { foreignKey: 'day_id', as: 'exercises' });

WorkoutDayExercise.belongsTo(WorkoutDay,    { foreignKey: 'day_id' });
WorkoutDayExercise.belongsTo(Exercise,      { foreignKey: 'exercise_id', as: 'exercise' });

WorkoutSession.belongsTo(User,        { foreignKey: 'user_id', as: 'user' });
WorkoutSession.belongsTo(WorkoutPlan, { foreignKey: 'plan_id', as: 'plan' });
WorkoutSession.belongsTo(WorkoutDay,  { foreignKey: 'day_id',  as: 'day' });
WorkoutSession.hasMany(SessionSet,    { foreignKey: 'session_id', as: 'sets' });

SessionSet.belongsTo(WorkoutSession, { foreignKey: 'session_id', as: 'session' });
SessionSet.belongsTo(Exercise,       { foreignKey: 'exercise_id', as: 'exercise' });

PersonalRecord.belongsTo(User,     { foreignKey: 'user_id' });
PersonalRecord.belongsTo(Exercise, { foreignKey: 'exercise_id', as: 'exercise' });

Subscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
AIConversation.belongsTo(User,           { foreignKey: 'user_id' });
AIConversation.belongsTo(WorkoutSession, { foreignKey: 'session_id' });

module.exports = {
  User, Exercise, WorkoutPlan, WorkoutDay,
  WorkoutDayExercise, WorkoutSession, SessionSet,
  PersonalRecord, Subscription, AIConversation,
};
