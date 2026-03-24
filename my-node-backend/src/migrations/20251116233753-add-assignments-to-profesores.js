'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agregar columnas a la tabla profesores
    await queryInterface.addColumn('profesores', 'asignatura_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: {
        model: 'asignaturas',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('profesores', 'nivel_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: {
        model: 'nivel',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('profesores', 'paralelo_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: {
        model: 'paralelo',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Agregar columna profesor_id a syllabi
    await queryInterface.addColumn('syllabi', 'profesor_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'profesores',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Crear índices para mejorar el rendimiento
    await queryInterface.addIndex('profesores', ['asignatura_id'], {
      name: 'idx_profesores_asignatura_id'
    });

    await queryInterface.addIndex('profesores', ['nivel_id'], {
      name: 'idx_profesores_nivel_id'
    });

    await queryInterface.addIndex('profesores', ['paralelo_id'], {
      name: 'idx_profesores_paralelo_id'
    });

    await queryInterface.addIndex('syllabi', ['profesor_id'], {
      name: 'idx_syllabi_profesor_id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar índices
    await queryInterface.removeIndex('syllabi', 'idx_syllabi_profesor_id');
    await queryInterface.removeIndex('profesores', 'idx_profesores_paralelo_id');
    await queryInterface.removeIndex('profesores', 'idx_profesores_nivel_id');
    await queryInterface.removeIndex('profesores', 'idx_profesores_asignatura_id');

    // Eliminar columnas
    await queryInterface.removeColumn('syllabi', 'profesor_id');
    await queryInterface.removeColumn('profesores', 'paralelo_id');
    await queryInterface.removeColumn('profesores', 'nivel_id');
    await queryInterface.removeColumn('profesores', 'asignatura_id');
  }
};
