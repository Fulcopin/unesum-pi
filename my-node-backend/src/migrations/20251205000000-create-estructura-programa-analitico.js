'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Crear tabla plantillas_programa
    await queryInterface.createTable('plantillas_programa', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      nombre: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tipo: {
        type: Sequelize.STRING(50),
        defaultValue: 'general',
        allowNull: false
      },
      activa: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      usuario_creador_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 2. Crear tabla secciones_plantilla
    await queryInterface.createTable('secciones_plantilla', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      plantilla_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'plantillas_programa',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      nombre: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tipo: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'texto_corto, texto_largo, tabla, lista'
      },
      orden: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      obligatoria: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      config_json: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Configuración específica de la sección'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índice para orden dentro de plantilla
    await queryInterface.addIndex('secciones_plantilla', ['plantilla_id', 'orden']);

    // 3. Crear tabla campos_seccion
    await queryInterface.createTable('campos_seccion', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      seccion_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'secciones_plantilla',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      nombre: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Nombre técnico del campo (snake_case)'
      },
      etiqueta: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Label que se muestra en el formulario'
      },
      tipo_campo: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'text, textarea, number, date, select, checkbox, radio, file'
      },
      orden: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      requerido: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      placeholder: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      opciones_json: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Para selects, checkboxes, radios, etc.'
      },
      validacion_json: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Reglas de validación (min, max, pattern, etc.)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índice para orden dentro de sección
    await queryInterface.addIndex('campos_seccion', ['seccion_id', 'orden']);

    // 4. Crear tabla contenido_programa
    await queryInterface.createTable('contenido_programa', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      programa_analitico_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'programas_analiticos',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      seccion_plantilla_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'secciones_plantilla',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      contenido_texto: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Para secciones de texto simple'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índice único para evitar duplicados
    await queryInterface.addIndex('contenido_programa', 
      ['programa_analitico_id', 'seccion_plantilla_id'], 
      { unique: true }
    );

    // 5. Crear tabla filas_tabla_programa
    await queryInterface.createTable('filas_tabla_programa', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      contenido_programa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'contenido_programa',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      orden: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índice para orden
    await queryInterface.addIndex('filas_tabla_programa', ['contenido_programa_id', 'orden']);

    // 6. Crear tabla valores_campo_programa
    await queryInterface.createTable('valores_campo_programa', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      fila_tabla_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'filas_tabla_programa',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      campo_seccion_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'campos_seccion',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      valor: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índice único para evitar duplicados de campo en misma fila
    await queryInterface.addIndex('valores_campo_programa', 
      ['fila_tabla_id', 'campo_seccion_id'], 
      { unique: true }
    );

    // 7. Crear tabla asignaciones_programa_docente
    await queryInterface.createTable('asignaciones_programa_docente', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      programa_analitico_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'programas_analiticos',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      profesor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'profesores',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      asignatura_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'asignaturas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      nivel_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'nivel',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      paralelo_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'paralelo',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      periodo_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'periodos',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      estado: {
        type: Sequelize.STRING(50),
        defaultValue: 'pendiente',
        allowNull: false,
        comment: 'pendiente, en_progreso, completado, rechazado'
      },
      fecha_asignacion: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      fecha_completado: {
        type: Sequelize.DATE,
        allowNull: true
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índice único para evitar asignaciones duplicadas
    await queryInterface.addIndex('asignaciones_programa_docente', 
      ['programa_analitico_id', 'profesor_id', 'periodo_id'], 
      { 
        unique: true,
        name: 'unique_asignacion_por_periodo'
      }
    );

    // 8. Modificar tabla programas_analiticos para agregar plantilla_id y estado
    await queryInterface.addColumn('programas_analiticos', 'plantilla_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'plantillas_programa',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('programas_analiticos', 'carrera', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('programas_analiticos', 'nivel', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await queryInterface.addColumn('programas_analiticos', 'asignatura', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('programas_analiticos', 'codigo', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await queryInterface.addColumn('programas_analiticos', 'creditos', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn('programas_analiticos', 'periodo_academico', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await queryInterface.addColumn('programas_analiticos', 'estado', {
      type: Sequelize.STRING(50),
      defaultValue: 'borrador',
      allowNull: false,
      comment: 'borrador, publicado, archivado'
    });

    console.log('✅ Migración de estructura de programas analíticos completada');
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar en orden inverso por dependencias
    await queryInterface.dropTable('valores_campo_programa');
    await queryInterface.dropTable('filas_tabla_programa');
    await queryInterface.dropTable('contenido_programa');
    await queryInterface.dropTable('asignaciones_programa_docente');
    await queryInterface.dropTable('campos_seccion');
    await queryInterface.dropTable('secciones_plantilla');
    await queryInterface.dropTable('plantillas_programa');
    
    // Eliminar columnas agregadas a programas_analiticos
    await queryInterface.removeColumn('programas_analiticos', 'estado');
    await queryInterface.removeColumn('programas_analiticos', 'periodo_academico');
    await queryInterface.removeColumn('programas_analiticos', 'creditos');
    await queryInterface.removeColumn('programas_analiticos', 'codigo');
    await queryInterface.removeColumn('programas_analiticos', 'asignatura');
    await queryInterface.removeColumn('programas_analiticos', 'nivel');
    await queryInterface.removeColumn('programas_analiticos', 'carrera');
    await queryInterface.removeColumn('programas_analiticos', 'plantilla_id');

    console.log('✅ Rollback de migración completado');
  }
};
