var DataTypes = require("sequelize").DataTypes;
var _SequelizeMeta = require("./SequelizeMeta");
var _actividades = require("./actividades");
var _asignatura_requisitos = require("./asignatura_requisitos");
var _asignaturas = require("./asignaturas");
var _carreras = require("./carreras");
var _clasificacion_academica = require("./clasificacion_academica");
var _distribucion_horas = require("./distribucion_horas");
var _facultades = require("./facultades");
var _funciones_sustantivas = require("./funciones_sustantivas");
var _mallas = require("./mallas");
var _nivel = require("./nivel");
var _organizacion = require("./organizacion");
var _paralelo = require("./paralelo");
var _periodos = require("./periodos");
var _playing_with_neon = require("./playing_with_neon");
var _profesores = require("./profesores");
var _programas_analiticos = require("./programas_analiticos");
var _sustantivos = require("./sustantivos");
var _syllabi = require("./syllabi");
var _unidades_tematicas = require("./unidades_tematicas");
var _users = require("./users");
var _usuarios = require("./usuarios");

function initModels(sequelize) {
  var SequelizeMeta = _SequelizeMeta(sequelize, DataTypes);
  var actividades = _actividades(sequelize, DataTypes);
  var asignatura_requisitos = _asignatura_requisitos(sequelize, DataTypes);
  var asignaturas = _asignaturas(sequelize, DataTypes);
  var carreras = _carreras(sequelize, DataTypes);
  var clasificacion_academica = _clasificacion_academica(sequelize, DataTypes);
  var distribucion_horas = _distribucion_horas(sequelize, DataTypes);
  var facultades = _facultades(sequelize, DataTypes);
  var funciones_sustantivas = _funciones_sustantivas(sequelize, DataTypes);
  var mallas = _mallas(sequelize, DataTypes);
  var nivel = _nivel(sequelize, DataTypes);
  var organizacion = _organizacion(sequelize, DataTypes);
  var paralelo = _paralelo(sequelize, DataTypes);
  var periodos = _periodos(sequelize, DataTypes);
  var playing_with_neon = _playing_with_neon(sequelize, DataTypes);
  var profesores = _profesores(sequelize, DataTypes);
  var programas_analiticos = _programas_analiticos(sequelize, DataTypes);
  var sustantivos = _sustantivos(sequelize, DataTypes);
  var syllabi = _syllabi(sequelize, DataTypes);
  var unidades_tematicas = _unidades_tematicas(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);
  var usuarios = _usuarios(sequelize, DataTypes);

  asignaturas.belongsToMany(asignaturas, { as: 'requisito_id_asignaturas', through: asignatura_requisitos, foreignKey: "asignatura_id", otherKey: "requisito_id" });
  asignaturas.belongsToMany(asignaturas, { as: 'asignatura_id_asignaturas', through: asignatura_requisitos, foreignKey: "requisito_id", otherKey: "asignatura_id" });
  asignatura_requisitos.belongsTo(asignaturas, { as: "asignatura", foreignKey: "asignatura_id"});
  asignaturas.hasMany(asignatura_requisitos, { as: "asignatura_requisitos", foreignKey: "asignatura_id"});
  asignatura_requisitos.belongsTo(asignaturas, { as: "requisito", foreignKey: "requisito_id"});
  asignaturas.hasMany(asignatura_requisitos, { as: "requisito_asignatura_requisitos", foreignKey: "requisito_id"});
  distribucion_horas.belongsTo(asignaturas, { as: "asignatura", foreignKey: "asignatura_id"});
  asignaturas.hasOne(distribucion_horas, { as: "distribucion_hora", foreignKey: "asignatura_id"});
  profesores.belongsTo(asignaturas, { as: "asignatura", foreignKey: "asignatura_id"});
  asignaturas.hasMany(profesores, { as: "profesores", foreignKey: "asignatura_id"});
  unidades_tematicas.belongsTo(asignaturas, { as: "asignatura", foreignKey: "asignatura_id"});
  asignaturas.hasMany(unidades_tematicas, { as: "unidades_tematicas", foreignKey: "asignatura_id"});
  asignaturas.belongsTo(carreras, { as: "carrera", foreignKey: "carrera_id"});
  carreras.hasMany(asignaturas, { as: "asignaturas", foreignKey: "carrera_id"});
  clasificacion_academica.belongsTo(carreras, { as: "carrera", foreignKey: "carrera_id"});
  carreras.hasMany(clasificacion_academica, { as: "clasificacion_academicas", foreignKey: "carrera_id"});
  mallas.belongsTo(carreras, { as: "carrera", foreignKey: "carrera_id"});
  carreras.hasMany(mallas, { as: "mallas", foreignKey: "carrera_id"});
  profesores.belongsTo(carreras, { as: "carrera", foreignKey: "carrera_id"});
  carreras.hasMany(profesores, { as: "profesores", foreignKey: "carrera_id"});
  carreras.belongsTo(facultades, { as: "facultad", foreignKey: "facultad_id"});
  facultades.hasMany(carreras, { as: "carreras", foreignKey: "facultad_id"});
  mallas.belongsTo(facultades, { as: "facultad", foreignKey: "facultad_id"});
  facultades.hasMany(mallas, { as: "mallas", foreignKey: "facultad_id"});
  asignaturas.belongsTo(nivel, { as: "nivel", foreignKey: "nivel_id"});
  nivel.hasMany(asignaturas, { as: "asignaturas", foreignKey: "nivel_id"});
  profesores.belongsTo(nivel, { as: "nivel", foreignKey: "nivel_id"});
  nivel.hasMany(profesores, { as: "profesores", foreignKey: "nivel_id"});
  asignaturas.belongsTo(organizacion, { as: "organizacion", foreignKey: "organizacion_id"});
  organizacion.hasMany(asignaturas, { as: "asignaturas", foreignKey: "organizacion_id"});
  profesores.belongsTo(paralelo, { as: "paralelo", foreignKey: "paralelo_id"});
  paralelo.hasMany(profesores, { as: "profesores", foreignKey: "paralelo_id"});
  syllabi.belongsTo(asignaturas, { as: "asignatura", foreignKey: "asignatura_id"});
  asignaturas.hasMany(syllabi, { as: "syllabis", foreignKey: "asignatura_id"});
  syllabi.belongsTo(profesores, { as: "profesor", foreignKey: "profesor_id"});
  profesores.hasMany(syllabi, { as: "syllabis", foreignKey: "profesor_id"});
  programas_analiticos.belongsTo(asignaturas, { as: "asignatura", foreignKey: "asignatura_id"});
  asignaturas.hasMany(programas_analiticos, { as: "programas_analiticos", foreignKey: "asignatura_id"});
  sustantivos.belongsTo(users, { as: "usuario", foreignKey: "usuario_id"});
  users.hasMany(sustantivos, { as: "sustantivos", foreignKey: "usuario_id"});
  programas_analiticos.belongsTo(usuarios, { as: "usuario", foreignKey: "usuario_id"});
  usuarios.hasMany(programas_analiticos, { as: "programas_analiticos", foreignKey: "usuario_id"});
  syllabi.belongsTo(usuarios, { as: "usuario", foreignKey: "usuario_id"});
  usuarios.hasMany(syllabi, { as: "syllabis", foreignKey: "usuario_id"});

  return {
    SequelizeMeta,
    actividades,
    asignatura_requisitos,
    asignaturas,
    carreras,
    clasificacion_academica,
    distribucion_horas,
    facultades,
    funciones_sustantivas,
    mallas,
    nivel,
    organizacion,
    paralelo,
    periodos,
    playing_with_neon,
    profesores,
    programas_analiticos,
    sustantivos,
    syllabi,
    unidades_tematicas,
    users,
    usuarios,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
