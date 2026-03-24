'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agregar columna asignatura_id a la tabla programa_analitico
    await queryInterface.addColumn('programa_analitico', 'asignatura_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: {
        model: 'asignaturas',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Crear índice para mejorar rendimiento de búsquedas
    await queryInterface.addIndex('programa_analitico', ['asignatura_id'], {
      name: 'idx_programa_analitico_asignatura_id'
    });

    // Crear índice compuesto para validación de duplicados
    await queryInterface.addIndex('programa_analitico', ['usuario_id', 'asignatura_id', 'deleted_at'], {
      name: 'idx_programa_analitico_unique_validation',
      where: {
        deleted_at: null // Solo para registros no eliminados
      }
    });

    console.log('✅ Columna asignatura_id agregada exitosamente a programa_analitico');
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar índices
    await queryInterface.removeIndex('programa_analitico', 'idx_programa_analitico_unique_validation');
    await queryInterface.removeIndex('programa_analitico', 'idx_programa_analitico_asignatura_id');
    
    // Eliminar columna
    await queryInterface.removeColumn('programa_analitico', 'asignatura_id');
    
    console.log('✅ Columna asignatura_id eliminada de programa_analitico');
  }
};
