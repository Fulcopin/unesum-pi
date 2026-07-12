const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('metodologias', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: 'activo'
    }
  }, {
    sequelize,
    tableName: 'metodologias',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "metodologias_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
