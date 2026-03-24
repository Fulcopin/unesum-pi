const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('playing_with_neon', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    value: {
      type: DataTypes.REAL,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'playing_with_neon',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "playing_with_neon_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
