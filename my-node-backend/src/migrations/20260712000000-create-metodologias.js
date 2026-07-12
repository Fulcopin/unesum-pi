'use strict';

/**
 * Crea la tabla `metodologias`: catálogo de metodologías de enseñanza-aprendizaje.
 * id automático (BIGSERIAL) + descripcion. Se usa para poblar el combo de la
 * columna "Metodologías" del editor de syllabus.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('metodologias', {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      estado: {
        type: Sequelize.STRING(15),
        allowNull: false,
        defaultValue: 'activo'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    console.log('✅ Tabla metodologias creada exitosamente');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('metodologias');
    console.log('✅ Tabla metodologias eliminada');
  }
};
