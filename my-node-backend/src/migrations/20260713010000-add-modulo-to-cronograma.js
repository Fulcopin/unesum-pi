'use strict';

/**
 * Agrega la columna `modulo` a cronograma_eventos.
 * Guarda el href de la opción de menú que el evento habilita: esa opción solo
 * será visible para el rol indicado (`para_roles`) dentro de [fecha_inicio, fecha_fin].
 * NULL = el evento es solo de calendario y no gobierna ningún menú.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE public.cronograma_eventos ADD COLUMN IF NOT EXISTS modulo VARCHAR(200)`
    );
    console.log('✅ Columna modulo agregada a cronograma_eventos');
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE public.cronograma_eventos DROP COLUMN IF EXISTS modulo`
    );
    console.log('✅ Columna modulo eliminada de cronograma_eventos');
  }
};
