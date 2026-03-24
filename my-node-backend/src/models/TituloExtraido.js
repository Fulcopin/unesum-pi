const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  const TituloExtraido = sequelize.define('TituloExtraido', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    session_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'ID único de la sesión de extracción'
    },
    nombre_archivo: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    tipo_archivo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Excel o Word'
    },
    titulo: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    tipo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'cabecera, titulo_seccion, campo'
    },
    fila: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    columna: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    columna_letra: {
      type: DataTypes.STRING(5),
      allowNull: false
    },
    puntuacion: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    caracteristicas: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    texto_original: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'titulos_extraidos',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "titulos_extraidos_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "titulos_extraidos_session_id_idx",
        fields: [
          { name: "session_id" },
        ]
      },
      {
        name: "titulos_extraidos_tipo_idx",
        fields: [
          { name: "tipo" },
        ]
      }
    ]
  });

  TituloExtraido.associate = function(models) {
    TituloExtraido.belongsTo(models.Usuario, {
      as: 'usuario',
      foreignKey: 'usuario_id'
    });
  };

  return TituloExtraido;
};
