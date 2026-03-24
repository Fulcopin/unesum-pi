const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('clasificacion_academica', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    campo_amplio: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    campo_detallado: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    campo_especifico: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    carrera_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'carreras',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'clasificacion_academica',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "clasificacion_academica_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
