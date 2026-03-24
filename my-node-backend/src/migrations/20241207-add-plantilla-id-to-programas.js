'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar si la columna plantilla_id ya existe
    const tableDescription = await queryInterface.describeTable('programas_analiticos');
    
    if (!tableDescription.plantilla_id) {
      // Agregar la columna plantilla_id a la tabla programas_analiticos
      await queryInterface.addColumn('programas_analiticos', 'plantilla_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'plantillas_programa',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });

      // Crear índice para mejorar rendimiento de consultas
      await queryInterface.addIndex('programas_analiticos', ['plantilla_id'], {
        name: 'programas_analiticos_plantilla_id_idx'
      });

      console.log('✅ Columna plantilla_id agregada a programas_analiticos');
    } else {
      console.log('ℹ️  Columna plantilla_id ya existe en programas_analiticos, saltando...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar el índice primero
    await queryInterface.removeIndex('programas_analiticos', 'programas_analiticos_plantilla_id_idx');
    
    // Eliminar la columna
    await queryInterface.removeColumn('programas_analiticos', 'plantilla_id');
    
    console.log('❌ Columna plantilla_id eliminada de programas_analiticos');
  }
};
