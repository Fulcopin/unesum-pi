const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('profesor_paralelos', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    profesor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'profesores', key: 'id' },
      onDelete: 'CASCADE'
    },
    paralelo_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'paralelo', key: 'id' },
      onDelete: 'CASCADE'
    }
  }, {
    sequelize,
    tableName: 'profesor_paralelos',
    schema: 'public',
    timestamps: true,
    indexes: [
      { name: 'profesor_paralelos_pkey',   unique: true, fields: [{ name: 'id' }] },
      { name: 'profesor_paralelos_unique', unique: true, fields: [{ name: 'profesor_id' }, { name: 'paralelo_id' }] },
      { name: 'idx_prof_par_profesor',     fields: [{ name: 'profesor_id' }] },
      { name: 'idx_prof_par_paralelo',     fields: [{ name: 'paralelo_id' }] }
    ]
  });
};
