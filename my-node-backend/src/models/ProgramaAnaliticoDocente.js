// ProgramaAnaliticoDocente.js
// Modelo para programas analíticos editados por el docente

module.exports = (sequelize, DataTypes) => {
  const ProgramaAnaliticoDocente = sequelize.define('ProgramaAnaliticoDocente', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    profesor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID del profesor que editó el programa'
    },
    programa_comision_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID del programa original de la comisión'
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
      comment: 'Nombre del programa analítico'
    },
    datos_programa: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Datos del programa editado por el docente en formato JSON'
    },
    estado: {
      type: DataTypes.STRING(20),
      defaultValue: 'borrador',
      comment: 'Estado: borrador, enviado, aprobado'
    }
  }, {
    tableName: 'programa_analitico_docente',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_pad_profesor_asignatura_periodo',
        unique: true,
        fields: ['profesor_id', 'asignatura_id', 'periodo']
      },
      {
        name: 'idx_pad_profesor',
        fields: ['profesor_id']
      }
    ]
  });

  ProgramaAnaliticoDocente.associate = (models) => {
    if (models.Profesor) {
      ProgramaAnaliticoDocente.belongsTo(models.Profesor, {
        foreignKey: 'profesor_id',
        as: 'profesor'
      });
    }
  };

  return ProgramaAnaliticoDocente;
};
