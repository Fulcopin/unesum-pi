/**
 * Asigna el rol "docente" a todos los profesores que no tienen rol asignado.
 * Uso:  cd my-node-backend && node migrations/asignar-rol-docente.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Sequelize, DataTypes, Op } = require('sequelize');
const env = require('../src/config/env');

const sequelize = new Sequelize(env.databaseUrl, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false,
});

const Profesor = sequelize.define('profesores', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
}, { tableName: 'profesores', schema: 'public', timestamps: false, paranoid: true });

const Rol = sequelize.define('roles', {
  id:     { type: DataTypes.INTEGER, primaryKey: true },
  codigo: { type: DataTypes.STRING },
  nombre: { type: DataTypes.STRING },
}, { tableName: 'roles', schema: 'public', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const ProfesorRol = sequelize.define('profesor_roles', {
  id:          { autoIncrement: true, type: DataTypes.INTEGER, primaryKey: true },
  profesor_id: { type: DataTypes.INTEGER, allowNull: false },
  rol_id:      { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'profesor_roles', schema: 'public', timestamps: true });

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión establecida.');

    // Crear tabla si no existe
    await ProfesorRol.sync({ force: false });
    console.log('✅ Tabla profesor_roles verificada.');

    // Buscar el rol "docente" o "profesor"
    const rolDocente = await Rol.findOne({
      where: {
        [Op.or]: [
          { codigo: 'docente' },
          { codigo: 'profesor' },
          { nombre: { [Op.iLike]: '%docente%' } },
        ]
      }
    });

    if (!rolDocente) {
      console.error('❌ No se encontró el rol "docente" o "profesor" en la tabla roles.');
      console.log('   Roles existentes:');
      const todosRoles = await Rol.findAll({ attributes: ['id', 'codigo', 'nombre'] });
      todosRoles.forEach(r => console.log(`   - id:${r.id} codigo:${r.codigo} nombre:${r.nombre}`));
      process.exit(1);
    }

    console.log(`✅ Rol encontrado: "${rolDocente.nombre}" (id: ${rolDocente.id})`);

    // Obtener todos los profesores
    const profesores = await Profesor.findAll({ paranoid: false });
    console.log(`📋 ${profesores.length} profesor(es) encontrados.`);

    let asignados  = 0;
    let omitidos   = 0;

    for (const prof of profesores) {
      // Ver si ya tiene este rol
      const yaExiste = await ProfesorRol.findOne({
        where: { profesor_id: prof.id, rol_id: rolDocente.id }
      });

      if (!yaExiste) {
        await ProfesorRol.create({ profesor_id: prof.id, rol_id: rolDocente.id });
        asignados++;
        console.log(`   ✔ Profesor id:${prof.id} → rol "${rolDocente.nombre}" asignado`);
      } else {
        omitidos++;
        console.log(`   ○ Profesor id:${prof.id} → ya tenía el rol, omitido`);
      }
    }

    console.log(`\n📊 Resultado:`);
    console.log(`   Roles asignados: ${asignados}`);
    console.log(`   Ya tenían rol:   ${omitidos}`);
    console.log(`\n🎉 Migración completada.`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.original) console.error('   Detalle:', err.original.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
