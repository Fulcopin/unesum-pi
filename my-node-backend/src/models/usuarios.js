const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('usuarios', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nombres: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    apellidos: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    cedula_identidad: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: "usuarios_cedula_identidad_key6"
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    correo_electronico: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "usuarios_correo_electronico_key6"
    },
    fecha_nacimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    direccion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rol: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    facultad: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    carrera: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    carrera_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'carreras',
        key: 'id'
      }
    },
    'contraseña': {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'usuarios',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "usuarios_cedula_identidad_key",
        unique: true,
        fields: [
          { name: "cedula_identidad" },
        ]
      },
      {
        name: "usuarios_cedula_identidad_key1",
        unique: true,
        fields: [
          { name: "cedula_identidad" },
        ]
      },
      {
        name: "usuarios_cedula_identidad_key2",
        unique: true,
        fields: [
          { name: "cedula_identidad" },
        ]
      },
      {
        name: "usuarios_cedula_identidad_key3",
        unique: true,
        fields: [
          { name: "cedula_identidad" },
        ]
      },
      {
        name: "usuarios_cedula_identidad_key4",
        unique: true,
        fields: [
          { name: "cedula_identidad" },
        ]
      },
      {
        name: "usuarios_cedula_identidad_key5",
        unique: true,
        fields: [
          { name: "cedula_identidad" },
        ]
      },
      {
        name: "usuarios_cedula_identidad_key6",
        unique: true,
        fields: [
          { name: "cedula_identidad" },
        ]
      },
      {
        name: "usuarios_correo_electronico_key",
        unique: true,
        fields: [
          { name: "correo_electronico" },
        ]
      },
      {
        name: "usuarios_correo_electronico_key1",
        unique: true,
        fields: [
          { name: "correo_electronico" },
        ]
      },
      {
        name: "usuarios_correo_electronico_key2",
        unique: true,
        fields: [
          { name: "correo_electronico" },
        ]
      },
      {
        name: "usuarios_correo_electronico_key3",
        unique: true,
        fields: [
          { name: "correo_electronico" },
        ]
      },
      {
        name: "usuarios_correo_electronico_key4",
        unique: true,
        fields: [
          { name: "correo_electronico" },
        ]
      },
      {
        name: "usuarios_correo_electronico_key5",
        unique: true,
        fields: [
          { name: "correo_electronico" },
        ]
      },
      {
        name: "usuarios_correo_electronico_key6",
        unique: true,
        fields: [
          { name: "correo_electronico" },
        ]
      },
      {
        name: "usuarios_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
