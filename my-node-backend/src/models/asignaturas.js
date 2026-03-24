const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('asignaturas', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "asignaturas_codigo_key"
    },
    estado: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: "activo"
    },
    carrera_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'carreras',
        key: 'id'
      }
    },
    nivel_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'nivel',
        key: 'id'
      }
    },
    organizacion_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'organizacion',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'asignaturas',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "asignaturas_codigo_key",
        unique: true,
        fields: [
          { name: "codigo" },
        ]
      },
      {
        name: "asignaturas_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
