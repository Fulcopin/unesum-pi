const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('distribucion_horas', {
    asignatura_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'asignaturas',
        key: 'id'
      }
    },
    horas_docencia: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    horas_practica: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    horas_autonoma: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    horas_vinculacion: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    horas_practica_preprofesional: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'distribucion_horas',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "distribucion_horas_pkey",
        unique: true,
        fields: [
          { name: "asignatura_id" },
        ]
      },
    ]
  });
};
