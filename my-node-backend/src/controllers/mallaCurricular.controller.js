// controllers/mallaCurricular.controller.js

const db = require('../models');
const { Op } = require('sequelize');

// Modelos de la base de datos
const Asignatura = db.Asignatura;
const Carrera = db.Carrera;
const Nivel = db.Nivel;
const Facultad = db.Facultad;
const DistribucionHoras = db.DistribucionHoras;
const AsignaturaRequisito = db.AsignaturaRequisito;

/**
 * Obtener la malla curricular completa por carrera
 * GET /api/malla-curricular/carrera/:carreraId
 */
exports.getMallaPorCarrera = async (req, res) => {
    try {
        const { carreraId } = req.params;

        // Obtener información de la carrera y facultad
        const carrera = await Carrera.findByPk(carreraId, {
            include: [{
                model: Facultad,
                as: 'facultad',
                attributes: ['id', 'nombre', 'codigo']
            }],
            attributes: ['id', 'nombre', 'codigo']
        });

        if (!carrera) {
            return res.status(404).json({
                success: false,
                message: 'Carrera no encontrada'
            });
        }

        // Obtener todas las asignaturas de la carrera con sus niveles
        const asignaturas = await Asignatura.findAll({
            where: { carrera_id: carreraId },
            include: [
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
                }
            ],
            order: [
                [{ model: Nivel, as: 'nivel' }, 'codigo', 'ASC'],
                ['nombre', 'ASC']
            ]
        });

        // Obtener prerrequisitos y correquisitos
        const asignaturasIds = asignaturas.map(a => a.id);
        const requisitos = await AsignaturaRequisito.findAll({
            where: { asignatura_id: asignaturasIds },
            include: [{
                model: Asignatura,
                as: 'requisito',
                attributes: ['id', 'codigo', 'nombre']
            }]
        });

        // Formatear la respuesta agrupando por niveles
        const malla = {};
        
        for (const asignatura of asignaturas) {
            const plainAsig = asignatura.get({ plain: true });
            const nivelNombre = plainAsig.nivel?.nombre || 'Sin Nivel';
            
            if (!malla[nivelNombre]) {
                malla[nivelNombre] = {
                    nivel: plainAsig.nivel,
                    asignaturas: []
                };
            }

            // Buscar prerrequisitos y correquisitos
            const prereq = requisitos.find(r => 
                r.asignatura_id === plainAsig.id && r.tipo === 'PRERREQUISITO'
            );
            const correq = requisitos.find(r => 
                r.asignatura_id === plainAsig.id && r.tipo === 'CORREQUISITO'
            );

            // Calcular créditos (aproximado: total horas / 48)
            const totalHoras = (plainAsig.horas?.horasDocencia || 0) +
                             (plainAsig.horas?.horasPractica || 0) +
                             (plainAsig.horas?.horasAutonoma || 0) +
                             (plainAsig.horas?.horasVinculacion || 0) +
                             (plainAsig.horas?.horasPracticaPreprofesional || 0);
            
            const creditos = Math.round(totalHoras / 48);

            malla[nivelNombre].asignaturas.push({
                id: plainAsig.id,
                nombre: plainAsig.nombre,
                codigo: plainAsig.codigo,
                abreviatura: plainAsig.codigo,
                aprendizajeContacto: plainAsig.horas?.horasDocencia || 0,
                aprendizajePractico: plainAsig.horas?.horasPractica || 0,
                aprendizajeAutonomo: plainAsig.horas?.horasAutonoma || 0,
                practicasPrep: plainAsig.horas?.horasPracticaPreprofesional || 0,
                practicasServicio: plainAsig.horas?.horasVinculacion || 0,
                creditos: creditos,
                totalHoras: totalHoras,
                prerrequisito: prereq ? prereq.requisito?.nombre : null,
                prerequisitoCodigo: prereq ? prereq.requisito?.codigo : null,
                correquisito: correq ? correq.requisito?.nombre : null,
                correquisitoCodigo: correq ? correq.requisito?.codigo : null
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                carrera: {
                    id: carrera.id,
                    nombre: carrera.nombre,
                    codigo: carrera.codigo,
                    facultad: carrera.facultad
                },
                malla: malla
            }
        });

    } catch (error) {
        console.error('Error al obtener la malla curricular:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener la malla curricular',
            error: error.message
        });
    }
};

/**
 * Obtener la malla curricular por nivel específico
 * GET /api/malla-curricular/nivel/:nivelId
 */
exports.getMallaPorNivel = async (req, res) => {
    try {
        const { nivelId } = req.params;
        const { carrera_id } = req.query;

        const whereCondition = { nivel_id: nivelId };
        if (carrera_id) {
            whereCondition.carrera_id = carrera_id;
        }

        const asignaturas = await Asignatura.findAll({
            where: whereCondition,
            include: [
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
                    model: Carrera,
                    as: 'carrera',
                    attributes: ['id', 'nombre', 'codigo'],
                    include: [{
                        model: Facultad,
                        as: 'facultad',
                        attributes: ['id', 'nombre', 'codigo']
                    }]
                }
            ],
            order: [['nombre', 'ASC']]
        });

        // Obtener requisitos
        const asignaturasIds = asignaturas.map(a => a.id);
        const requisitos = await AsignaturaRequisito.findAll({
            where: { asignatura_id: asignaturasIds },
            include: [{
                model: Asignatura,
                as: 'requisito',
                attributes: ['id', 'codigo', 'nombre']
            }]
        });

        // Formatear asignaturas
        const formattedAsignaturas = asignaturas.map(asignatura => {
            const plainAsig = asignatura.get({ plain: true });
            
            const prereq = requisitos.find(r => 
                r.asignatura_id === plainAsig.id && r.tipo === 'PRERREQUISITO'
            );
            const correq = requisitos.find(r => 
                r.asignatura_id === plainAsig.id && r.tipo === 'CORREQUISITO'
            );

            const totalHoras = (plainAsig.horas?.horasDocencia || 0) +
                             (plainAsig.horas?.horasPractica || 0) +
                             (plainAsig.horas?.horasAutonoma || 0) +
                             (plainAsig.horas?.horasVinculacion || 0) +
                             (plainAsig.horas?.horasPracticaPreprofesional || 0);
            
            const creditos = Math.round(totalHoras / 48);

            return {
                id: plainAsig.id,
                nombre: plainAsig.nombre,
                codigo: plainAsig.codigo,
                abreviatura: plainAsig.codigo,
                aprendizajeContacto: plainAsig.horas?.horasDocencia || 0,
                aprendizajePractico: plainAsig.horas?.horasPractica || 0,
                aprendizajeAutonomo: plainAsig.horas?.horasAutonoma || 0,
                practicasPrep: plainAsig.horas?.horasPracticaPreprofesional || 0,
                practicasServicio: plainAsig.horas?.horasVinculacion || 0,
                creditos: creditos,
                totalHoras: totalHoras,
                prerrequisito: prereq ? prereq.requisito?.nombre : null,
                prerequisitoCodigo: prereq ? prereq.requisito?.codigo : null,
                correquisito: correq ? correq.requisito?.nombre : null,
                correquisitoCodigo: correq ? correq.requisito?.codigo : null,
                carrera: plainAsig.carrera
            };
        });

        return res.status(200).json({
            success: true,
            data: formattedAsignaturas
        });

    } catch (error) {
        console.error('Error al obtener asignaturas por nivel:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener asignaturas por nivel',
            error: error.message
        });
    }
};

/**
 * Obtener resumen estadístico de la malla curricular
 * GET /api/malla-curricular/carrera/:carreraId/estadisticas
 */
exports.getEstadisticasMalla = async (req, res) => {
    try {
        const { carreraId } = req.params;

        const asignaturas = await Asignatura.findAll({
            where: { carrera_id: carreraId },
            include: [
                {
                    model: Nivel,
                    as: 'nivel',
                    attributes: ['nombre', 'codigo']
                },
                {
                    model: DistribucionHoras,
                    as: 'horas',
                    attributes: [
                        'horas_docencia',
                        'horas_practica',
                        'horas_autonoma',
                        'horas_vinculacion',
                        'horas_practica_preprofesional'
                    ]
                }
            ]
        });

        // Calcular estadísticas
        const estadisticas = {
            totalAsignaturas: asignaturas.length,
            totalHorasDocencia: 0,
            totalHorasPractica: 0,
            totalHorasAutonoma: 0,
            totalHorasVinculacion: 0,
            totalHorasPracticaPreprofesional: 0,
            totalHorasGeneral: 0,
            totalCreditos: 0,
            asignaturasPorNivel: {}
        };

        asignaturas.forEach(asig => {
            const plainAsig = asig.get({ plain: true });
            const nivel = plainAsig.nivel?.nombre || 'Sin Nivel';

            if (!estadisticas.asignaturasPorNivel[nivel]) {
                estadisticas.asignaturasPorNivel[nivel] = {
                    cantidad: 0,
                    horas: 0,
                    creditos: 0
                };
            }

            const horas = plainAsig.horas || {};
            const horasDocencia = horas.horas_docencia || 0;
            const horasPractica = horas.horas_practica || 0;
            const horasAutonoma = horas.horas_autonoma || 0;
            const horasVinculacion = horas.horas_vinculacion || 0;
            const horasPracticaPreprofesional = horas.horas_practica_preprofesional || 0;

            const totalHorasAsignatura = horasDocencia + horasPractica + horasAutonoma + 
                                        horasVinculacion + horasPracticaPreprofesional;
            const creditos = Math.round(totalHorasAsignatura / 48);

            estadisticas.totalHorasDocencia += horasDocencia;
            estadisticas.totalHorasPractica += horasPractica;
            estadisticas.totalHorasAutonoma += horasAutonoma;
            estadisticas.totalHorasVinculacion += horasVinculacion;
            estadisticas.totalHorasPracticaPreprofesional += horasPracticaPreprofesional;
            estadisticas.totalHorasGeneral += totalHorasAsignatura;
            estadisticas.totalCreditos += creditos;

            estadisticas.asignaturasPorNivel[nivel].cantidad += 1;
            estadisticas.asignaturasPorNivel[nivel].horas += totalHorasAsignatura;
            estadisticas.asignaturasPorNivel[nivel].creditos += creditos;
        });

        return res.status(200).json({
            success: true,
            data: estadisticas
        });

    } catch (error) {
        console.error('Error al obtener estadísticas de la malla:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas de la malla',
            error: error.message
        });
    }
};

/**
 * Validar la malla curricular (verificar integridad de requisitos)
 * GET /api/malla-curricular/carrera/:carreraId/validar
 */
exports.validarMalla = async (req, res) => {
    try {
        const { carreraId } = req.params;

        const asignaturas = await Asignatura.findAll({
            where: { carrera_id: carreraId },
            include: [{
                model: Nivel,
                as: 'nivel',
                attributes: ['codigo', 'nombre']
            }]
        });

        const requisitos = await AsignaturaRequisito.findAll({
            where: {
                asignatura_id: asignaturas.map(a => a.id)
            },
            include: [
                {
                    model: Asignatura,
                    as: 'asignatura',
                    attributes: ['id', 'codigo', 'nombre'],
                    include: [{
                        model: Nivel,
                        as: 'nivel',
                        attributes: ['codigo']
                    }]
                },
                {
                    model: Asignatura,
                    as: 'requisito',
                    attributes: ['id', 'codigo', 'nombre'],
                    include: [{
                        model: Nivel,
                        as: 'nivel',
                        attributes: ['codigo']
                    }]
                }
            ]
        });

        const errores = [];
        const advertencias = [];

        // Validar que los prerrequisitos estén en un nivel anterior
        requisitos.forEach(req => {
            if (req.tipo === 'PRERREQUISITO') {
                const nivelAsignatura = parseInt(req.asignatura?.nivel?.codigo || 0);
                const nivelRequisito = parseInt(req.requisito?.nivel?.codigo || 0);

                if (nivelRequisito >= nivelAsignatura) {
                    errores.push({
                        tipo: 'PRERREQUISITO_NIVEL_INVALIDO',
                        asignatura: req.asignatura?.nombre,
                        requisito: req.requisito?.nombre,
                        mensaje: `El prerrequisito "${req.requisito?.nombre}" debe estar en un nivel anterior a "${req.asignatura?.nombre}"`
                    });
                }
            }

            if (req.tipo === 'CORREQUISITO') {
                const nivelAsignatura = parseInt(req.asignatura?.nivel?.codigo || 0);
                const nivelRequisito = parseInt(req.requisito?.nivel?.codigo || 0);

                if (nivelRequisito !== nivelAsignatura) {
                    advertencias.push({
                        tipo: 'CORREQUISITO_NIVEL_DIFERENTE',
                        asignatura: req.asignatura?.nombre,
                        requisito: req.requisito?.nombre,
                        mensaje: `El correquisito "${req.requisito?.nombre}" está en un nivel diferente a "${req.asignatura?.nombre}"`
                    });
                }
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                valida: errores.length === 0,
                errores: errores,
                advertencias: advertencias,
                totalAsignaturas: asignaturas.length,
                totalRequisitos: requisitos.length
            }
        });

    } catch (error) {
        console.error('Error al validar la malla curricular:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al validar la malla curricular',
            error: error.message
        });
    }
};
