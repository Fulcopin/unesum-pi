// SyllabusDocente.js
// Modelo para syllabus completados por el docente

module.exports = (sequelize, DataTypes) => {
  const SyllabusDocente = sequelize.define('SyllabusDocente', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    profesor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID del profesor que editó el syllabus'
    },
    syllabus_comision_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del syllabus original de la comisión'
    },
    asignatura_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'ID de la asignatura asociada'
    },
    periodo: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Periodo académico'
    },
    nombre: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Nombre del syllabus'
    },
    datos_syllabus: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Datos del syllabus editado por el docente en formato JSON'
    },
    estado: {
      type: DataTypes.STRING(20),
      defaultValue: 'borrador',
      comment: 'Estado: borrador, enviado, aprobado'
    }
  }, {
    tableName: 'syllabus_docente',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_sd_profesor_asignatura_periodo',
        unique: true,
        fields: ['profesor_id', 'asignatura_id', 'periodo']
      },
      {
        name: 'idx_sd_profesor',
        fields: ['profesor_id']
      }
    ]
  });

  SyllabusDocente.associate = (models) => {
    if (models.Profesor) {
      SyllabusDocente.belongsTo(models.Profesor, {
        foreignKey: 'profesor_id',
        as: 'profesor'
      });
    }
    if (models.SyllabusComisionAcademica) {
      SyllabusDocente.belongsTo(models.SyllabusComisionAcademica, {
        foreignKey: 'syllabus_comision_id',
        as: 'syllabus_comision'
      });
    }
  };

  return SyllabusDocente;
};
