'use strict';

/**
 * Seed para crear plantilla de ejemplo de Programa Analítico
 * Esta plantilla sigue la estructura típica de un programa analítico universitario
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Crear plantilla base
      const [plantilla] = await queryInterface.bulkInsert('plantillas_programa', [{
        nombre: 'Plantilla Estándar Programa Analítico',
        descripcion: 'Plantilla estándar para programas analíticos de la universidad',
        tipo: 'general',
        activa: true,
        created_at: new Date(),
        updated_at: new Date()
      }], { 
        transaction,
        returning: true 
      });

      const plantillaId = plantilla.id;

      // 2. Crear secciones de la plantilla
      const secciones = await queryInterface.bulkInsert('secciones_plantilla', [
        {
          plantilla_id: plantillaId,
          nombre: 'DATOS GENERALES',
          descripcion: 'Información básica del programa analítico',
          tipo: 'datos_generales',
          orden: 1,
          obligatoria: true,
          created_at: new Date()
        },
        {
          plantilla_id: plantillaId,
          nombre: 'CARACTERIZACIÓN DE LA ASIGNATURA',
          descripcion: 'Descripción general y contexto de la asignatura',
          tipo: 'texto_largo',
          orden: 2,
          obligatoria: true,
          created_at: new Date()
        },
        {
          plantilla_id: plantillaId,
          nombre: 'OBJETIVOS DE LA ASIGNATURA',
          descripcion: 'Objetivos generales y específicos de la asignatura',
          tipo: 'texto_largo',
          orden: 3,
          obligatoria: true,
          created_at: new Date()
        },
        {
          plantilla_id: plantillaId,
          nombre: 'COMPETENCIAS',
          descripcion: 'Competencias genéricas y específicas a desarrollar',
          tipo: 'texto_largo',
          orden: 4,
          obligatoria: true,
          created_at: new Date()
        },
        {
          plantilla_id: plantillaId,
          nombre: 'RESULTADOS DE APRENDIZAJE',
          descripcion: 'Resultados de aprendizaje esperados',
          tipo: 'lista',
          orden: 5,
          obligatoria: true,
          created_at: new Date()
        },
        {
          plantilla_id: plantillaId,
          nombre: 'CONTENIDOS DE LA ASIGNATURA',
          descripcion: 'Unidades temáticas y contenidos detallados',
          tipo: 'tabla',
          orden: 6,
          obligatoria: true,
          created_at: new Date()
        },
        {
          plantilla_id: plantillaId,
          nombre: 'METODOLOGÍA',
          descripcion: 'Estrategias metodológicas y recursos didácticos',
          tipo: 'texto_largo',
          orden: 7,
          obligatoria: true,
          created_at: new Date()
        },
        {
          plantilla_id: plantillaId,
          nombre: 'EVALUACIÓN',
          descripcion: 'Sistema y criterios de evaluación',
          tipo: 'tabla',
          orden: 8,
          obligatoria: true,
          created_at: new Date()
        },
        {
          plantilla_id: plantillaId,
          nombre: 'BIBLIOGRAFÍA',
          descripcion: 'Referencias bibliográficas básicas y complementarias',
          tipo: 'tabla',
          orden: 9,
          obligatoria: true,
          created_at: new Date()
        }
      ], { 
        transaction,
        returning: true 
      });

      // 3. Crear campos para la sección "CONTENIDOS DE LA ASIGNATURA"
      const seccionContenidos = secciones.find(s => s.nombre === 'CONTENIDOS DE LA ASIGNATURA');
      
      if (seccionContenidos) {
        await queryInterface.bulkInsert('campos_seccion', [
          {
            seccion_id: seccionContenidos.id,
            nombre: 'unidad',
            etiqueta: 'Unidad Temática',
            tipo_campo: 'text',
            orden: 1,
            requerido: true,
            placeholder: 'Ej: Unidad 1: Introducción a...',
            created_at: new Date()
          },
          {
            seccion_id: seccionContenidos.id,
            nombre: 'contenidos',
            etiqueta: 'Contenidos',
            tipo_campo: 'textarea',
            orden: 2,
            requerido: true,
            placeholder: 'Describir los temas a tratar...',
            created_at: new Date()
          },
          {
            seccion_id: seccionContenidos.id,
            nombre: 'horas_clase',
            etiqueta: 'Horas de Clase',
            tipo_campo: 'number',
            orden: 3,
            requerido: true,
            placeholder: '0',
            validacion_json: JSON.stringify({ min: 0 }),
            created_at: new Date()
          },
          {
            seccion_id: seccionContenidos.id,
            nombre: 'horas_practicas',
            etiqueta: 'Horas Prácticas',
            tipo_campo: 'number',
            orden: 4,
            requerido: true,
            placeholder: '0',
            validacion_json: JSON.stringify({ min: 0 }),
            created_at: new Date()
          },
          {
            seccion_id: seccionContenidos.id,
            nombre: 'horas_autonomas',
            etiqueta: 'Horas Autónomas',
            tipo_campo: 'number',
            orden: 5,
            requerido: true,
            placeholder: '0',
            validacion_json: JSON.stringify({ min: 0 }),
            created_at: new Date()
          }
        ], { transaction });
      }

      // 4. Crear campos para la sección "EVALUACIÓN"
      const seccionEvaluacion = secciones.find(s => s.nombre === 'EVALUACIÓN');
      
      if (seccionEvaluacion) {
        await queryInterface.bulkInsert('campos_seccion', [
          {
            seccion_id: seccionEvaluacion.id,
            nombre: 'componente',
            etiqueta: 'Componente de Evaluación',
            tipo_campo: 'text',
            orden: 1,
            requerido: true,
            placeholder: 'Ej: Examen Parcial',
            created_at: new Date()
          },
          {
            seccion_id: seccionEvaluacion.id,
            nombre: 'descripcion',
            etiqueta: 'Descripción',
            tipo_campo: 'textarea',
            orden: 2,
            requerido: false,
            placeholder: 'Descripción del componente...',
            created_at: new Date()
          },
          {
            seccion_id: seccionEvaluacion.id,
            nombre: 'porcentaje',
            etiqueta: 'Porcentaje (%)',
            tipo_campo: 'number',
            orden: 3,
            requerido: true,
            placeholder: '0',
            validacion_json: JSON.stringify({ min: 0, max: 100 }),
            created_at: new Date()
          }
        ], { transaction });
      }

      // 5. Crear campos para la sección "BIBLIOGRAFÍA"
      const seccionBibliografia = secciones.find(s => s.nombre === 'BIBLIOGRAFÍA');
      
      if (seccionBibliografia) {
        await queryInterface.bulkInsert('campos_seccion', [
          {
            seccion_id: seccionBibliografia.id,
            nombre: 'tipo',
            etiqueta: 'Tipo',
            tipo_campo: 'select',
            orden: 1,
            requerido: true,
            opciones_json: JSON.stringify({
              opciones: ['Básica', 'Complementaria', 'Digital']
            }),
            created_at: new Date()
          },
          {
            seccion_id: seccionBibliografia.id,
            nombre: 'autor',
            etiqueta: 'Autor(es)',
            tipo_campo: 'text',
            orden: 2,
            requerido: true,
            placeholder: 'Apellido, Nombre',
            created_at: new Date()
          },
          {
            seccion_id: seccionBibliografia.id,
            nombre: 'titulo',
            etiqueta: 'Título',
            tipo_campo: 'text',
            orden: 3,
            requerido: true,
            placeholder: 'Título del libro o artículo',
            created_at: new Date()
          },
          {
            seccion_id: seccionBibliografia.id,
            nombre: 'editorial',
            etiqueta: 'Editorial',
            tipo_campo: 'text',
            orden: 4,
            requerido: false,
            placeholder: 'Editorial',
            created_at: new Date()
          },
          {
            seccion_id: seccionBibliografia.id,
            nombre: 'año',
            etiqueta: 'Año',
            tipo_campo: 'number',
            orden: 5,
            requerido: true,
            placeholder: '2024',
            validacion_json: JSON.stringify({ min: 1900, max: 2100 }),
            created_at: new Date()
          }
        ], { transaction });
      }

      await transaction.commit();
      console.log('✅ Seed de plantilla de programa analítico creado exitosamente');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al crear seed de plantilla:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Eliminar en orden inverso
      const plantilla = await queryInterface.sequelize.query(
        `SELECT id FROM plantillas_programa WHERE nombre = 'Plantilla Estándar Programa Analítico' LIMIT 1`,
        { type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
      );

      if (plantilla.length > 0) {
        await queryInterface.bulkDelete('campos_seccion', {
          seccion_id: {
            [Sequelize.Op.in]: queryInterface.sequelize.literal(
              `(SELECT id FROM secciones_plantilla WHERE plantilla_id = ${plantilla[0].id})`
            )
          }
        }, { transaction });

        await queryInterface.bulkDelete('secciones_plantilla', {
          plantilla_id: plantilla[0].id
        }, { transaction });

        await queryInterface.bulkDelete('plantillas_programa', {
          id: plantilla[0].id
        }, { transaction });
      }

      await transaction.commit();
      console.log('✅ Rollback de seed completado');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al hacer rollback del seed:', error);
      throw error;
    }
  }
};
