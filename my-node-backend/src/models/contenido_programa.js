// models/contenido_programa.js
module.exports = (sequelize, DataTypes) => {
  const ContenidoPrograma = sequelize.define('ContenidoPrograma', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    programa_analitico_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'programas_analiticos',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    seccion_plantilla_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'secciones_plantilla',
        key: 'id'
      }
    },
    contenido_texto: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Para secciones de tipo texto_largo'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'contenido_programa',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });

  ContenidoPrograma.associate = (models) => {
    // Pertenece a un programa analítico
    ContenidoPrograma.belongsTo(models.ProgramasAnaliticos, {
      foreignKey: 'programa_analitico_id',
      as: 'programa'
    });

    // Pertenece a una sección de plantilla
    ContenidoPrograma.belongsTo(models.SeccionPlantilla, {
      foreignKey: 'seccion_plantilla_id',
      as: 'seccion'
    });

    // Tiene muchas filas de tabla (si es tipo tabla)
    ContenidoPrograma.hasMany(models.FilaTablaPrograma, {
      foreignKey: 'contenido_programa_id',
      as: 'filas'
    });
  };

  return ContenidoPrograma;
};
