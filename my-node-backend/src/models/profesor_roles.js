const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('profesor_roles', {
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
    rol_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'roles', key: 'id' },
      onDelete: 'CASCADE'
    }
  }, {
    sequelize,
    tableName: 'profesor_roles',
    schema: 'public',
    timestamps: true,
    indexes: [
      { name: 'profesor_roles_pkey',   unique: true, fields: [{ name: 'id' }] },
      { name: 'profesor_roles_unique', unique: true, fields: [{ name: 'profesor_id' }, { name: 'rol_id' }] },
      { name: 'idx_prof_rol_profesor', fields: [{ name: 'profesor_id' }] },
      { name: 'idx_prof_rol_rol',      fields: [{ name: 'rol_id' }] }
    ]
  });
};
