const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('facultades', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "facultades_nombre_key"
    }
  }, {
    sequelize,
    tableName: 'facultades',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "facultades_nombre_key",
        unique: true,
        fields: [
          { name: "nombre" },
        ]
      },
      {
        name: "facultades_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
