// controllers/asignaturaController.js

const db = require('../models');
const { Op } = require('sequelize');

// Modelos de la base de datos
const Asignatura = db.Asignatura;
const AsignaturaRequisito = db.AsignaturaRequisito;
const DistribucionHoras = db.DistribucionHoras;
const UnidadTematica = db.UnidadTematica;
const Carrera = db.Carrera; // Necesario para incluir la facultad
const Nivel = db.Nivel; // Necesario para incluir el nivel

// --- OBTENER ASIGNATURAS (CON FILTRO POR NIVEL Y CARRERA) ---
// El frontend necesita esta función para llenar la tabla.
exports.getAllAsignaturas = async (req, res) => {
    try {
        const { nivel_id, carrera_id } = req.query;
        const user = req.user;
        let whereCondition = {};
        let includeCarrera = {
            model: Carrera,
            as: 'carrera',
            attributes: ['id', 'nombre', 'facultad_id']
        };

        if (nivel_id) {
            whereCondition.nivel_id = nivel_id;
        }
        
        if (carrera_id) {
            whereCondition.carrera_id = carrera_id;
        }
        
        // Si es comision_academica o comision, filtrar por su facultad
        if (user.rol === 'comision_academica' || user.rol === 'comision') {
            if (!user.facultad) {
                return res.status(400).json({
                    success: false,
                    message: 'El usuario no tiene una facultad asignada'
                });
            }
            
            // Buscar el ID de la facultad por nombre
            const Facultad = db.Facultad;
            const facultadUsuario = await Facultad.findOne({
                where: { nombre: user.facultad }
            });
            
            if (!facultadUsuario) {
                return res.status(404).json({
                    success: false,
                    message: 'Facultad no encontrada'
                });
            }
            
            // Agregar filtro de facultad en el include de carrera
            includeCarrera.where = { facultad_id: facultadUsuario.id };
            includeCarrera.required = true; // INNER JOIN
        }

        const asignaturas = await Asignatura.findAll({
            where: whereCondition,
            include: [
                includeCarrera,
                {
                    model: Nivel,
                    as: 'nivel',
                    attributes: ['id', 'nombre', 'codigo']
                },
                {
                    model: DistribucionHoras,
                    as: 'horas',
                    attributes: [
                        ['horas_docencia', 'horasDocencia'],
                        ['horas_practica', 'horasPractica'],
                        ['horas_autonoma', 'horasAutonoma'],
                        ['horas_vinculacion', 'horasVinculacion'],
                        ['horas_practica_preprofesional', 'horasPracticaPreprofesional']
                    ]
                },
                {
                    model: UnidadTematica,
                    as: 'unidades',
                    attributes: [
                        ['nombre_unidad', 'unidad'],
                        'descripcion',
                        ['resultados_aprendizaje', 'resultados']
                    ],
                    order: [['numero_unidad', 'ASC']]
                },
                {
                    model: AsignaturaRequisito,
                    as: 'asignatura_requisitos',
                    include: [
                        {
                            model: Asignatura,
                            as: 'requisito',
                            attributes: ['id', 'codigo', 'nombre']
                        }
                    ]
                }
            ],
            order: [['nombre', 'ASC']]
        });

        // Procesar requisitos y normalizar datos
        const formattedAsignaturas = asignaturas.map(asig => {
            const plainAsig = asig.get({ plain: true });
            
            // Normalizar horas
            if (!plainAsig.horas) {
                plainAsig.horas = { horasDocencia: 0, horasPractica: 0, horasAutonoma: 0, horasVinculacion: 0, horasPracticaPreprofesional: 0 };
            }
            
            // Procesar prerrequisitos y correquisitos
            let prerrequisito = null;
            let correquisito = null;
            
            if (plainAsig.asignatura_requisitos && Array.isArray(plainAsig.asignatura_requisitos)) {
                plainAsig.asignatura_requisitos.forEach(req => {
                    if (req.tipo === 'PRERREQUISITO' && req.requisito) {
                        prerrequisito = `${req.requisito.codigo} - ${req.requisito.nombre}`;
                    }
                    if (req.tipo === 'CORREQUISITO' && req.requisito) {
                        correquisito = `${req.requisito.codigo} - ${req.requisito.nombre}`;
                    }
                });
            }
            
            plainAsig.prerrequisito = prerrequisito;
            plainAsig.correquisito = correquisito;
            
            // Eliminar la propiedad asignatura_requisitos del objeto final
            delete plainAsig.asignatura_requisitos;
            
            return plainAsig;
        });

        return res.status(200).json({ success: true, data: formattedAsignaturas });
    } catch (error) {
        console.error('Error al obtener las asignaturas:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener las asignaturas', error: error.message });
    }
};

// --- OBTENER UNA ASIGNATURA POR ID ---
// Para cargar información de una asignatura específica en el programa analítico
// Solo devuelve lo necesario: codigo, nombre, nivel, carrera
exports.getAsignaturaById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const asignatura = await Asignatura.findByPk(id, {
            attributes: ['id', 'codigo', 'nombre'],
            include: [
                {
                    model: Nivel,
                    as: 'nivel',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Carrera,
                    as: 'carrera',
                    attributes: ['id', 'nombre']
                }
            ]
        });

        if (!asignatura) {
            return res.status(404).json({ 
                success: false, 
                message: 'Asignatura no encontrada' 
            });
        }

        // Devolver datos simples
        const plainAsig = asignatura.get({ plain: true });

        return res.status(200).json({ 
            success: true,
            data: plainAsig 
        });
    } catch (error) {
        console.error('Error al obtener la asignatura:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al obtener la asignatura', 
            error: error.message 
        });
    }
};


// controllers/asignaturaController.js

exports.createAsignaturaBase = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const {
      carrera_id, nivel_id, organizacion_id,
      nombre, codigo,
      prerrequisito_codigo, correquisito_codigo
    } = req.body;
    
    // Verificar si el código ya existe
    const asignaturaExistente = await Asignatura.findOne({ where: { codigo } });
    if (asignaturaExistente) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `El código '${codigo}' ya está siendo usado por otra asignatura: ${asignaturaExistente.nombre}. Por favor, use un código diferente.` 
      });
    }
    
    const nuevaAsignatura = await Asignatura.create({
      nombre, codigo, carrera_id, nivel_id, organizacion_id,
    }, { transaction });

    // --- LÓGICA DE PRERREQUISITO MEJORADA ---
    if (prerrequisito_codigo) {
      const prerequisito = await Asignatura.findOne({ where: { codigo: prerrequisito_codigo } });
      if (prerequisito) {
        await AsignaturaRequisito.create({
          asignatura_id: nuevaAsignatura.id,
          requisito_id: prerequisito.id,
          tipo: 'PRERREQUISITO'
        }, { transaction });
      } else {
        // --- CAMBIO CLAVE ---
        // Si se proveyó un código pero no se encontró la asignatura, lanzamos un error.
        throw new Error(`El código de prerrequisito '${prerrequisito_codigo}' no corresponde a ninguna asignatura existente.`);
      }
    }

    // --- LÓGICA DE CORREQUISITO MEJORADA ---
    if (correquisito_codigo) {
      const correquisito = await Asignatura.findOne({ where: { codigo: correquisito_codigo } });
      if (correquisito) {
        await AsignaturaRequisito.create({
          asignatura_id: nuevaAsignatura.id,
          requisito_id: correquisito.id,
          tipo: 'CORREQUISITO'
        }, { transaction });
      } else {
        // --- CAMBIO CLAVE ---
        throw new Error(`El código de correquisito '${correquisito_codigo}' no corresponde a ninguna asignatura existente.`);
      }
    }

    await transaction.commit();
    return res.status(201).json({
      success: true, message: 'Asignatura y sus requisitos creados exitosamente', data: { id: nuevaAsignatura.id }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear la asignatura base:', error);
    
    // Manejo especial para errores de código duplicado
    if (error.name === 'SequelizeUniqueConstraintError') {
      const duplicateField = error.errors[0]?.path;
      const duplicateValue = error.errors[0]?.value;
      return res.status(400).json({ 
        success: false, 
        message: `El código '${duplicateValue}' ya está registrado. Por favor, use un código único para esta asignatura.`
      });
    }
    
    // Otros errores
    return res.status(400).json({
      success: false, 
      message: error.message || 'Error al crear la asignatura base'
    });
  }
};

// controllers/asignaturaController.js

exports.updateAsignaturaBase = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const {
            carrera_id, nivel_id, organizacion_id,
            nombre, codigo,
            prerrequisito_codigo, correquisito_codigo
        } = req.body;

        const asignatura = await Asignatura.findByPk(id);
        if (!asignatura) {
            // No es necesario 'await transaction.rollback()' aquí, ya que no se ha hecho ninguna escritura
            return res.status(404).json({ success: false, message: 'Asignatura no encontrada.' });
        }

        await asignatura.update({
            nombre, codigo, carrera_id, nivel_id, organizacion_id
        }, { transaction });

        await AsignaturaRequisito.destroy({ where: { asignatura_id: id }, transaction });

        if (prerrequisito_codigo) {
            const prerequisito = await Asignatura.findOne({ where: { codigo: prerrequisito_codigo } });
            if (prerequisito) {
                await AsignaturaRequisito.create({
                    asignatura_id: id,
                    requisito_id: prerequisito.id,
                    tipo: 'PRERREQUISITO'
                }, { transaction });
            } else {
                // --- CAMBIO CLAVE ---
                throw new Error(`El código de prerrequisito '${prerrequisito_codigo}' no corresponde a ninguna asignatura existente.`);
            }
        }

        if (correquisito_codigo) {
            const correquisito = await Asignatura.findOne({ where: { codigo: correquisito_codigo } });
            if (correquisito) {
                await AsignaturaRequisito.create({
                    asignatura_id: id,
                    requisito_id: correquisito.id,
                    tipo: 'CORREQUISITO'
                }, { transaction });
            } else {
                // --- CAMBIO CLAVE ---
                throw new Error(`El código de correquisito '${correquisito_codigo}' no corresponde a ninguna asignatura existente.`);
            }
        }

        await transaction.commit();
        return res.status(200).json({
            success: true, message: 'Asignatura y sus requisitos actualizados exitosamente', data: { id: asignatura.id }
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error al actualizar la asignatura base:', error);
        return res.status(400).json({ // Usamos 400 (Bad Request)
            success: false, message: error.message || 'Error al actualizar la asignatura base'
        });
    }
};

// --- AÑADIR/ACTUALIZAR HORAS (SECCIÓN 3) ---
// Tu código original es perfecto para esto, ya que `upsert` maneja creación y actualización.
exports.addHoras = async (req, res) => {
    try {
        const { asignaturaId } = req.params;
        const {
            horasDocencia, horasPractica, horasAutonoma,
            horasVinculacion, horasPracticaPreprofesional
        } = req.body;

        await DistribucionHoras.upsert({
            asignatura_id: asignaturaId,
            horas_docencia: horasDocencia,
            horas_practica: horasPractica,
            horas_autonoma: horasAutonoma,
            horas_vinculacion: horasVinculacion,
            horas_practica_preprofesional: horasPracticaPreprofesional
        });

        return res.status(200).json({
            success: true, message: 'Distribución de horas guardada exitosamente'
        });
    } catch (error) {
        console.error('Error al guardar las horas:', error);
        return res.status(500).json({
            success: false, message: 'Error al guardar la distribución de horas', error: error.message
        });
    }
};

// --- AÑADIR/ACTUALIZAR UNIDADES TEMÁTICAS (SECCIÓN 4) ---
// Tu código original también es ideal, ya que elimina y vuelve a crear las unidades.
exports.addUnidades = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { asignaturaId } = req.params;
        const { unidades } = req.body;

        if (!unidades || !Array.isArray(unidades)) {
            return res.status(400).json({ success: false, message: 'El formato de las unidades es incorrecto.' });
        }
        
        await UnidadTematica.destroy({ where: { asignatura_id: asignaturaId }, transaction });

        if (unidades.length > 0 && unidades[0].unidad) { // Solo crear si hay unidades con contenido
            const unidadesParaCrear = unidades.map((u, index) => ({
                asignatura_id: asignaturaId,
                nombre_unidad: u.unidad,
                descripcion: u.descripcion,
                resultados_aprendizaje: u.resultados,
                numero_unidad: index + 1
            }));
            await UnidadTematica.bulkCreate(unidadesParaCrear, { transaction });
        }
        
        await transaction.commit();

        return res.status(201).json({
            success: true, message: 'Unidades temáticas guardadas exitosamente'
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error al guardar las unidades temáticas:', error);
        return res.status(500).json({
            success: false, message: 'Error al guardar las unidades temáticas', error: error.message
        });
    }
};

// --- ELIMINAR UNA ASIGNATURA ---
// El frontend necesita esta función para el botón de eliminar.
exports.deleteAsignatura = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const asignatura = await Asignatura.findByPk(id);
        if (!asignatura) {
            return res.status(404).json({ success: false, message: 'Asignatura no encontrada' });
        }

        // Eliminar dependencias en orden
        await AsignaturaRequisito.destroy({ where: { [Op.or]: [{ asignatura_id: id }, { requisito_id: id }] }, transaction });
        await UnidadTematica.destroy({ where: { asignatura_id: id }, transaction });
        await DistribucionHoras.destroy({ where: { asignatura_id: id }, transaction });
        
        // Finalmente, eliminar la asignatura
        await asignatura.destroy({ transaction });
        
        await transaction.commit();
        return res.status(200).json({ success: true, message: 'Asignatura eliminada exitosamente' });
    } catch (error) {
        await transaction.rollback();
        console.error('Error al eliminar la asignatura:', error);
        return res.status(500).json({ success: false, message: 'Error al eliminar la asignatura', error: error.message });
    }
};