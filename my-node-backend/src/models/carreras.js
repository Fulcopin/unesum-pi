const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('carreras', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "carreras_nombre_key"
    },
    facultad_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'facultades',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'carreras',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "carreras_nombre_key",
        unique: true,
        fields: [
          { name: "nombre" },
        ]
      },
      {
        name: "carreras_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_carreras_facultad_id",
        fields: [
          { name: "facultad_id" },
        ]
      },
    ]
  });
};
