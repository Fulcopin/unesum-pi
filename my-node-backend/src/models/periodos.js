const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('periodos', {
    id: {
      autoIncrement: true,
      autoIncrementIdentity: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    codigo: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: "periodos_codigo_key"
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "periodos_nombre_key"
    },
    fecha_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: true // ✅ Cambiar a true temporalmente para permitir migración
    },
    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: true // ✅ Cambiar a true temporalmente para permitir migración
    },
    estado: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: "proximo"
    }
  }, {
    sequelize,
    tableName: 'periodos',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    indexes: [
      {
        name: "periodos_nombre_key",
        unique: true,
        fields: [
          { name: "nombre" },
        ]
      },
      {
        name: "periodos_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
