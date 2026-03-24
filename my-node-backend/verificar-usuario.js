const { Sequelize } = require('sequelize');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

async function verificarUsuario() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    const [results] = await sequelize.query(`
      SELECT id, nombres, apellidos, correo_electronico, rol, estado
      FROM usuarios 
      WHERE correo_electronico = 'comision@unesum.edu.ec';
    `);

    if (results.length > 0) {
      console.log('📋 Usuario encontrado:');
      console.log('ID:', results[0].id);
      console.log('Nombre:', results[0].nombres, results[0].apellidos);
      console.log('Email:', results[0].correo_electronico);
      console.log('🎭 ROL ACTUAL:', results[0].rol);
      console.log('Estado:', results[0].estado ? 'Activo' : 'Inactivo');
      console.log('\n');
      
      if (results[0].rol !== 'comision_academica') {
        console.log('⚠️  EL ROL NO ES comision_academica, actualizando...');
        
        await sequelize.query(`
          UPDATE usuarios 
          SET rol = 'comision_academica' 
          WHERE correo_electronico = 'comision@unesum.edu.ec';
        `);
        
        console.log('✅ Rol actualizado a comision_academica');
      } else {
        console.log('✅ El rol YA ES comision_academica');
      }
    } else {
      console.log('❌ No se encontró el usuario');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

verificarUsuario();
