'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('titulos_extraidos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      session_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'ID único de la sesión de extracción'
      },
      nombre_archivo: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      tipo_archivo: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Excel o Word'
      },
      titulo: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      tipo: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'cabecera, titulo_seccion, campo'
      },
      fila: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      columna: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      columna_letra: {
        type: Sequelize.STRING(5),
        allowNull: false
      },
      puntuacion: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      caracteristicas: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      texto_original: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índices para mejorar rendimiento
    await queryInterface.addIndex('titulos_extraidos', ['session_id']);
    await queryInterface.addIndex('titulos_extraidos', ['usuario_id']);
    await queryInterface.addIndex('titulos_extraidos', ['tipo']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('titulos_extraidos');
  }
};
