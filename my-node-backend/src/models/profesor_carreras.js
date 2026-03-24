// Tabla intermedia para la relación muchos-a-muchos entre profesores y carreras
const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('profesor_carreras', {
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
    carrera_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'carreras',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    sequelize,
    tableName: 'profesor_carreras',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "profesor_carreras_pkey",
        unique: true,
        fields: [{ name: "id" }]
      },
      {
        name: "profesor_carreras_unique",
        unique: true,
        fields: [{ name: "profesor_id" }, { name: "carrera_id" }]
      },
      {
        name: "idx_profesor_carreras_profesor",
        fields: [{ name: "profesor_id" }]
      },
      {
        name: "idx_profesor_carreras_carrera",
        fields: [{ name: "carrera_id" }]
      }
    ]
  });
};
