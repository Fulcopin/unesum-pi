'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agregar columna asignatura_id a la tabla syllabi
    await queryInterface.addColumn('syllabi', 'asignatura_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: {
        model: 'asignaturas',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      after: 'materias' // Posicionar después de la columna materias
    });

    // Crear índice para mejorar rendimiento de búsquedas
    await queryInterface.addIndex('syllabi', ['asignatura_id'], {
      name: 'idx_syllabi_asignatura_id'
    });

    // Crear índice compuesto para validación de duplicados
    await queryInterface.addIndex('syllabi', ['usuario_id', 'periodo', 'asignatura_id', 'deleted_at'], {
      name: 'idx_syllabi_unique_validation'
    });

    console.log('✅ Columna asignatura_id agregada exitosamente a syllabi');
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar índices
    await queryInterface.removeIndex('syllabi', 'idx_syllabi_unique_validation');
    await queryInterface.removeIndex('syllabi', 'idx_syllabi_asignatura_id');
    
    // Eliminar columna
    await queryInterface.removeColumn('syllabi', 'asignatura_id');
    
    console.log('✅ Columna asignatura_id eliminada de syllabi');
  }
};
