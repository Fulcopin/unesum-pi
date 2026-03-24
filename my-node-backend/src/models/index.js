// models/index.js

const { sequelize } = require('../config/db');
const Sequelize = require('sequelize');
const User = require('./User');
const Sustantivo = require('./Sustantivo');
const initUsuario = require('./usuarios');
const initFuncionesSustantivas = require('./funciones_sustantivas');
const initActividades = require('./actividades');
const initParalelo= require('./paralelo');
const initNivel= require('./nivel');
const initOrganizacion= require('./organizacion');
const initProgramasAnaliticos = require('./programas_analiticos');
const initFacultad = require('./facultades');
const initCarrera = require('./carreras');
const initProfesor = require('./profesores');
const initSyllabus = require('./syllabi');
const initAsignatura = require('./asignaturas');
const initDistribucionHoras = require('./distribucion_horas');
const initUnidadTematica = require('./unidades_tematicas');
const initAsignaturaRequisito = require('./asignatura_requisitos');
const initperiodo = require('./periodos');
const initMalla = require('./mallas');
// =========================================================================
// --- PASO 1: IMPORTA TU NUEVO MODELO ---
// Asegúrate de que el nombre del archivo sea correcto ('./clasificacion_academica')
// =========================================================================
const initClasificacionAcademica = require('./clasificacion_academica');

// =========================================================================
// --- MODELOS PARA PROGRAMA ANALÍTICO ---
// =========================================================================
const initPlantillaPrograma = require('./plantillas_programa');
const initSeccionPlantilla = require('./secciones_plantilla');
const initCampoSeccion = require('./campos_seccion');
const initAsignacionProgramaDocente = require('./asignaciones_programa_docente');
const initContenidoPrograma = require('./contenido_programa');
const initFilaTablaPrograma = require('./filas_tabla_programa');
const initValorCampoPrograma = require('./valores_campo_programa');
const initTituloExtraido = require('./TituloExtraido');
const initAgrupacionTitulo = require('./AgrupacionTitulo');
// Modelos para Syllabus con pestañas
const initTituloExtraidoSyllabus = require('./TituloExtraidoSyllabus');
const initAgrupacionTituloSyllabus = require('./AgrupacionTituloSyllabus');
const initSyllabusComisionAcademica = require('./SyllabusComisionAcademica');
const initSyllabusDocente = require('./SyllabusDocente');
const initProgramaAnaliticoDocente = require('./ProgramaAnaliticoDocente');
const initProfesorCarrera = require('./profesor_carreras');
const initProfesorAsignatura = require('./profesor_asignaturas');


// Inicializa el modelo Usuario
const Usuario = initUsuario(sequelize, Sequelize.DataTypes);
const FuncionesSustantivas = initFuncionesSustantivas(sequelize, Sequelize.DataTypes); 
const Actividades = initActividades(sequelize, Sequelize.DataTypes);
const Paralelo = initParalelo(sequelize, Sequelize.DataTypes);
const Nivel = initNivel(sequelize, Sequelize.DataTypes);
const Organizacion = initOrganizacion(sequelize, Sequelize.DataTypes);
const ProgramasAnaliticos = initProgramasAnaliticos(sequelize, Sequelize.DataTypes); 
const Facultad = initFacultad(sequelize, Sequelize.DataTypes);
const Carrera = initCarrera(sequelize, Sequelize.DataTypes);
const Profesor = initProfesor(sequelize, Sequelize.DataTypes)
const Syllabus = initSyllabus(sequelize, Sequelize.DataTypes);
const Asignatura = initAsignatura(sequelize, Sequelize.DataTypes);
const DistribucionHoras = initDistribucionHoras(sequelize, Sequelize.DataTypes);
const UnidadTematica = initUnidadTematica(sequelize, Sequelize.DataTypes);
const AsignaturaRequisito = initAsignaturaRequisito(sequelize, Sequelize.DataTypes);
const Periodo = initperiodo(sequelize, Sequelize.DataTypes);
const Malla = initMalla(sequelize, Sequelize.DataTypes);

// =========================================================================
// --- PASO 2: INICIALIZA TU NUEVO MODELO ---
// =========================================================================
const ClasificacionAcademica = initClasificacionAcademica(sequelize, Sequelize.DataTypes);

// =========================================================================
// --- INICIALIZAR MODELOS DE PROGRAMA ANALÍTICO ---
// =========================================================================
const PlantillaPrograma = initPlantillaPrograma(sequelize, Sequelize.DataTypes);
const SeccionPlantilla = initSeccionPlantilla(sequelize, Sequelize.DataTypes);
const CampoSeccion = initCampoSeccion(sequelize, Sequelize.DataTypes);
const AsignacionProgramaDocente = initAsignacionProgramaDocente(sequelize, Sequelize.DataTypes);
const ContenidoPrograma = initContenidoPrograma(sequelize, Sequelize.DataTypes);
const FilaTablaPrograma = initFilaTablaPrograma(sequelize, Sequelize.DataTypes);
const ValorCampoPrograma = initValorCampoPrograma(sequelize, Sequelize.DataTypes);
const TituloExtraido = initTituloExtraido(sequelize, Sequelize.DataTypes);
const AgrupacionTitulo = initAgrupacionTitulo(sequelize, Sequelize.DataTypes);
// Modelos de Syllabus
const TituloExtraidoSyllabus = initTituloExtraidoSyllabus(sequelize, Sequelize.DataTypes);
const AgrupacionTituloSyllabus = initAgrupacionTituloSyllabus(sequelize, Sequelize.DataTypes);
const SyllabusComisionAcademica = initSyllabusComisionAcademica(sequelize, Sequelize.DataTypes);
const SyllabusDocente = initSyllabusDocente(sequelize, Sequelize.DataTypes);
const ProgramaAnaliticoDocente = initProgramaAnaliticoDocente(sequelize, Sequelize.DataTypes);
const ProfesorCarrera = initProfesorCarrera(sequelize, Sequelize.DataTypes);
const ProfesorAsignatura = initProfesorAsignatura(sequelize, Sequelize.DataTypes);


// Definir relaciones
User.hasMany(Sustantivo, { foreignKey: 'usuario_id', as: 'sustantivos' });
Sustantivo.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });

ProgramasAnaliticos.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'creador' });
ProgramasAnaliticos.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });
Asignatura.hasMany(ProgramasAnaliticos, { foreignKey: 'asignatura_id', as: 'programasAnaliticos' });

// Relación entre Actividades y Funciones Sustantivas
Actividades.belongsTo(FuncionesSustantivas, { foreignKey: 'funcion_sustantiva_id', as: 'funcionSustantiva' });
FuncionesSustantivas.hasMany(Actividades, { foreignKey: 'funcion_sustantiva_id', as: 'actividades' });

Facultad.hasMany(Carrera, { foreignKey: 'facultad_id', as: 'carreras' });
Carrera.belongsTo(Facultad, { foreignKey: 'facultad_id', as: 'facultad' });

Carrera.hasMany(Profesor, { foreignKey: 'carrera_id', as: 'profesores' });
Profesor.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });

// Relación muchos-a-muchos: un profesor puede tener múltiples carreras
Profesor.belongsToMany(Carrera, { through: ProfesorCarrera, foreignKey: 'profesor_id', otherKey: 'carrera_id', as: 'carreras' });
Carrera.belongsToMany(Profesor, { through: ProfesorCarrera, foreignKey: 'carrera_id', otherKey: 'profesor_id', as: 'profesoresMultiple' });
Profesor.hasMany(ProfesorCarrera, { foreignKey: 'profesor_id', as: 'profesorCarreras' });
ProfesorCarrera.belongsTo(Profesor, { foreignKey: 'profesor_id', as: 'profesor' });
ProfesorCarrera.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });

Profesor.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });
Asignatura.hasMany(Profesor, { foreignKey: 'asignatura_id', as: 'profesores' });

// Relación muchos-a-muchos: un profesor puede tener múltiples asignaturas
Profesor.belongsToMany(Asignatura, { through: ProfesorAsignatura, foreignKey: 'profesor_id', otherKey: 'asignatura_id', as: 'asignaturas' });
Asignatura.belongsToMany(Profesor, { through: ProfesorAsignatura, foreignKey: 'asignatura_id', otherKey: 'profesor_id', as: 'profesoresMultiple' });
Profesor.hasMany(ProfesorAsignatura, { foreignKey: 'profesor_id', as: 'profesorAsignaturas' });
ProfesorAsignatura.belongsTo(Profesor, { foreignKey: 'profesor_id', as: 'profesor' });
ProfesorAsignatura.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });

Profesor.belongsTo(Nivel, { foreignKey: 'nivel_id', as: 'nivel' });
Nivel.hasMany(Profesor, { foreignKey: 'nivel_id', as: 'profesores' });

Profesor.belongsTo(Paralelo, { foreignKey: 'paralelo_id', as: 'paralelo' });
Paralelo.hasMany(Profesor, { foreignKey: 'paralelo_id', as: 'profesores' });

Syllabus.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'creador' });
Syllabus.belongsTo(Profesor, { foreignKey: 'profesor_id', as: 'profesor' });
Syllabus.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });
Asignatura.hasMany(Syllabus, { foreignKey: 'asignatura_id', as: 'syllabi' });
Profesor.hasMany(Syllabus, { foreignKey: 'profesor_id', as: 'syllabi' });

Carrera.hasMany(Asignatura, { foreignKey: 'carrera_id', as: 'asignaturas' });
Asignatura.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });

Nivel.hasMany(Asignatura, { foreignKey: 'nivel_id', as: 'asignaturas' });
Asignatura.belongsTo(Nivel, { foreignKey: 'nivel_id', as: 'nivel' });

Organizacion.hasMany(Asignatura, { foreignKey: 'organizacion_id', as: 'asignaturas' });
Asignatura.belongsTo(Organizacion, { foreignKey: 'organizacion_id', as: 'organizacion' });

Asignatura.hasOne(DistribucionHoras, { foreignKey: 'asignatura_id', as: 'horas' });
DistribucionHoras.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });

Asignatura.hasMany(UnidadTematica, { foreignKey: 'asignatura_id', as: 'unidades' });
UnidadTematica.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });

// Relación para requisitos (belongsToMany)
Asignatura.belongsToMany(Asignatura, {
  through: AsignaturaRequisito,
  as: 'requisitos',
  foreignKey: 'asignatura_id',
  otherKey: 'requisito_id'
});

// Relación hasMany para poder incluir AsignaturaRequisito directamente
Asignatura.hasMany(AsignaturaRequisito, { foreignKey: 'asignatura_id', as: 'asignatura_requisitos' });
AsignaturaRequisito.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });

// Relación para acceder al requisito desde AsignaturaRequisito
AsignaturaRequisito.belongsTo(Asignatura, { foreignKey: 'requisito_id', as: 'requisito' });

// =========================================================================
// --- PASO 3: DEFINE LAS ASOCIACIONES DE TU NUEVO MODELO ---
// =========================================================================
ClasificacionAcademica.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });
Carrera.hasOne(ClasificacionAcademica, { foreignKey: 'carrera_id', as: 'clasificacion' });

Malla.belongsTo(Facultad, { foreignKey: 'facultad_id', as: 'facultad' });
Facultad.hasMany(Malla, { foreignKey: 'facultad_id', as: 'mallas' });

Malla.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera' });
Carrera.hasMany(Malla, { foreignKey: 'carrera_id', as: 'mallas' });

// =========================================================================
// --- ASOCIACIONES PROGRAMA ANALÍTICO ---
// =========================================================================
// PlantillaPrograma asociaciones
PlantillaPrograma.belongsTo(Usuario, { foreignKey: 'usuario_creador_id', as: 'creador' });
PlantillaPrograma.hasMany(SeccionPlantilla, { foreignKey: 'plantilla_id', as: 'secciones' });
PlantillaPrograma.hasMany(ProgramasAnaliticos, { foreignKey: 'plantilla_id', as: 'programas' });

// SeccionPlantilla asociaciones
SeccionPlantilla.belongsTo(PlantillaPrograma, { foreignKey: 'plantilla_id', as: 'plantilla' });
SeccionPlantilla.hasMany(CampoSeccion, { foreignKey: 'seccion_id', as: 'campos' });

// CampoSeccion asociaciones
CampoSeccion.belongsTo(SeccionPlantilla, { foreignKey: 'seccion_id', as: 'seccion' });

// AsignacionProgramaDocente asociaciones
AsignacionProgramaDocente.belongsTo(ProgramasAnaliticos, { foreignKey: 'programa_id', as: 'programa' });
AsignacionProgramaDocente.belongsTo(Profesor, { foreignKey: 'profesor_id', as: 'profesor' });
AsignacionProgramaDocente.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });
AsignacionProgramaDocente.belongsTo(Nivel, { foreignKey: 'nivel_id', as: 'nivel' });
AsignacionProgramaDocente.belongsTo(Paralelo, { foreignKey: 'paralelo_id', as: 'paralelo' });
AsignacionProgramaDocente.belongsTo(Periodo, { foreignKey: 'periodo_id', as: 'periodo' });

// ProgramasAnaliticos asociaciones con plantilla
ProgramasAnaliticos.belongsTo(PlantillaPrograma, { foreignKey: 'plantilla_id', as: 'plantilla' });
ProgramasAnaliticos.hasMany(AsignacionProgramaDocente, { foreignKey: 'programa_id', as: 'asignaciones' });
ProgramasAnaliticos.hasMany(ContenidoPrograma, { foreignKey: 'programa_analitico_id', as: 'contenidos' });

// ContenidoPrograma asociaciones
ContenidoPrograma.belongsTo(ProgramasAnaliticos, { foreignKey: 'programa_analitico_id', as: 'programa' });
ContenidoPrograma.belongsTo(SeccionPlantilla, { foreignKey: 'seccion_plantilla_id', as: 'seccion' });
ContenidoPrograma.hasMany(FilaTablaPrograma, { foreignKey: 'contenido_programa_id', as: 'filas' });

// FilaTablaPrograma asociaciones
FilaTablaPrograma.belongsTo(ContenidoPrograma, { foreignKey: 'contenido_programa_id', as: 'contenido' });
FilaTablaPrograma.hasMany(ValorCampoPrograma, { foreignKey: 'fila_tabla_id', as: 'valores' });

// ValorCampoPrograma asociaciones
ValorCampoPrograma.belongsTo(FilaTablaPrograma, { foreignKey: 'fila_tabla_id', as: 'fila' });
ValorCampoPrograma.belongsTo(CampoSeccion, { foreignKey: 'campo_seccion_id', as: 'campo' });

// =========================================================================
// --- ASOCIACIONES TITULO EXTRAIDO ---
// =========================================================================
TituloExtraido.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(TituloExtraido, { foreignKey: 'usuario_id', as: 'titulos_extraidos' });

// =========================================================================
// --- ASOCIACIONES SYLLABUS ---
// =========================================================================
TituloExtraidoSyllabus.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(TituloExtraidoSyllabus, { foreignKey: 'usuario_id', as: 'titulos_syllabus' });

// Asociaciones SyllabusComisionAcademica
SyllabusComisionAcademica.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });
Asignatura.hasMany(SyllabusComisionAcademica, { foreignKey: 'asignatura_id', as: 'syllabusComision' });

// Asociaciones SyllabusDocente
SyllabusDocente.belongsTo(Profesor, { foreignKey: 'profesor_id', as: 'profesor' });
Profesor.hasMany(SyllabusDocente, { foreignKey: 'profesor_id', as: 'syllabusDocente' });
SyllabusDocente.belongsTo(SyllabusComisionAcademica, { foreignKey: 'syllabus_comision_id', as: 'syllabus_comision' });
SyllabusDocente.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });

// Asociaciones ProgramaAnaliticoDocente
ProgramaAnaliticoDocente.belongsTo(Profesor, { foreignKey: 'profesor_id', as: 'profesor' });
Profesor.hasMany(ProgramaAnaliticoDocente, { foreignKey: 'profesor_id', as: 'programasDocente' });


module.exports = {
  sequelize,
  User,
  Sustantivo,
  Paralelo,
  Organizacion,
  Nivel,
  Usuario,
  FuncionesSustantivas,
  Actividades,
  ProgramasAnaliticos,
  Facultad,
  Carrera,
  Profesor,
  Syllabus,
  Asignatura,
  DistribucionHoras,
  UnidadTematica,
  AsignaturaRequisito,
  ClasificacionAcademica, 
  Periodo,
  Malla,
  // Modelos de Programa Analítico
  PlantillaPrograma,
  SeccionPlantilla,
  CampoSeccion,
  AsignacionProgramaDocente,
  ContenidoPrograma,
  FilaTablaPrograma,
  ValorCampoPrograma,
  TituloExtraido,
  AgrupacionTitulo,
  // Modelos de Syllabus
  TituloExtraidoSyllabus,
  AgrupacionTituloSyllabus,
  SyllabusComisionAcademica,
  // Modelos Docente
  SyllabusDocente,
  ProgramaAnaliticoDocente,
  ProfesorCarrera,
  ProfesorAsignatura
};