const { Sequelize } = require('sequelize');
const env = require('./env');
const { preflightRoles } = require('../utils/preflightRoles');

const sequelize = new Sequelize(env.databaseUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    max: 3
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    await preflightRoles(sequelize);
    await sequelize.sync();
    console.log('Database connected and models synchronized successfully');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };