const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('nivel', {
    id: {
      autoIncrement: true,
      autoIncrementIdentity: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    codigo: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    ordinal: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    romano: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    estado: {
      type: DataTypes.STRING(15),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'nivel',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "nivel_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
