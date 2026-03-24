'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('usuarios', 'facultad', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Nombre de la facultad a la que pertenece el usuario (para comisión académica)'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('usuarios', 'facultad');
  }
};
