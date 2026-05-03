const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('profesor_niveles', {
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
    nivel_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'nivel', key: 'id' },
      onDelete: 'CASCADE'
    }
  }, {
    sequelize,
    tableName: 'profesor_niveles',
    schema: 'public',
    timestamps: true,
    indexes: [
      { name: 'profesor_niveles_pkey',   unique: true, fields: [{ name: 'id' }] },
      { name: 'profesor_niveles_unique', unique: true, fields: [{ name: 'profesor_id' }, { name: 'nivel_id' }] },
      { name: 'idx_prof_niv_profesor',   fields: [{ name: 'profesor_id' }] },
      { name: 'idx_prof_niv_nivel',      fields: [{ name: 'nivel_id' }] }
    ]
  });
};
