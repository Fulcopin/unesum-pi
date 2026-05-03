// Repara la tabla `public.roles` si quedó con un esquema previo
// incompatible (p.ej. columna `estado` como enum en lugar de BOOLEAN).
// Se ejecuta ANTES de sequelize.sync({ alter: true }) para evitar que
// crashee el servidor con: "column estado is of type enum_roles_estado".

async function preflightRoles(sequelize) {
  try {
    const [rows] = await sequelize.query(`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'roles'
        AND column_name = 'estado'
    `);

    if (rows.length === 0) {
      return;
    }

    const { data_type: dataType, udt_name: udtName } = rows[0];
    const esBoolean = dataType === 'boolean' || udtName === 'bool';

    if (esBoolean) {
      return;
    }

    console.log(`[preflight:roles] Columna estado tiene tipo "${udtName}" (esperado boolean). Recreando tabla roles...`);

    await sequelize.query('DROP TABLE IF EXISTS public.roles CASCADE');
    await sequelize.query('DROP TYPE IF EXISTS public.enum_roles_estado CASCADE');

    console.log('[preflight:roles] Tabla roles eliminada. Sequelize la recreará en el sync.');
  } catch (error) {
    console.error('[preflight:roles] Error durante preflight:', error.message);
  }
}

module.exports = { preflightRoles };
