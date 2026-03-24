// models/filas_tabla_programa.js
module.exports = (sequelize, DataTypes) => {
  const FilaTablaPrograma = sequelize.define('FilaTablaPrograma', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    contenido_programa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'contenido_programa',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Número de fila en la tabla'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'filas_tabla_programa',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true
  });

  FilaTablaPrograma.associate = (models) => {
    // Pertenece a un contenido de programa
    FilaTablaPrograma.belongsTo(models.ContenidoPrograma, {
      foreignKey: 'contenido_programa_id',
      as: 'contenido'
    });

    // Tiene muchos valores de campos (las celdas de la tabla)
    FilaTablaPrograma.hasMany(models.ValorCampoPrograma, {
      foreignKey: 'fila_tabla_id',
      as: 'valores'
    });
  };

  return FilaTablaPrograma;
};
