const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('unidades_tematicas', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    asignatura_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'asignaturas',
        key: 'id'
      }
    },
    nombre_unidad: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resultados_aprendizaje: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    numero_unidad: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'unidades_tematicas',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "unidades_tematicas_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
