const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  const CampoSeccion = sequelize.define('campos_seccion', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    seccion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'secciones_plantilla',
        key: 'id'
      }
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    etiqueta: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    tipo_campo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'text, textarea, number, date, select, checkbox, radio, file'
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    requerido: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    placeholder: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    opciones_json: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    validacion_json: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'campos_seccion',
    schema: 'public',
    timestamps: false,
    createdAt: 'created_at',
    underscored: true,
    indexes: [
      {
        name: "campos_seccion_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "campos_seccion_seccion_orden_idx",
        fields: [
          { name: "seccion_id" },
          { name: "orden" }
        ]
      }
    ]
  });

  CampoSeccion.associate = function(models) {
    CampoSeccion.belongsTo(models.SeccionPlantilla, {
      as: 'seccion',
      foreignKey: 'seccion_id'
    });
    
    CampoSeccion.hasMany(models.ValorCampoPrograma, {
      as: 'valores',
      foreignKey: 'campo_seccion_id'
    });
  };

  return CampoSeccion;
};
