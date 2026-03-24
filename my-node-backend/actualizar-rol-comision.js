const { Sequelize } = require('sequelize');
const path = require('path');

// Cargar .env desde el directorio raíz del backend
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Verificar que la variable esté cargada
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está definida en el archivo .env');
  process.exit(1);
}

// Configuración de la base de datos
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: console.log
});

async function actualizarRolComision() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa a la base de datos');

    // Actualizar el rol del usuario comision@unesum.edu.ec
    const [results, metadata] = await sequelize.query(`
      UPDATE usuarios 
      SET rol = 'comision_academica' 
      WHERE correo_electronico = 'comision@unesum.edu.ec'
      RETURNING *;
    `);

    if (results.length > 0) {
      console.log('✅ Usuario actualizado exitosamente:');
      console.log('📧 Email:', results[0].correo_electronico);
      console.log('👤 Nombre:', results[0].nombres, results[0].apellidos);
      console.log('🎭 Rol anterior: administrador');
      console.log('🎭 Rol nuevo:', results[0].rol);
    } else {
      console.log('❌ No se encontró el usuario comision@unesum.edu.ec');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

actualizarRolComision();
