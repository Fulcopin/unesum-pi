module.exports = (sequelize, DataTypes) => {
  const AgrupacionTitulo = sequelize.define('AgrupacionTitulo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    session_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'ID de la sesión de extracción de títulos'
    },
    nombre_pestana: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nombre de la pestaña/viñeta que verá el docente'
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción opcional de la pestaña'
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Orden de aparición de la pestaña'
    },
    titulo_ids: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false,
      defaultValue: [],
      comment: 'Array de IDs de títulos que pertenecen a esta pestaña'
    },
    color: {
      type: DataTypes.STRING(20),
      defaultValue: 'blue',
      comment: 'Color del badge: blue, purple, green, red, yellow'
    },
    icono: {
      type: DataTypes.STRING(50),
      defaultValue: '📋',
      comment: 'Emoji o icono para la pestaña'
    }
  }, {
    tableName: 'agrupaciones_titulos',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_agrupaciones_session',
        fields: ['session_id']
      },
      {
        name: 'idx_agrupaciones_orden',
        fields: ['session_id', 'orden']
      }
    ]
  });

  return AgrupacionTitulo;
};
