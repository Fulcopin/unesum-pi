module.exports = function (sequelize, DataTypes) {
  return sequelize.define('firmas_documento', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    documento_tipo: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    documento_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    etapa: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    usuario_nombre: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    usuario_rol: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    hash_firma: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: 'firmas_documento_hash_firma_key',
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    firmado_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    tableName: 'firmas_documento',
    schema: 'public',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { name: 'firmas_documento_pkey', unique: true, fields: [{ name: 'id' }] },
      { name: 'firmas_documento_hash_firma_key', unique: true, fields: [{ name: 'hash_firma' }] },
      { name: 'idx_firmas_documento_tipo_id', fields: ['documento_tipo', 'documento_id'] },
      { name: 'idx_firmas_etapa', fields: ['etapa'] },
      { name: 'uniq_firmas_doc_etapa', unique: true, fields: ['documento_tipo', 'documento_id', 'etapa'] },
    ],
  });
};
