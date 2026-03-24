# 📋 Resumen de Implementación - Sistema de Programas Analíticos Dinámicos

## 🎯 Objetivo

Migrar de una estructura JSONB a una base de datos relacional normalizada que permita:
- Crear formularios dinámicos basados en plantillas
- Reutilizar estructuras entre programas
- Facilitar consultas y reportes
- Mejorar el mantenimiento y escalabilidad

## 📁 Archivos Creados

### 1. Documentación
- `DISEÑO_BD_PROGRAMA_ANALITICO.md` - Diseño completo de la base de datos

### 2. Migraciones
- `src/migrations/20251205000000-create-estructura-programa-analitico.js` - Migración principal

### 3. Modelos Sequelize
- `src/models/plantillas_programa.js` - Plantillas de programas
- `src/models/secciones_plantilla.js` - Secciones de las plantillas
- `src/models/campos_seccion.js` - Campos de cada sección
- `src/models/asignaciones_programa_docente.js` - Asignaciones a docentes

### 4. Seeders
- `src/seeders/20251205000001-plantilla-programa-analitico.js` - Plantilla de ejemplo

## 🗃️ Estructura de Base de Datos

```
plantillas_programa (Plantillas reutilizables)
├── secciones_plantilla (Secciones como "OBJETIVOS", "CONTENIDOS")
    └── campos_seccion (Campos de tablas como "unidad", "horas")

programas_analiticos (Programas específicos)
├── contenido_programa (Contenido por sección)
    └── filas_tabla_programa (Filas de tablas)
        └── valores_campo_programa (Valores de cada campo)

asignaciones_programa_docente (Asignaciones a profesores)
```

## 🚀 Pasos de Implementación

### Paso 1: Ejecutar Migración

```bash
cd my-node-backend
npm run migrate
```

Este comando creará todas las tablas nuevas:
- `plantillas_programa`
- `secciones_plantilla`
- `campos_seccion`
- `contenido_programa`
- `filas_tabla_programa`
- `valores_campo_programa`
- `asignaciones_programa_docente`

También agregará campos a `programas_analiticos`:
- `plantilla_id`
- `carrera`
- `nivel`
- `asignatura`
- `codigo`
- `creditos`
- `periodo_academico`
- `estado`

### Paso 2: Ejecutar Seeder de Plantilla

```bash
npm run seed
```

Esto creará una plantilla de ejemplo con:
- 9 secciones estándar
- Campos predefinidos para tablas
- Configuración de validaciones

### Paso 3: Actualizar index de modelos

Agregar los nuevos modelos a `src/models/index.js`:

```javascript
const PlantillaPrograma = require('./plantillas_programa')(sequelize, Sequelize.DataTypes);
const SeccionPlantilla = require('./secciones_plantilla')(sequelize, Sequelize.DataTypes);
const CampoSeccion = require('./campos_seccion')(sequelize, Sequelize.DataTypes);
const ContenidoPrograma = require('./contenido_programa')(sequelize, Sequelize.DataTypes);
const FilaTablaPrograma = require('./filas_tabla_programa')(sequelize, Sequelize.DataTypes);
const ValorCampoPrograma = require('./valores_campo_programa')(sequelize, Sequelize.DataTypes);
const AsignacionProgramaDocente = require('./asignaciones_programa_docente')(sequelize, Sequelize.DataTypes);

// Agregar al objeto db
db.PlantillaPrograma = PlantillaPrograma;
db.SeccionPlantilla = SeccionPlantilla;
db.CampoSeccion = CampoSeccion;
db.ContenidoPrograma = ContenidoPrograma;
db.FilaTablaPrograma = FilaTablaPrograma;
db.ValorCampoPrograma = ValorCampoPrograma;
db.AsignacionProgramaDocente = AsignacionProgramaDocente;

// Configurar asociaciones
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});
```

### Paso 4: Crear Controladores

#### 4.1 Controlador de Plantillas (`src/controllers/plantillaController.js`)

```javascript
// Crear plantilla
exports.crear = async (req, res) => {
  const { nombre, descripcion, tipo, secciones } = req.body;
  
  const transaction = await db.sequelize.transaction();
  
  try {
    // Crear plantilla
    const plantilla = await db.PlantillaPrograma.create({
      nombre,
      descripcion,
      tipo,
      usuario_creador_id: req.user.id
    }, { transaction });
    
    // Crear secciones
    for (const seccion of secciones) {
      const seccionCreada = await db.SeccionPlantilla.create({
        plantilla_id: plantilla.id,
        nombre: seccion.nombre,
        descripcion: seccion.descripcion,
        tipo: seccion.tipo,
        orden: seccion.orden,
        obligatoria: seccion.obligatoria
      }, { transaction });
      
      // Crear campos si es tipo tabla
      if (seccion.campos && seccion.campos.length > 0) {
        await db.CampoSeccion.bulkCreate(
          seccion.campos.map(campo => ({
            seccion_id: seccionCreada.id,
            ...campo
          })),
          { transaction }
        );
      }
    }
    
    await transaction.commit();
    
    res.json({
      success: true,
      data: plantilla
    });
    
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener estructura de plantilla
exports.getEstructura = async (req, res) => {
  try {
    const plantilla = await db.PlantillaPrograma.findByPk(req.params.id, {
      include: [{
        model: db.SeccionPlantilla,
        as: 'secciones',
        include: [{
          model: db.CampoSeccion,
          as: 'campos'
        }]
      }],
      order: [
        [{ model: db.SeccionPlantilla, as: 'secciones' }, 'orden', 'ASC'],
        [{ model: db.SeccionPlantilla, as: 'secciones' }, { model: db.CampoSeccion, as: 'campos' }, 'orden', 'ASC']
      ]
    });
    
    res.json({
      success: true,
      data: plantilla
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

#### 4.2 Actualizar Controlador de Programas Analíticos

```javascript
// Crear programa basado en plantilla
exports.crearDesdeForm Plantilla = async (req, res) => {
  const { plantillaId, nombre, carrera, nivel, asignatura, codigo, creditos, periodo_academico } = req.body;
  
  try {
    const programa = await db.ProgramasAnaliticos.create({
      plantilla_id: plantillaId,
      nombre,
      carrera,
      nivel,
      asignatura,
      codigo,
      creditos,
      periodo_academico,
      usuario_id: req.user.id,
      estado: 'borrador'
    });
    
    res.json({
      success: true,
      data: programa
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Guardar contenido de programa
exports.guardarContenido = async (req, res) => {
  const { programaId, seccionId, contenidoTexto, filasTabla } = req.body;
  
  const transaction = await db.sequelize.transaction();
  
  try {
    // Buscar o crear contenido de sección
    let [contenido] = await db.ContenidoPrograma.findOrCreate({
      where: {
        programa_analitico_id: programaId,
        seccion_plantilla_id: seccionId
      },
      defaults: {
        contenido_texto: contenidoTexto
      },
      transaction
    });
    
    // Si es sección de texto, actualizar
    if (contenidoTexto) {
      await contenido.update({ contenido_texto: contenidoTexto }, { transaction });
    }
    
    // Si es sección de tabla, procesar filas
    if (filasTabla && filasTabla.length > 0) {
      // Eliminar filas existentes
      await db.FilaTablaPrograma.destroy({
        where: { contenido_programa_id: contenido.id },
        transaction
      });
      
      // Crear nuevas filas
      for (let i = 0; i < filasTabla.length; i++) {
        const fila = await db.FilaTablaPrograma.create({
          contenido_programa_id: contenido.id,
          orden: i + 1
        }, { transaction });
        
        // Crear valores de campos
        for (const [campoId, valor] of Object.entries(filasTabla[i])) {
          await db.ValorCampoPrograma.create({
            fila_tabla_id: fila.id,
            campo_seccion_id: parseInt(campoId),
            valor: valor
          }, { transaction });
        }
      }
    }
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Contenido guardado'
    });
    
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener programa completo con contenido
exports.getProgramaCompleto = async (req, res) => {
  try {
    const programa = await db.ProgramasAnaliticos.findByPk(req.params.id, {
      include: [{
        model: db.PlantillaPrograma,
        as: 'plantilla',
        include: [{
          model: db.SeccionPlantilla,
          as: 'secciones',
          include: [{
            model: db.CampoSeccion,
            as: 'campos'
          }]
        }]
      }]
    });
    
    // Obtener contenidos
    const contenidos = await db.ContenidoPrograma.findAll({
      where: { programa_analitico_id: programa.id },
      include: [{
        model: db.FilaTablaPrograma,
        as: 'filas',
        include: [{
          model: db.ValorCampoPrograma,
          as: 'valores',
          include: [{
            model: db.CampoSeccion,
            as: 'campo'
          }]
        }]
      }]
    });
    
    res.json({
      success: true,
      data: {
        programa,
        contenidos
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### Paso 5: Crear Rutas

```javascript
// routes/plantillaRoutes.js
router.post('/', authenticate, isAdmin, plantillaController.crear);
router.get('/', authenticate, plantillaController.listar);
router.get('/:id/estructura', authenticate, plantillaController.getEstructura);
router.put('/:id', authenticate, isAdmin, plantillaController.actualizar);
router.delete('/:id', authenticate, isAdmin, plantillaController.eliminar);

// routes/programaAnaliticoRoutes.js
router.post('/crear-desde-plantilla', authenticate, programaAnaliticoController.crearDesdePlantilla);
router.post('/:id/contenido', authenticate, programaAnaliticoController.guardarContenido);
router.get('/:id/completo', authenticate, programaAnaliticoController.getProgramaCompleto);
```

## 🎨 Frontend - Componente de Formulario Dinámico

El componente `FormularioDinamico` ya está creado en:
`components/programa-analitico/formulario-dinamico.tsx`

Este componente:
- Lee la estructura de la plantilla
- Genera formularios dinámicamente
- Maneja secciones de texto y tablas
- Permite agregar/eliminar filas
- Valida campos requeridos

## 📊 Ventajas del Nuevo Sistema

1. **Flexibilidad**: Admin puede crear/modificar plantillas sin tocar código
2. **Reutilización**: Una plantilla sirve para múltiples programas
3. **Consultas Eficientes**: SQL optimizado vs búsquedas en JSONB
4. **Validaciones**: A nivel de BD y aplicación
5. **Reportes**: Fácil generar estadísticas y reportes
6. **Historial**: Fácil implementar versionado
7. **Escalabilidad**: Mejor estructura para crecimiento

## 🔄 Plan de Migración de Datos Existentes

Si ya tienes programas en JSONB:

1. **Extraer estructuras comunes**
2. **Crear plantillas basadas en esas estructuras**
3. **Migrar datos a nuevas tablas**
4. **Mantener JSONB como respaldo temporal**
5. **Validar migración**
6. **Eliminar campo JSONB una vez confirmado**

## ✅ Checklist de Implementación

- [ ] Ejecutar migración
- [ ] Ejecutar seeder
- [ ] Actualizar models/index.js
- [ ] Crear plantillaController.js
- [ ] Actualizar programaAnaliticoController.js
- [ ] Crear rutas de plantillas
- [ ] Actualizar rutas de programas
- [ ] Probar creación de plantilla
- [ ] Probar creación de programa
- [ ] Probar guardado de contenido
- [ ] Probar asignación a docente
- [ ] Probar formulario dinámico en frontend

## 📝 Ejemplo de Uso Completo

```javascript
// 1. Admin crea plantilla
POST /api/plantillas
{
  "nombre": "Ingeniería",
  "secciones": [
    {
      "nombre": "CONTENIDOS",
      "tipo": "tabla",
      "orden": 1,
      "campos": [
        { "nombre": "unidad", "etiqueta": "Unidad", "tipo_campo": "text", "orden": 1 }
      ]
    }
  ]
}

// 2. Admin crea programa basado en plantilla
POST /api/programa-analitico/crear-desde-plantilla
{
  "plantillaId": 1,
  "nombre": "Programación I",
  "carrera": "Sistemas"
}

// 3. Admin asigna a docente
POST /api/programa-analitico/asignar
{
  "programaAnaliticoId": 1,
  "profesorId": 5
}

// 4. Docente obtiene estructura
GET /api/programa-analitico/1/completo

// 5. Docente completa contenido
POST /api/programa-analitico/1/contenido
{
  "seccionId": 2,
  "filasTabla": [
    {
      "1": "Unidad 1",  // campoId: valor
      "2": "POO"
    }
  ]
}
```

## 🆘 Troubleshooting

**Error al ejecutar migración:**
- Verificar que Neon esté conectado
- Revisar credenciales en .env
- Verificar que no existan tablas con los mismos nombres

**Error en asociaciones:**
- Verificar que todos los modelos estén en index.js
- Verificar que associate() se llame para todos los modelos

**Error en frontend:**
- Verificar que API esté corriendo
- Revisar CORS
- Verificar token de autenticación

## 📧 Soporte

Para dudas o problemas, revisar:
- `DISEÑO_BD_PROGRAMA_ANALITICO.md` - Documentación completa
- Logs del servidor
- Console del navegador

---

**Fecha de creación**: 5 de diciembre de 2025
**Versión**: 1.0
**Estado**: ✅ Listo para implementar
