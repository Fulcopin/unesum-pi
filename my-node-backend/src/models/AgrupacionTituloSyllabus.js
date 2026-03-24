// Modelo: AgrupacionTituloSyllabus.js
// Representa una agrupación/pestaña de títulos de Syllabus organizada por el administrador

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AgrupacionTituloSyllabus = sequelize.define('AgrupacionTituloSyllabus', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'ID de la sesión de extracción a la que pertenece'
    },
    nombre_pestana: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nombre de la pestaña/agrupación'
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción opcional de la agrupación'
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Orden de visualización de la pestaña'
    },
    titulo_ids: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false,
      defaultValue: [],
      comment: 'Array de IDs de títulos que pertenecen a esta agrupación'
    },
    color: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Color de la pestaña (blue, green, purple, etc.)'
    },
    icono: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Emoji o icono de la pestaña'
    }
  }, {
    tableName: 'agrupaciones_titulos_syllabus',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_agrupaciones_syllabus_session',
        fields: ['session_id']
      },
      {
        name: 'idx_agrupaciones_syllabus_orden',
        fields: ['orden']
      }
    ]
  });

  // No necesita asociaciones directas con TituloExtraidoSyllabus
  // porque usa un array de IDs en lugar de claves foráneas
  AgrupacionTituloSyllabus.associate = function(models) {
    // Podríamos agregar métodos personalizados para obtener los títulos
    // pero no es necesario definir una asociación Sequelize aquí
  };

  return AgrupacionTituloSyllabus;
};
