'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('usuarios', 'carrera_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'carreras',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Carrera asignada al usuario (para comisión académica de carrera específica)'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('usuarios', 'carrera_id');
  }
};
