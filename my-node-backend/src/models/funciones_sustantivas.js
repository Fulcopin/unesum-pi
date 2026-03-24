const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('funciones_sustantivas', {
    id: {
      autoIncrement: true,
      autoIncrementIdentity: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    codigo: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: "funciones_sustantivas_codigo_key"
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    estado: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "activo"
    }
  }, {
    sequelize,
    tableName: 'funciones_sustantivas',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "funciones_sustantivas_codigo_key",
        unique: true,
        fields: [
          { name: "codigo" },
        ]
      },
      {
        name: "funciones_sustantivas_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_estado_funciones_sustantivas",
        fields: [
          { name: "estado" },
        ]
      },
    ]
  });
};
