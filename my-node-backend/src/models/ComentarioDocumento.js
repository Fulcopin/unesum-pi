// ComentarioDocumento.js
// Modelo para comentarios/retroalimentación sobre syllabus y programas analíticos del docente

module.exports = (sequelize, DataTypes) => {
  const ComentarioDocumento = sequelize.define('ComentarioDocumento', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    documento_tipo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Tipo de documento: syllabus | programa',
    },
    documento_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID del registro en syllabus_docente o programa_analitico_docente',
    },
    comentario: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    autor_nombre: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Nombre completo del autor al momento de publicar',
    },
    autor_rol: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Rol del autor: comision_academica, comision, docente, profesor, administrador, etc.',
    },
    autor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID del usuario o profesor que escribió el comentario',
    },
    leido: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si el docente ya leyó este comentario',
    },
  }, {
    tableName: 'comentarios_documento',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['documento_tipo', 'documento_id'] },
      { fields: ['autor_id', 'autor_rol'] },
    ],
  });

  return ComentarioDocumento;
};
