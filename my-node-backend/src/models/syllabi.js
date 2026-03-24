const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('syllabi', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    periodo: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    materias: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    asignatura_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'asignaturas',
        key: 'id'
      }
    },
    datos_syllabus: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    usuario_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    profesor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'profesores',
        key: 'id'
      }
    },
    es_plantilla_referencia: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    titulos_extraidos: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'syllabi',
    schema: 'public',
    hasTrigger: true,
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        name: "idx_syllabi_materias",
        fields: [
          { name: "materias" },
        ]
      },
      {
        name: "idx_syllabi_periodo",
        fields: [
          { name: "periodo" },
        ]
      },
      {
        name: "idx_syllabi_profesor_id",
        fields: [
          { name: "profesor_id" },
        ]
      },
      {
        name: "idx_syllabi_usuario_id",
        fields: [
          { name: "usuario_id" },
        ]
      },
      {
        name: "syllabi_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
