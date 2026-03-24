'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar campo es_plantilla_referencia a la tabla syllabi
    await queryInterface.addColumn('syllabi', 'es_plantilla_referencia', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica si este syllabus es la plantilla de referencia del admin para el periodo'
    });
    
    // Agregar campo titulos_extraidos para almacenar los títulos en negrita
    await queryInterface.addColumn('syllabi', 'titulos_extraidos', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Array de títulos en negrita extraídos del documento'
    });
    
    // Agregar índice para facilitar búsqueda de plantillas por periodo
    await queryInterface.addIndex('syllabi', ['periodo', 'es_plantilla_referencia'], {
      name: 'idx_syllabi_plantilla_periodo',
      where: {
        es_plantilla_referencia: true
      }
    });
    
    console.log('✅ Columnas es_plantilla_referencia y titulos_extraidos agregadas a syllabi');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('syllabi', 'idx_syllabi_plantilla_periodo');
    await queryInterface.removeColumn('syllabi', 'titulos_extraidos');
    await queryInterface.removeColumn('syllabi', 'es_plantilla_referencia');
    
    console.log('✅ Columnas es_plantilla_referencia y titulos_extraidos eliminadas de syllabi');
  }
};
