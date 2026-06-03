require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { Exercise } = require('./src/models');

const exercises = [
  // ── STRENGTH ──────────────────────────────────────────────────────────────
  { name: 'Barbell Bench Press', slug: 'barbell-bench-press', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['chest'], muscle_groups_secondary: ['triceps', 'shoulders'], equipment: ['barbell', 'bench'], movement_pattern: 'push', description: 'The king of chest exercises. Lie on a bench and press a barbell from chest to full extension.' },
  { name: 'Incline Barbell Press', slug: 'incline-barbell-press', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['upper chest'], muscle_groups_secondary: ['triceps', 'shoulders'], equipment: ['barbell', 'bench'], movement_pattern: 'push', description: 'Targets the upper chest with an inclined bench angle.' },
  { name: 'Dumbbell Bench Press', slug: 'dumbbell-bench-press', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['chest'], muscle_groups_secondary: ['triceps'], equipment: ['dumbbells', 'bench'], movement_pattern: 'push', description: 'Press dumbbells from chest level to full extension.' },
  { name: 'Push-Up', slug: 'push-up', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['chest'], muscle_groups_secondary: ['triceps', 'core'], equipment: ['bodyweight'], movement_pattern: 'push', description: 'Classic bodyweight chest exercise.' },
  { name: 'Cable Flye', slug: 'cable-flye', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['chest'], muscle_groups_secondary: [], equipment: ['cable machine'], movement_pattern: 'push', description: 'Isolation movement for chest using cables.' },

  { name: 'Barbell Squat', slug: 'barbell-squat', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['quadriceps', 'glutes'], muscle_groups_secondary: ['hamstrings', 'core'], equipment: ['barbell', 'squat rack'], movement_pattern: 'squat', description: 'The fundamental lower body strength exercise.' },
  { name: 'Front Squat', slug: 'front-squat', category: 'strength', difficulty: 'advanced', muscle_groups_primary: ['quadriceps'], muscle_groups_secondary: ['glutes', 'core'], equipment: ['barbell', 'squat rack'], movement_pattern: 'squat', description: 'Barbell held at the front, emphasizes quads.' },
  { name: 'Goblet Squat', slug: 'goblet-squat', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['quadriceps', 'glutes'], muscle_groups_secondary: ['core'], equipment: ['kettlebell'], movement_pattern: 'squat', description: 'Hold a kettlebell at chest height and squat.' },
  { name: 'Leg Press', slug: 'leg-press', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['quadriceps', 'glutes'], muscle_groups_secondary: ['hamstrings'], equipment: ['leg press machine'], movement_pattern: 'squat', description: 'Machine-based lower body press.' },
  { name: 'Bulgarian Split Squat', slug: 'bulgarian-split-squat', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['quadriceps', 'glutes'], muscle_groups_secondary: ['hamstrings'], equipment: ['dumbbells', 'bench'], movement_pattern: 'squat', description: 'Single leg squat with rear foot elevated.' },

  { name: 'Deadlift', slug: 'deadlift', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['hamstrings', 'glutes', 'lower back'], muscle_groups_secondary: ['traps', 'forearms'], equipment: ['barbell'], movement_pattern: 'hinge', description: 'Pull a loaded barbell from the floor to hip level.' },
  { name: 'Romanian Deadlift', slug: 'romanian-deadlift', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['hamstrings', 'glutes'], muscle_groups_secondary: ['lower back'], equipment: ['barbell'], movement_pattern: 'hinge', description: 'Hip hinge movement keeping legs nearly straight.' },
  { name: 'Kettlebell Swing', slug: 'kettlebell-swing', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['glutes', 'hamstrings'], muscle_groups_secondary: ['core', 'shoulders'], equipment: ['kettlebell'], movement_pattern: 'hinge', description: 'Explosive hip hinge with a kettlebell.' },
  { name: 'Good Morning', slug: 'good-morning', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['hamstrings', 'lower back'], muscle_groups_secondary: ['glutes'], equipment: ['barbell'], movement_pattern: 'hinge', description: 'Barbell on back, hinge forward at the hips.' },

  { name: 'Pull-Up', slug: 'pull-up', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['lats', 'biceps'], muscle_groups_secondary: ['rear deltoids'], equipment: ['pull-up bar'], movement_pattern: 'pull', description: 'Pull your bodyweight up to a bar.' },
  { name: 'Weighted Pull-Up', slug: 'weighted-pull-up', category: 'strength', difficulty: 'advanced', muscle_groups_primary: ['lats', 'biceps'], muscle_groups_secondary: ['rear deltoids'], equipment: ['pull-up bar', 'weight belt'], movement_pattern: 'pull', description: 'Pull-up with added weight for progressive overload.' },
  { name: 'Barbell Row', slug: 'barbell-row', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['lats', 'rhomboids'], muscle_groups_secondary: ['biceps', 'rear deltoids'], equipment: ['barbell'], movement_pattern: 'pull', description: 'Bend over and row a barbell to your lower chest.' },
  { name: 'Cable Row', slug: 'cable-row', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['lats', 'rhomboids'], muscle_groups_secondary: ['biceps'], equipment: ['cable machine'], movement_pattern: 'pull', description: 'Seated cable row targeting the mid-back.' },
  { name: 'Lat Pulldown', slug: 'lat-pulldown', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['lats'], muscle_groups_secondary: ['biceps'], equipment: ['cable machine'], movement_pattern: 'pull', description: 'Pull a bar down to your chest on a cable machine.' },
  { name: 'Dumbbell Row', slug: 'dumbbell-row', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['lats', 'rhomboids'], muscle_groups_secondary: ['biceps'], equipment: ['dumbbells', 'bench'], movement_pattern: 'pull', description: 'Single arm row with a dumbbell.' },

  { name: 'Overhead Press', slug: 'overhead-press', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['shoulders'], muscle_groups_secondary: ['triceps', 'upper chest'], equipment: ['barbell'], movement_pattern: 'push', description: 'Press a barbell from shoulder height to overhead.' },
  { name: 'Dumbbell Shoulder Press', slug: 'dumbbell-shoulder-press', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['shoulders'], muscle_groups_secondary: ['triceps'], equipment: ['dumbbells'], movement_pattern: 'push', description: 'Press dumbbells overhead from shoulder height.' },
  { name: 'Lateral Raise', slug: 'lateral-raise', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['lateral deltoids'], muscle_groups_secondary: [], equipment: ['dumbbells'], movement_pattern: 'push', description: 'Raise dumbbells to the side to shoulder height.' },
  { name: 'Face Pull', slug: 'face-pull', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['rear deltoids', 'rotator cuff'], muscle_groups_secondary: ['traps'], equipment: ['cable machine'], movement_pattern: 'pull', description: 'Pull a rope attachment toward your face.' },

  { name: 'Barbell Curl', slug: 'barbell-curl', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['biceps'], muscle_groups_secondary: ['forearms'], equipment: ['barbell'], movement_pattern: 'pull', description: 'Curl a barbell from hip height to shoulder height.' },
  { name: 'Dumbbell Curl', slug: 'dumbbell-curl', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['biceps'], muscle_groups_secondary: [], equipment: ['dumbbells'], movement_pattern: 'pull', description: 'Alternating or simultaneous dumbbell curls.' },
  { name: 'Hammer Curl', slug: 'hammer-curl', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['biceps', 'brachialis'], muscle_groups_secondary: ['forearms'], equipment: ['dumbbells'], movement_pattern: 'pull', description: 'Curl with neutral grip targeting brachialis.' },
  { name: 'Tricep Dip', slug: 'tricep-dip', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['triceps'], muscle_groups_secondary: ['chest', 'shoulders'], equipment: ['dip bars'], movement_pattern: 'push', description: 'Lower and raise your body on parallel bars.' },
  { name: 'Skull Crusher', slug: 'skull-crusher', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['triceps'], muscle_groups_secondary: [], equipment: ['barbell', 'bench'], movement_pattern: 'push', description: 'Lower a barbell toward your forehead and press back up.' },
  { name: 'Tricep Pushdown', slug: 'tricep-pushdown', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['triceps'], muscle_groups_secondary: [], equipment: ['cable machine'], movement_pattern: 'push', description: 'Push a cable attachment down to full extension.' },

  { name: 'Plank', slug: 'plank', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['core'], muscle_groups_secondary: ['shoulders', 'glutes'], equipment: ['bodyweight'], movement_pattern: 'static', description: 'Hold a push-up position isometrically.' },
  { name: 'Hanging Leg Raise', slug: 'hanging-leg-raise', category: 'strength', difficulty: 'intermediate', muscle_groups_primary: ['core', 'hip flexors'], muscle_groups_secondary: [], equipment: ['pull-up bar'], movement_pattern: 'pull', description: 'Hang from a bar and raise your legs to 90 degrees.' },
  { name: 'Ab Wheel Rollout', slug: 'ab-wheel-rollout', category: 'strength', difficulty: 'advanced', muscle_groups_primary: ['core'], muscle_groups_secondary: ['lats', 'shoulders'], equipment: ['ab wheel'], movement_pattern: 'push', description: 'Roll an ab wheel forward from kneeling position.' },
  { name: 'Cable Crunch', slug: 'cable-crunch', category: 'strength', difficulty: 'beginner', muscle_groups_primary: ['core'], muscle_groups_secondary: [], equipment: ['cable machine'], movement_pattern: 'pull', description: 'Kneel and crunch down on a cable.' },

  // ── CARDIO ────────────────────────────────────────────────────────────────
  { name: 'Treadmill Run', slug: 'treadmill-run', category: 'cardio', difficulty: 'beginner', muscle_groups_primary: ['cardiovascular system'], muscle_groups_secondary: ['quadriceps', 'calves'], equipment: ['treadmill'], description: 'Steady state or interval running on a treadmill.' },
  { name: 'Cycling', slug: 'cycling', category: 'cardio', difficulty: 'beginner', muscle_groups_primary: ['cardiovascular system'], muscle_groups_secondary: ['quadriceps', 'glutes'], equipment: ['bike'], description: 'Stationary or outdoor cycling for cardio.' },
  { name: 'Rowing Machine', slug: 'rowing-machine', category: 'cardio', difficulty: 'intermediate', muscle_groups_primary: ['cardiovascular system', 'back'], muscle_groups_secondary: ['biceps', 'legs'], equipment: ['rowing machine'], description: 'Full body cardio on a rowing ergometer.' },
  { name: 'Jump Rope', slug: 'jump-rope', category: 'cardio', difficulty: 'beginner', muscle_groups_primary: ['cardiovascular system'], muscle_groups_secondary: ['calves', 'shoulders'], equipment: ['jump rope'], description: 'Skip rope for cardiovascular conditioning.' },
  { name: 'Battle Ropes', slug: 'battle-ropes', category: 'cardio', difficulty: 'intermediate', muscle_groups_primary: ['cardiovascular system', 'shoulders'], muscle_groups_secondary: ['core', 'arms'], equipment: ['battle ropes'], description: 'Slam and wave heavy ropes for conditioning.' },
  { name: 'Stair Climber', slug: 'stair-climber', category: 'cardio', difficulty: 'beginner', muscle_groups_primary: ['glutes', 'quadriceps'], muscle_groups_secondary: ['cardiovascular system'], equipment: ['stair climber'], description: 'Climb stairs on a machine for cardio and leg work.' },
  { name: 'Burpee', slug: 'burpee', category: 'cardio', difficulty: 'intermediate', muscle_groups_primary: ['cardiovascular system', 'full body'], muscle_groups_secondary: ['chest', 'core'], equipment: ['bodyweight'], description: 'Drop to a push-up, jump back up, repeat.' },
  { name: 'Box Jump', slug: 'box-jump', category: 'cardio', difficulty: 'intermediate', muscle_groups_primary: ['quadriceps', 'glutes'], muscle_groups_secondary: ['cardiovascular system'], equipment: ['plyo box'], description: 'Explosive jump onto a raised box.' },
  { name: 'Mountain Climbers', slug: 'mountain-climbers', category: 'cardio', difficulty: 'beginner', muscle_groups_primary: ['core', 'cardiovascular system'], muscle_groups_secondary: ['shoulders'], equipment: ['bodyweight'], description: 'Alternate driving knees to chest in plank position.' },
  { name: 'Sprint Intervals', slug: 'sprint-intervals', category: 'cardio', difficulty: 'advanced', muscle_groups_primary: ['cardiovascular system'], muscle_groups_secondary: ['hamstrings', 'glutes'], equipment: ['treadmill'], description: 'Alternate between max effort sprints and recovery.' },

  // ── FLEXIBILITY ──────────────────────────────────────────────────────────
  { name: 'Hip Flexor Stretch', slug: 'hip-flexor-stretch', category: 'flexibility', difficulty: 'beginner', muscle_groups_primary: ['hip flexors'], muscle_groups_secondary: ['quadriceps'], equipment: ['bodyweight'], description: 'Lunge forward and sink hips to stretch hip flexors.' },
  { name: 'Hamstring Stretch', slug: 'hamstring-stretch', category: 'flexibility', difficulty: 'beginner', muscle_groups_primary: ['hamstrings'], muscle_groups_secondary: [], equipment: ['bodyweight'], description: 'Sit or stand and reach toward your toes.' },
  { name: 'Pigeon Pose', slug: 'pigeon-pose', category: 'flexibility', difficulty: 'intermediate', muscle_groups_primary: ['glutes', 'hip rotators'], muscle_groups_secondary: ['hip flexors'], equipment: ['bodyweight'], description: 'Deep hip opener from yoga.' },
  { name: 'Thoracic Rotation', slug: 'thoracic-rotation', category: 'flexibility', difficulty: 'beginner', muscle_groups_primary: ['thoracic spine'], muscle_groups_secondary: ['obliques'], equipment: ['bodyweight'], description: 'Rotate through the upper back to improve mobility.' },
  { name: 'Shoulder Cross-Body Stretch', slug: 'shoulder-crossbody-stretch', category: 'flexibility', difficulty: 'beginner', muscle_groups_primary: ['rear deltoids'], muscle_groups_secondary: ['rotator cuff'], equipment: ['bodyweight'], description: 'Pull one arm across your body to stretch the shoulder.' },
  { name: 'Child\'s Pose', slug: 'childs-pose', category: 'flexibility', difficulty: 'beginner', muscle_groups_primary: ['lower back', 'lats'], muscle_groups_secondary: ['glutes'], equipment: ['bodyweight'], description: 'Kneel and reach arms forward to decompress the spine.' },
  { name: 'Cat-Cow Stretch', slug: 'cat-cow-stretch', category: 'flexibility', difficulty: 'beginner', muscle_groups_primary: ['spine', 'core'], muscle_groups_secondary: [], equipment: ['bodyweight'], description: 'Alternate between arching and rounding the spine.' },
  { name: 'World\'s Greatest Stretch', slug: 'worlds-greatest-stretch', category: 'flexibility', difficulty: 'intermediate', muscle_groups_primary: ['hip flexors', 'thoracic spine'], muscle_groups_secondary: ['hamstrings', 'glutes'], equipment: ['bodyweight'], description: 'A full-body mobility sequence in one movement.' },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync models
    await sequelize.sync();
    console.log('✅ Models synced');

    // Clear existing exercises
    await Exercise.destroy({ where: {}, truncate: true });
    console.log('🗑️  Cleared existing exercises');

    // Insert all exercises
    const created = await Exercise.bulkCreate(
      exercises.map(e => ({
        ...e,
        is_approved: true,
        is_custom: false,
        instructions: [],
        metadata: {},
      })),
      { validate: true }
    );

    console.log(`✅ Seeded ${created.length} exercises successfully!`);
    console.log('\nCategories:');
    const cats = {};
    created.forEach(e => { cats[e.category] = (cats[e.category] || 0) + 1; });
    Object.entries(cats).forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
