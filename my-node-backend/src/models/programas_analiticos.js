const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('programas_analiticos', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    periodo: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    datos_tabla: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    plantilla_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'plantillas_programa',
        key: 'id'
      }
    },
    asignatura_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'asignaturas',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'programas_analiticos',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "programas_analiticos_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
