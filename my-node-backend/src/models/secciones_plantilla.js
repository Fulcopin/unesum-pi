const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  const SeccionPlantilla = sequelize.define('secciones_plantilla', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    plantilla_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'plantillas_programa',
        key: 'id'
      }
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tipo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'texto_corto, texto_largo, tabla, lista'
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    obligatoria: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    config_json: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'secciones_plantilla',
    schema: 'public',
    timestamps: false,
    createdAt: 'created_at',
    underscored: true,
    indexes: [
      {
        name: "secciones_plantilla_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "secciones_plantilla_plantilla_orden_idx",
        fields: [
          { name: "plantilla_id" },
          { name: "orden" }
        ]
      }
    ]
  });

  SeccionPlantilla.associate = function(models) {
    SeccionPlantilla.belongsTo(models.PlantillaPrograma, {
      as: 'plantilla',
      foreignKey: 'plantilla_id'
    });
    
    SeccionPlantilla.hasMany(models.CampoSeccion, {
      as: 'campos',
      foreignKey: 'seccion_id'
    });
    
    SeccionPlantilla.hasMany(models.ContenidoPrograma, {
      as: 'contenidos',
      foreignKey: 'seccion_plantilla_id'
    });
  };

  return SeccionPlantilla;
};
