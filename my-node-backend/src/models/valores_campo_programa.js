// models/valores_campo_programa.js
module.exports = (sequelize, DataTypes) => {
  const ValorCampoPrograma = sequelize.define('ValorCampoPrograma', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fila_tabla_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'filas_tabla_programa',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    campo_seccion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'campos_seccion',
        key: 'id'
      }
    },
    valor: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Valor de la celda'
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
    tableName: 'valores_campo_programa',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });

  ValorCampoPrograma.associate = (models) => {
    // Pertenece a una fila de tabla
    ValorCampoPrograma.belongsTo(models.FilaTablaPrograma, {
      foreignKey: 'fila_tabla_id',
      as: 'fila'
    });

    // Pertenece a un campo de sección (define qué columna es)
    ValorCampoPrograma.belongsTo(models.CampoSeccion, {
      foreignKey: 'campo_seccion_id',
      as: 'campo'
    });
  };

  return ValorCampoPrograma;
};
