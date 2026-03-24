const { Malla, Facultad, Carrera } = require('../models');

// Obtener todas las mallas
exports.getAllMallas = async (req, res) => {
    try {
        const user = req.user;
        let whereClause = {};
        
        // Si es comision_academica o comision, filtrar por su facultad
        if (user.rol === 'comision_academica' || user.rol === 'comision') {
            if (!user.facultad) {
                return res.status(400).json({
                    success: false,
                    message: 'El usuario no tiene una facultad asignada'
                });
            }
            
            // Buscar el ID de la facultad por nombre
            const facultadUsuario = await Facultad.findOne({
                where: { nombre: user.facultad }
            });
            
            if (!facultadUsuario) {
                return res.status(404).json({
                    success: false,
                    message: 'Facultad no encontrada'
                });
            }
            
            whereClause.facultad_id = facultadUsuario.id;
        }
        
        const mallas = await Malla.findAll({
            where: whereClause,
            include: [
                {
                    model: Facultad,
                    as: 'facultad',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Carrera,
                    as: 'carrera',
                    attributes: ['id', 'nombre']
                }
            ],
            order: [['fecha_creacion', 'DESC']]
        });
        
        return res.status(200).json({ success: true, data: mallas });
    } catch (error) {
        console.error('Error al obtener las mallas:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al obtener las mallas', 
            error: error.message 
        });
    }
};

// Buscar malla por código
exports.getMallaByCodigo = async (req, res) => {
    try {
        const { codigo } = req.params;
        
        const malla = await Malla.findOne({
            where: { codigo_malla: codigo },
            include: [
                {
                    model: Facultad,
                    as: 'facultad',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Carrera,
                    as: 'carrera',
                    attributes: ['id', 'nombre', 'facultad_id']
                }
            ]
        });
        
        if (!malla) {
            return res.status(404).json({ 
                success: false, 
                message: 'Malla no encontrada' 
            });
        }
        
        return res.status(200).json({ success: true, data: malla });
    } catch (error) {
        console.error('Error al buscar la malla:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al buscar la malla', 
            error: error.message 
        });
    }
};

// Crear nueva malla
exports.createMalla = async (req, res) => {
    try {
        const { codigo_malla, facultad_id, carrera_id } = req.body;
        const user = req.user;
        
        // Validar datos requeridos
        if (!codigo_malla || !facultad_id || !carrera_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Código de malla, facultad y carrera son requeridos' 
            });
        }
        
        // Si es comision_academica, validar que la facultad corresponda a la suya
        if (user.rol === 'comision_academica' || user.rol === 'comision') {
            const facultad = await Facultad.findByPk(facultad_id);
            if (!facultad) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Facultad no encontrada' 
                });
            }
            
            if (facultad.nombre !== user.facultad) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'No tienes permisos para crear mallas en otra facultad' 
                });
            }
            
            // Validar que la carrera pertenezca a la facultad
            const carrera = await Carrera.findOne({
                where: { 
                    id: carrera_id,
                    facultad_id: facultad_id
                }
            });
            
            if (!carrera) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'La carrera no pertenece a la facultad especificada' 
                });
            }
        }
        
        // Verificar si ya existe una malla con ese código
        const mallaExistente = await Malla.findOne({ 
            where: { codigo_malla } 
        });
        
        if (mallaExistente) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya existe una malla con ese código' 
            });
        }
        
        const nuevaMalla = await Malla.create({
            codigo_malla,
            facultad_id: Number.parseInt(facultad_id, 10),
            carrera_id: Number.parseInt(carrera_id, 10)
        });
        
        // Cargar la malla con sus relaciones
        const mallaCompleta = await Malla.findByPk(nuevaMalla.id, {
            include: [
                {
                    model: Facultad,
                    as: 'facultad',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Carrera,
                    as: 'carrera',
                    attributes: ['id', 'nombre']
                }
            ]
        });
        
        return res.status(201).json({ 
            success: true, 
            message: 'Malla creada exitosamente',
            data: mallaCompleta 
        });
    } catch (error) {
        console.error('Error al crear la malla:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al crear la malla', 
            error: error.message 
        });
    }
};

// Actualizar malla
exports.updateMalla = async (req, res) => {
    try {
        const { id } = req.params;
        const { facultad_id, carrera_id } = req.body;
        const user = req.user;
        
        const malla = await Malla.findByPk(id, {
            include: [
                {
                    model: Facultad,
                    as: 'facultad',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Carrera,
                    as: 'carrera',
                    attributes: ['id', 'nombre']
                }
            ]
        });
        
        if (!malla) {
            return res.status(404).json({ 
                success: false, 
                message: 'Malla no encontrada' 
            });
        }
        
        // Si es comision_academica, validar permisos
        if (user.rol === 'comision_academica' || user.rol === 'comision') {
            if (malla.facultad.nombre !== user.facultad) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'No tienes permisos para actualizar mallas de otra facultad' 
                });
            }
            
            // Si intenta cambiar la facultad, validar
            if (facultad_id && facultad_id !== malla.facultad_id) {
                const nuevaFacultad = await Facultad.findByPk(facultad_id);
                if (!nuevaFacultad || nuevaFacultad.nombre !== user.facultad) {
                    return res.status(403).json({ 
                        success: false, 
                        message: 'No puedes cambiar la malla a otra facultad' 
                    });
                }
            }
        }
        
        await malla.update({
            facultad_id: facultad_id ? Number.parseInt(facultad_id, 10) : malla.facultad_id,
            carrera_id: carrera_id ? Number.parseInt(carrera_id, 10) : malla.carrera_id
        });
        
        const mallaActualizada = await Malla.findByPk(id, {
            include: [
                {
                    model: Facultad,
                    as: 'facultad',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Carrera,
                    as: 'carrera',
                    attributes: ['id', 'nombre']
                }
            ]
        });
        
        return res.status(200).json({ 
            success: true, 
            message: 'Malla actualizada exitosamente',
            data: mallaActualizada 
        });
    } catch (error) {
        console.error('Error al actualizar la malla:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar la malla', 
            error: error.message 
        });
    }
};

// Eliminar malla
exports.deleteMalla = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        
        const malla = await Malla.findByPk(id, {
            include: [
                {
                    model: Facultad,
                    as: 'facultad',
                    attributes: ['id', 'nombre']
                }
            ]
        });
        
        if (!malla) {
            return res.status(404).json({ 
                success: false, 
                message: 'Malla no encontrada' 
            });
        }
        
        // Si es comision_academica, validar permisos
        if (user.rol === 'comision_academica' || user.rol === 'comision') {
            if (malla.facultad.nombre !== user.facultad) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'No tienes permisos para eliminar mallas de otra facultad' 
                });
            }
        }
        
        await malla.destroy();
        
        return res.status(200).json({ 
            success: true, 
            message: 'Malla eliminada exitosamente' 
        });
    } catch (error) {
        console.error('Error al eliminar la malla:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar la malla', 
            error: error.message 
        });
    }
};
