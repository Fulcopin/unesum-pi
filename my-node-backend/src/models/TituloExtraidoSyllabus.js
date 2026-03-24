// Modelo: TituloExtraidoSyllabus.js
// Representa un título extraído de un documento Syllabus (Excel/Word)

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TituloExtraidoSyllabus = sequelize.define('TituloExtraidoSyllabus', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'ID único de la sesión de extracción'
    },
    nombre_archivo: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Nombre del archivo original subido'
    },
    tipo_archivo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Tipo de archivo: xlsx, docx, doc'
    },
    periodo_academico: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Periodo académico asociado (ej: 2025-1)'
    },
    periodo_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'periodos',
        key: 'id'
      },
      comment: 'ID del periodo académico'
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      comment: 'ID del usuario que realizó la extracción'
    },
    titulo: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Texto del título extraído'
    },
    tipo: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Tipo o categoría del título'
    },
    fila: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Número de fila en el documento original'
    },
    columna: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Número de columna en el documento original'
    },
    columna_letra: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Letra de la columna (A, B, C, etc.)'
    },
    puntuacion: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Puntuación de confianza de la detección'
    },
    tiene_dos_puntos: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si el título termina con dos puntos'
    },
    longitud_texto: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Longitud del texto del título'
    },
    es_mayuscula: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si el título está en mayúsculas'
    },
    es_negrita: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si el título está en negrita'
    },
    nivel_jerarquia: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Nivel jerárquico del título (1=principal, 2=subtítulo, etc.)'
    }
  }, {
    tableName: 'titulos_extraidos_syllabus',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_titulos_syllabus_session',
        fields: ['session_id']
      },
      {
        name: 'idx_titulos_syllabus_usuario',
        fields: ['usuario_id']
      },
      {
        name: 'idx_titulos_syllabus_archivo',
        fields: ['nombre_archivo']
      },
      {
        name: 'idx_titulos_syllabus_periodo',
        fields: ['periodo_id']
      }
    ]
  });

  // Asociaciones
  TituloExtraidoSyllabus.associate = function(models) {
    // Relación con Usuario (el que subió el archivo)
    TituloExtraidoSyllabus.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario'
    });
    
    // Relación con Periodo
    if (models.Periodo) {
      TituloExtraidoSyllabus.belongsTo(models.Periodo, {
        foreignKey: 'periodo_id',
        as: 'periodo'
      });
    }
  };

  return TituloExtraidoSyllabus;
};
