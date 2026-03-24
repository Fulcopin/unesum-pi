// Archivo: config/database.js

// Este paquete lee tu archivo .env y carga las variables de entorno
require('dotenv').config();

// Este es el formato de configuración que la CLI de Sequelize entiende
module.exports = {
  development: {
    // Le decimos a Sequelize que use la variable de entorno DATABASE_URL
    use_env_variable: "DATABASE_URL",
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Crucial para conectar con Neon
      }
    }
  },
  production: {
    use_env_variable: "DATABASE_URL",
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};
