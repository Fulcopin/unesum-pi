// Script para crear usuario de Comisión Académica
// Ejecutar con: node crear-usuario-comision.js

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Configuración de la base de datos (ajustar según tu .env)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/unesum',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function crearUsuarioComision() {
  try {
    console.log('🔐 Generando hash de contraseña...');
    const password = 'comision123';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Hash generado:', hashedPassword);

    console.log('\n📝 Verificando si el usuario ya existe...');
    const checkQuery = 'SELECT * FROM usuarios WHERE correo_electronico = $1';
    const checkResult = await pool.query(checkQuery, ['comision@unesum.edu.ec']);

    if (checkResult.rows.length > 0) {
      console.log('⚠️  El usuario ya existe. Actualizando rol a comision_academica...');
      const updateQuery = `
        UPDATE usuarios 
        SET rol = $1, contraseña = $2 
        WHERE correo_electronico = $3
        RETURNING *
      `;
      const updateResult = await pool.query(updateQuery, ['comision_academica', hashedPassword, 'comision@unesum.edu.ec']);
      console.log('✅ Usuario actualizado:', updateResult.rows[0]);
    } else {
      console.log('➕ Creando nuevo usuario de Comisión Académica...');
      const insertQuery = `
        INSERT INTO usuarios (
          nombres,
          apellidos,
          cedula_identidad,
          telefono,
          correo_electronico,
          fecha_nacimiento,
          direccion,
          rol,
          facultad,
          carrera,
          contraseña,
          estado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const values = [
        'Comisión',
        'Académica',
        '1234567890',
        '0999999999',
        'comision@unesum.edu.ec',
        '1980-01-01',
        'UNESUM - Campus Principal',
        'comision_academica',
        'ciencias-economicas',
        null,
        hashedPassword,
        true
      ];

      const insertResult = await pool.query(insertQuery, values);
      console.log('✅ Usuario creado exitosamente:', insertResult.rows[0]);
    }

    console.log('\n✨ Proceso completado');
    console.log('📧 Email: comision@unesum.edu.ec');
    console.log('🔑 Contraseña: comision123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

crearUsuarioComision();
