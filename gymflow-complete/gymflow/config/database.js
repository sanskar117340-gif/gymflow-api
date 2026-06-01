const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false,
    },
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'gymflow_db',
    process.env.DB_USER || 'gymflow_user',
    process.env.DB_PASSWORD || 'gymflow_dev_password',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false,
      },
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    }
  );
}

async function connectDB() {
  try {
    await sequelize.authenticate();
    logger.info('✅ PostgreSQL connected');
    // Sync models (alter: true updates tables without dropping data)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('✅ Database models synced');
  } catch (error) {
    logger.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

module.exports = { sequelize, connectDB };
