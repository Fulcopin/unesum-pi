const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('profesores', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nombres: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    apellidos: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "profesores_email_key"
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    carrera_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'carreras',
        key: 'id'
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    asignatura_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'asignaturas',
        key: 'id'
      }
    },
    nivel_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'nivel',
        key: 'id'
      }
    },
    paralelo_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'paralelo',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'profesores',
    schema: 'public',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        name: "idx_profesores_asignatura_id",
        fields: [
          { name: "asignatura_id" },
        ]
      },
      {
        name: "idx_profesores_carrera_id",
        fields: [
          { name: "carrera_id" },
        ]
      },
      {
        name: "idx_profesores_nivel_id",
        fields: [
          { name: "nivel_id" },
        ]
      },
      {
        name: "idx_profesores_paralelo_id",
        fields: [
          { name: "paralelo_id" },
        ]
      },
      {
        name: "profesores_email_key",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "profesores_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
