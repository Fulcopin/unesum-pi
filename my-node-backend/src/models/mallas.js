const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('mallas', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    codigo_malla: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "mallas_codigo_malla_key1"
    },
    facultad_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'facultades',
        key: 'id'
      }
    },
    carrera_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'carreras',
        key: 'id'
      }
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'mallas',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "mallas_codigo_malla_key",
        unique: true,
        fields: [
          { name: "codigo_malla" },
        ]
      },
      {
        name: "mallas_codigo_malla_key1",
        unique: true,
        fields: [
          { name: "codigo_malla" },
        ]
      },
      {
        name: "mallas_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
