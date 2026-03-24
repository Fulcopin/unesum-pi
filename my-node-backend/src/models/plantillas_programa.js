const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  const PlantillaPrograma = sequelize.define('plantillas_programa', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
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
      defaultValue: 'general',
      allowNull: false
    },
    activa: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    usuario_creador_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'plantillas_programa',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "plantillas_programa_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });

  PlantillaPrograma.associate = function(models) {
    PlantillaPrograma.belongsTo(models.Usuario, {
      as: 'creador',
      foreignKey: 'usuario_creador_id'
    });
    
    PlantillaPrograma.hasMany(models.SeccionPlantilla, {
      as: 'secciones',
      foreignKey: 'plantilla_id'
    });
    
    PlantillaPrograma.hasMany(models.ProgramasAnaliticos, {
      as: 'programas',
      foreignKey: 'plantilla_id'
    });
  };

  return PlantillaPrograma;
};
