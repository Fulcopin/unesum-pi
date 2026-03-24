// RE-LIMPIAR datos de un programa analitico existente
exports.relimpiarDatos = async (req, res) => {
  try {
    const { id } = req.params;
    
    const programa = await ProgramaAnalitico.findByPk(id);
    
    if (!programa) {
      return res.status(404).json({
        success: false,
        message: 'Programa analitico no encontrado'
      });
    }
    
    console.log('[RE-LIMPIEZA] Iniciando limpieza de datos para programa:', programa.id);
    
    // Obtener secciones actuales
    const seccionesActuales = programa.datos_tabla.secciones_completas || [];
    
    if (seccionesActuales.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay secciones para limpiar'
      });
    }
    
    console.log(`[RE-LIMPIEZA] Secciones a limpiar: ${seccionesActuales.length}`);
    
    // Aplicar limpieza a cada seccion
    const seccionesLimpias = seccionesActuales.map(seccion => limpiarDatosSeccion(seccion));
    
    // Actualizar el programa con datos limpios
    programa.datos_tabla = {
      ...programa.datos_tabla,
      secciones_completas: seccionesLimpias,
      fecha_relimpieza: new Date().toISOString()
    };
    
    await programa.save();
    
    console.log('[RE-LIMPIEZA] Datos limpiados y guardados exitosamente');
    
    return res.status(200).json({
      success: true,
      message: 'Datos limpiados exitosamente',
      data: {
        id: programa.id,
        secciones_procesadas: seccionesLimpias.length,
        secciones: seccionesLimpias.map(s => ({
          titulo: s.titulo,
          tipo: s.tipo,
          num_datos: s.datos?.length || 0
        }))
      }
    });
    
  } catch (error) {
    console.error('[RE-LIMPIEZA] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al re-limpiar datos',
      error: error.message
    });
  }
};

module.exports.relimpiarDatos = exports.relimpiarDatos;
