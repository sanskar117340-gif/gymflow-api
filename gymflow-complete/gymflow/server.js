require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const workoutRoutes = require('./routes/workout.routes');
const exerciseRoutes = require('./routes/exercise.routes');
const sessionRoutes = require('./routes/session.routes');
const aiRoutes = require('./routes/ai.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const subscriptionRoutes = require('./routes/subscription.routes');

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false,
}));
app.use(hpp());

// ─── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
}));

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

app.use('/api/', globalLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);

// ─── Body Parsing & Compression ───────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const API = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/workouts`, workoutRoutes);
app.use(`${API}/exercises`, exerciseRoutes);
app.use(`${API}/sessions`, sessionRoutes);
app.use(`${API}/ai`, aiRoutes);
app.use(`${API}/analytics`, analyticsRoutes);
app.use(`${API}/subscriptions`, subscriptionRoutes);

// Stripe webhooks need raw body — must be registered before json middleware fires
app.use(`${API}/webhooks/stripe`, express.raw({ type: 'application/json' }));

// ─── API Docs (Swagger) ───────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  try {
    const swaggerUi = require('swagger-ui-express');
    const YAML = require('yamljs');
    const swaggerDoc = YAML.load('./src/config/swagger.yaml');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
      customCss: '.swagger-ui .topbar { background: #131313; }',
      customSiteTitle: 'GymFlow AI API Docs',
    }));
    logger.info('📄 Swagger docs available at /api-docs');
  } catch (e) {
    logger.warn('Swagger docs not loaded:', e.message);
  }
}


// ─── Seed Route (remove after seeding) ───────────────────────────────────────
app.get('/seed-exercises', async (req, res) => {
  const { Exercise } = require('./models');
  const exercises = [
    { name: 'Barbell Bench Press', slug: 'barbell-bench-press', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['chest'], muscle_groups_secondary: ['triceps', 'shoulders'], equipment: ['barbell', 'bench'], movement_pattern: 'push', description: 'The king of chest exercises.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Incline Barbell Press', slug: 'incline-barbell-press', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['upper chest'], muscle_groups_secondary: ['triceps'], equipment: ['barbell', 'bench'], movement_pattern: 'push', description: 'Targets the upper chest.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Dumbbell Bench Press', slug: 'dumbbell-bench-press', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['chest'], muscle_groups_secondary: ['triceps'], equipment: ['dumbbells', 'bench'], movement_pattern: 'push', description: 'Press dumbbells from chest level.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Push-Up', slug: 'push-up', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['chest'], muscle_groups_secondary: ['triceps', 'core'], equipment: ['bodyweight'], movement_pattern: 'push', description: 'Classic bodyweight chest exercise.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Barbell Squat', slug: 'barbell-squat', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['quadriceps', 'glutes'], muscle_groups_secondary: ['hamstrings', 'core'], equipment: ['barbell'], movement_pattern: 'squat', description: 'The fundamental lower body strength exercise.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Goblet Squat', slug: 'goblet-squat', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['quadriceps', 'glutes'], muscle_groups_secondary: ['core'], equipment: ['kettlebell'], movement_pattern: 'squat', description: 'Hold a kettlebell and squat.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Leg Press', slug: 'leg-press', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['quadriceps', 'glutes'], muscle_groups_secondary: ['hamstrings'], equipment: ['leg press machine'], movement_pattern: 'squat', description: 'Machine-based lower body press.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Bulgarian Split Squat', slug: 'bulgarian-split-squat', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['quadriceps', 'glutes'], muscle_groups_secondary: ['hamstrings'], equipment: ['dumbbells', 'bench'], movement_pattern: 'squat', description: 'Single leg squat with rear foot elevated.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Deadlift', slug: 'deadlift', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['hamstrings', 'glutes', 'lower back'], muscle_groups_secondary: ['traps', 'forearms'], equipment: ['barbell'], movement_pattern: 'hinge', description: 'Pull a barbell from the floor.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Romanian Deadlift', slug: 'romanian-deadlift', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['hamstrings', 'glutes'], muscle_groups_secondary: ['lower back'], equipment: ['barbell'], movement_pattern: 'hinge', description: 'Hip hinge keeping legs nearly straight.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Kettlebell Swing', slug: 'kettlebell-swing', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['glutes', 'hamstrings'], muscle_groups_secondary: ['core', 'shoulders'], equipment: ['kettlebell'], movement_pattern: 'hinge', description: 'Explosive hip hinge with a kettlebell.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Pull-Up', slug: 'pull-up', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['lats', 'biceps'], muscle_groups_secondary: ['rear deltoids'], equipment: ['pull-up bar'], movement_pattern: 'pull', description: 'Pull your bodyweight up to a bar.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Weighted Pull-Up', slug: 'weighted-pull-up', category: 'strength', difficulty: 'advanced', muscle_groups_primary: ['lats', 'biceps'], muscle_groups_secondary: ['rear deltoids'], equipment: ['pull-up bar'], movement_pattern: 'pull', description: 'Pull-up with added weight.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Barbell Row', slug: 'barbell-row', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['lats', 'rhomboids'], muscle_groups_secondary: ['biceps'], equipment: ['barbell'], movement_pattern: 'pull', description: 'Row a barbell to your lower chest.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Cable Row', slug: 'cable-row', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['lats', 'rhomboids'], muscle_groups_secondary: ['biceps'], equipment: ['cable machine'], movement_pattern: 'pull', description: 'Seated cable row for mid-back.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Lat Pulldown', slug: 'lat-pulldown', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['lats'], muscle_groups_secondary: ['biceps'], equipment: ['cable machine'], movement_pattern: 'pull', description: 'Pull a bar down to your chest.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Dumbbell Row', slug: 'dumbbell-row', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['lats', 'rhomboids'], muscle_groups_secondary: ['biceps'], equipment: ['dumbbells', 'bench'], movement_pattern: 'pull', description: 'Single arm row with a dumbbell.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Overhead Press', slug: 'overhead-press', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['shoulders'], muscle_groups_secondary: ['triceps'], equipment: ['barbell'], movement_pattern: 'push', description: 'Press a barbell overhead.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Dumbbell Shoulder Press', slug: 'dumbbell-shoulder-press', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['shoulders'], muscle_groups_secondary: ['triceps'], equipment: ['dumbbells'], movement_pattern: 'push', description: 'Press dumbbells overhead.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Lateral Raise', slug: 'lateral-raise', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['lateral deltoids'], muscle_groups_secondary: [], equipment: ['dumbbells'], movement_pattern: 'push', description: 'Raise dumbbells to the side.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Face Pull', slug: 'face-pull', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['rear deltoids', 'rotator cuff'], muscle_groups_secondary: ['traps'], equipment: ['cable machine'], movement_pattern: 'pull', description: 'Pull a rope toward your face.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Barbell Curl', slug: 'barbell-curl', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['biceps'], muscle_groups_secondary: ['forearms'], equipment: ['barbell'], movement_pattern: 'pull', description: 'Curl a barbell to shoulder height.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Dumbbell Curl', slug: 'dumbbell-curl', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['biceps'], muscle_groups_secondary: [], equipment: ['dumbbells'], movement_pattern: 'pull', description: 'Alternating dumbbell curls.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Hammer Curl', slug: 'hammer-curl', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['biceps', 'brachialis'], muscle_groups_secondary: ['forearms'], equipment: ['dumbbells'], movement_pattern: 'pull', description: 'Curl with neutral grip.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Tricep Dip', slug: 'tricep-dip', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['triceps'], muscle_groups_secondary: ['chest', 'shoulders'], equipment: ['dip bars'], movement_pattern: 'push', description: 'Lower and raise on parallel bars.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Skull Crusher', slug: 'skull-crusher', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['triceps'], muscle_groups_secondary: [], equipment: ['barbell', 'bench'], movement_pattern: 'push', description: 'Lower barbell toward forehead and press.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Tricep Pushdown', slug: 'tricep-pushdown', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['triceps'], muscle_groups_secondary: [], equipment: ['cable machine'], movement_pattern: 'push', description: 'Push cable to full extension.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Plank', slug: 'plank', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['core'], muscle_groups_secondary: ['shoulders', 'glutes'], equipment: ['bodyweight'], description: 'Hold a push-up position isometrically.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Hanging Leg Raise', slug: 'hanging-leg-raise', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['core', 'hip flexors'], muscle_groups_secondary: [], equipment: ['pull-up bar'], movement_pattern: 'pull', description: 'Hang and raise legs to 90 degrees.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Ab Wheel Rollout', slug: 'ab-wheel-rollout', category: 'strength', difficulty: 'advanced', muscle_groups_primary: ['core'], muscle_groups_secondary: ['lats', 'shoulders'], equipment: ['ab wheel'], movement_pattern: 'push', description: 'Roll an ab wheel forward from kneeling.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Treadmill Run', slug: 'treadmill-run', category: 'cardio', difficulty: 'beginner', muscle_groups_primary: ['cardiovascular system'], muscle_groups_secondary: ['quadriceps', 'calves'], equipment: ['treadmill'], description: 'Steady state or interval running.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Cycling', slug: 'cycling', category: 'cardio', difficulty: 'beginner', muscle_groups_primary: ['cardiovascular system'], muscle_groups_secondary: ['quadriceps', 'glutes'], equipment: ['bike'], description: 'Stationary or outdoor cycling.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Rowing Machine', slug: 'rowing-machine', category: 'cardio', difficulty: 'intermediate', muscle_groups_primary: ['cardiovascular system', 'back'], muscle_groups_secondary: ['biceps', 'legs'], equipment: ['rowing machine'], description: 'Full body cardio on a rowing ergometer.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Jump Rope', slug: 'jump-rope', category: 'cardio', difficulty: 'beginner', muscle_groups_primary: ['cardiovascular system'], muscle_groups_secondary: ['calves', 'shoulders'], equipment: ['jump rope'], description: 'Skip rope for cardiovascular conditioning.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Battle Ropes', slug: 'battle-ropes', category: 'cardio', difficulty: 'intermediate', muscle_groups_primary: ['cardiovascular system', 'shoulders'], muscle_groups_secondary: ['core', 'arms'], equipment: ['battle ropes'], description: 'Slam and wave heavy ropes.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Burpee', slug: 'burpee', category: 'cardio', difficulty: 'intermediate', muscle_groups_primary: ['cardiovascular system'], muscle_groups_secondary: ['chest', 'core'], equipment: ['bodyweight'], description: 'Drop to push-up then jump back up.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Box Jump', slug: 'box-jump', category: 'cardio', difficulty: 'intermediate', muscle_groups_primary: ['quadriceps', 'glutes'], muscle_groups_secondary: ['cardiovascular system'], equipment: ['plyo box'], description: 'Explosive jump onto a raised box.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Mountain Climbers', slug: 'mountain-climbers', category: 'cardio', difficulty: 'beginner', muscle_groups_primary: ['core', 'cardiovascular system'], muscle_groups_secondary: ['shoulders'], equipment: ['bodyweight'], description: 'Drive knees to chest in plank position.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Sprint Intervals', slug: 'sprint-intervals', category: 'cardio', difficulty: 'advanced', muscle_groups_primary: ['cardiovascular system'], muscle_groups_secondary: ['hamstrings', 'glutes'], equipment: ['treadmill'], description: 'Alternate max sprints and recovery.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Stair Climber', slug: 'stair-climber', category: 'cardio', difficulty: 'beginner', muscle_groups_primary: ['glutes', 'quadriceps'], muscle_groups_secondary: ['cardiovascular system'], equipment: ['stair climber'], description: 'Climb stairs on a machine.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Hip Flexor Stretch', slug: 'hip-flexor-stretch', category: 'flexibility', difficulty: 'beginner', muscle_groups_primary: ['hip flexors'], muscle_groups_secondary: ['quadriceps'], equipment: ['bodyweight'], description: 'Lunge forward and sink hips.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Hamstring Stretch', slug: 'hamstring-stretch', category: 'flexibility', difficulty: 'beginner', muscle_groups_primary: ['hamstrings'], muscle_groups_secondary: [], equipment: ['bodyweight'], description: 'Reach toward your toes.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Pigeon Pose', slug: 'pigeon-pose', category: 'flexibility', difficulty: 'intermediate', muscle_groups_primary: ['glutes', 'hip rotators'], muscle_groups_secondary: ['hip flexors'], equipment: ['bodyweight'], description: 'Deep hip opener from yoga.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Thoracic Rotation', slug: 'thoracic-rotation', category: 'flexibility', difficulty: 'beginner', muscle_groups_primary: ['thoracic spine'], muscle_groups_secondary: ['obliques'], equipment: ['bodyweight'], description: 'Rotate through the upper back.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Child Pose', slug: 'child-pose', category: 'flexibility', difficulty: 'beginner', muscle_groups_primary: ['lower back', 'lats'], muscle_groups_secondary: ['glutes'], equipment: ['bodyweight'], description: 'Kneel and reach arms forward.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Cat-Cow Stretch', slug: 'cat-cow-stretch', category: 'flexibility', difficulty: 'beginner', muscle_groups_primary: ['spine', 'core'], muscle_groups_secondary: [], equipment: ['bodyweight'], description: 'Alternate arching and rounding spine.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Worlds Greatest Stretch', slug: 'worlds-greatest-stretch', category: 'flexibility', difficulty: 'intermediate', muscle_groups_primary: ['hip flexors', 'thoracic spine'], muscle_groups_secondary: ['hamstrings', 'glutes'], equipment: ['bodyweight'], description: 'Full-body mobility sequence.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
    { name: 'Shoulder Cross-Body Stretch', slug: 'shoulder-crossbody-stretch', category: 'flexibility', difficulty: 'beginner', muscle_groups_primary: ['rear deltoids'], muscle_groups_secondary: ['rotator cuff'], equipment: ['bodyweight'], description: 'Pull arm across body to stretch shoulder.', is_approved: true, is_custom: false, instructions: [], metadata: {} },
  ];
  try {
    await Exercise.bulkCreate(exercises, { ignoreDuplicates: true });
    res.json({ success: true, message: 'Seeded ' + exercises.length + ' exercises!', count: exercises.length });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await connectRedis();

    app.listen(PORT, () => {
      logger.info(`🚀 GymFlow AI Backend running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
      logger.info(`📡 API Base: /api/${process.env.API_VERSION || 'v1'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
  process.exit(1);
});

startServer();

module.exports = app; // For testing
