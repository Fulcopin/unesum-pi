// SyllabusComisionAcademica.js
// Modelo para syllabus completos subidos por la Comisión Académica

module.exports = (sequelize, DataTypes) => {
  const SyllabusComisionAcademica = sequelize.define('SyllabusComisionAcademica', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'ID único de la sesión (opcional)'
    },
    nombre_archivo: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nombre del archivo subido'
    },
    asignatura_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'ID de la asignatura asociada'
    },
    periodo_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del periodo académico'
    },
    periodo: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Periodo académico (texto o ID como string)'
    },
    periodo_academico: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nombre del periodo académico'
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del usuario que subió el archivo'
    },
    nombre: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Nombre del syllabus'
    },
    materias: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Materia(s) asociada(s)'
    },
    datos_syllabus: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Datos del syllabus en formato JSON (editor)'
    },
    datos_json: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Datos completos del syllabus en formato JSON (excel)'
    },
    estado: {
      type: DataTypes.STRING(20),
      defaultValue: 'activo',
      comment: 'Estado: activo, inactivo'
    }
  }, {
    tableName: 'syllabus_comision_academica',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_sca_asignatura_periodo',
        unique: true,
        fields: ['asignatura_id', 'periodo']
      },
      {
        name: 'idx_sca_periodo',
        fields: ['periodo']
      },
      {
        name: 'idx_sca_usuario',
        fields: ['usuario_id']
      }
    ]
  });

  SyllabusComisionAcademica.associate = (models) => {
    if (models.Periodo) {
      SyllabusComisionAcademica.belongsTo(models.Periodo, {
        foreignKey: 'periodo_id',
        as: 'periodo_rel'
      });
    }
    if (models.Asignatura) {
      SyllabusComisionAcademica.belongsTo(models.Asignatura, {
        foreignKey: 'asignatura_id',
        as: 'asignatura'
      });
    }
  };

  return SyllabusComisionAcademica;
};
