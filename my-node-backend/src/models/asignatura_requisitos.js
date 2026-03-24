const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('asignatura_requisitos', {
    asignatura_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'asignaturas',
        key: 'id'
      }
    },
    requisito_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'asignaturas',
        key: 'id'
      }
    },
    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      primaryKey: true
    }
  }, {
    sequelize,
    tableName: 'asignatura_requisitos',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "asignatura_requisitos_pkey",
        unique: true,
        fields: [
          { name: "asignatura_id" },
          { name: "requisito_id" },
          { name: "tipo" },
        ]
      },
    ]
  });
};
