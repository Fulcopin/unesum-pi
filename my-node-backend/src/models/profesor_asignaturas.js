// Tabla intermedia para la relación muchos-a-muchos entre profesores y asignaturas
const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('profesor_asignaturas', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    profesor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'profesores',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    asignatura_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'asignaturas',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    sequelize,
    tableName: 'profesor_asignaturas',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "profesor_asignaturas_pkey",
        unique: true,
        fields: [{ name: "id" }]
      },
      {
        name: "profesor_asignaturas_unique",
        unique: true,
        fields: [{ name: "profesor_id" }, { name: "asignatura_id" }]
      },
      {
        name: "idx_profesor_asignaturas_profesor",
        fields: [{ name: "profesor_id" }]
      },
      {
        name: "idx_profesor_asignaturas_asignatura",
        fields: [{ name: "asignatura_id" }]
      }
    ]
  });
};
