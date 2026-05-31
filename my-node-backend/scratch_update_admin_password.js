const path = require('path');
require('dotenv').config();

const { sequelize } = require('./src/config/db');
const bcrypt = require('bcrypt');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully!');

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [result] = await sequelize.query(
      `UPDATE usuarios SET "contraseña" = :password WHERE correo_electronico = 'fcf@erikfek.co'`,
      {
        replacements: { password: hashedPassword }
      }
    );
    console.log('✅ Admin password updated to "admin123" successfully!');
  } catch (error) {
    console.error('❌ Error updating password:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

run();
