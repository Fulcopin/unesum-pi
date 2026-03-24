const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  const AsignacionProgramaDocente = sequelize.define('asignaciones_programa_docente', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    programa_analitico_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'programas_analiticos',
        key: 'id'
      }
    },
    profesor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'profesores',
        key: 'id'
      }
    },
    asignatura_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'asignaturas',
        key: 'id'
      }
    },
    nivel_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'nivel',
        key: 'id'
      }
    },
    paralelo_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'paralelo',
        key: 'id'
      }
    },
    periodo_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'periodos',
        key: 'id'
      }
    },
    estado: {
      type: DataTypes.STRING(50),
      defaultValue: 'pendiente',
      allowNull: false
    },
    fecha_asignacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    fecha_completado: {
      type: DataTypes.DATE,
      allowNull: true
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'asignaciones_programa_docente',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "asignaciones_programa_docente_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "unique_asignacion_por_periodo",
        unique: true,
        fields: [
          { name: "programa_analitico_id" },
          { name: "profesor_id" },
          { name: "periodo_id" }
        ]
      }
    ]
  });

  AsignacionProgramaDocente.associate = function(models) {
    AsignacionProgramaDocente.belongsTo(models.ProgramasAnaliticos, {
      as: 'programa',
      foreignKey: 'programa_analitico_id'
    });
    
    AsignacionProgramaDocente.belongsTo(models.Profesores, {
      as: 'profesor',
      foreignKey: 'profesor_id'
    });
    
    AsignacionProgramaDocente.belongsTo(models.Asignaturas, {
      as: 'asignatura',
      foreignKey: 'asignatura_id'
    });
    
    AsignacionProgramaDocente.belongsTo(models.Nivel, {
      as: 'nivel',
      foreignKey: 'nivel_id'
    });
    
    AsignacionProgramaDocente.belongsTo(models.Paralelo, {
      as: 'paralelo',
      foreignKey: 'paralelo_id'
    });
    
    AsignacionProgramaDocente.belongsTo(models.Periodos, {
      as: 'periodo',
      foreignKey: 'periodo_id'
    });
  };

  return AsignacionProgramaDocente;
};
