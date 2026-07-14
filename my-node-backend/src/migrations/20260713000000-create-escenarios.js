'use strict';

/**
 * Crea la tabla `escenarios`: catálogo de escenarios de aprendizaje
 * (Áulico, Virtual, Laboratorio, etc.). id automático + nombre + descripción.
 * Alimenta el combo de la columna "Escenario de aprendizaje" del syllabus.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('escenarios', {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      nombre: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
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

    console.log('✅ Tabla escenarios creada exitosamente');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('escenarios');
    console.log('✅ Tabla escenarios eliminada');
  }
};
