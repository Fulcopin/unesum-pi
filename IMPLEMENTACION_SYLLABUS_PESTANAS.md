# 📚 Implementación de Sistema de Pestañas para Syllabus

## 🎯 Objetivo
Implementar el mismo sistema de extracción de títulos, organización en pestañas y formularios dinámicos que ya funciona en **Programa Analítico**, pero adaptado para **Syllabus**.

---

## 📋 Lo que ya existe

### Frontend
- ✅ `/dashboard/admin/syllabus` - Gestión de syllabus (admin)
- ✅ `/dashboard/docente/syllabus` - Vista de syllabus (docente)
- ✅ `components/syllabus/syllabus-formulario.tsx` - Formulario de syllabus

### Backend
- ✅ Modelo `Syllabus` en `my-node-backend/src/models/syllabi.js`
- ✅ Controlador `syllabusController.js`
- ✅ Tabla `syllabi` en base de datos

---

## 🔧 Lo que hay que implementar

### 1. **Backend - Extracción de Títulos para Syllabus**

#### 1.1. Crear tabla `titulos_extraidos_syllabus`
Similar a `titulos_extraidos` pero para syllabus.

```sql
-- my-node-backend/migrations/create-titulos-syllabus.sql
CREATE TABLE IF NOT EXISTS titulos_extraidos_syllabus (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo_archivo VARCHAR(20) NOT NULL,  -- 'Excel' o 'Word'
  titulo VARCHAR(500) NOT NULL,
  tipo VARCHAR(50) NOT NULL,  -- 'cabecera', 'titulo_seccion', 'campo'
  fila INTEGER NOT NULL,
  columna INTEGER NOT NULL,
  columna_letra VARCHAR(5) NOT NULL,
  puntuacion INTEGER NOT NULL DEFAULT 0,
  caracteristicas TEXT,
  texto_original TEXT,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_titulos_syllabus_session ON titulos_extraidos_syllabus(session_id);
CREATE INDEX idx_titulos_syllabus_usuario ON titulos_extraidos_syllabus(usuario_id);
```

#### 1.2. Crear tabla `agrupaciones_titulos_syllabus`
Para guardar las pestañas organizadas por el admin.

```sql
-- my-node-backend/migrations/create-agrupaciones-syllabus.sql
CREATE TABLE IF NOT EXISTS agrupaciones_titulos_syllabus (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  nombre_pestana VARCHAR(100) NOT NULL,
  descripcion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  titulo_ids INTEGER[] NOT NULL DEFAULT '{}',
  color VARCHAR(20) DEFAULT 'blue',
  icono VARCHAR(50) DEFAULT '📋',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agrupaciones_syllabus_session ON agrupaciones_titulos_syllabus(session_id);
CREATE INDEX idx_agrupaciones_syllabus_orden ON agrupaciones_titulos_syllabus(session_id, orden);
```

#### 1.3. Crear modelos Sequelize

**`my-node-backend/src/models/TituloExtraidoSyllabus.js`**
```javascript
module.exports = (sequelize, DataTypes) => {
  const TituloExtraidoSyllabus = sequelize.define('TituloExtraidoSyllabus', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    session_id: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    nombre_archivo: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    tipo_archivo: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    titulo: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    tipo: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    fila: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    columna: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    columna_letra: {
      type: DataTypes.STRING(5),
      allowNull: false
    },
    puntuacion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    caracteristicas: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    texto_original: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'titulos_extraidos_syllabus',
    timestamps: true,
    underscored: true
  });

  return TituloExtraidoSyllabus;
};
```

**`my-node-backend/src/models/AgrupacionTituloSyllabus.js`**
```javascript
module.exports = (sequelize, DataTypes) => {
  const AgrupacionTituloSyllabus = sequelize.define('AgrupacionTituloSyllabus', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    session_id: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    nombre_pestana: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    titulo_ids: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false,
      defaultValue: []
    },
    color: {
      type: DataTypes.STRING(20),
      defaultValue: 'blue'
    },
    icono: {
      type: DataTypes.STRING(50),
      defaultValue: '📋'
    }
  }, {
    tableName: 'agrupaciones_titulos_syllabus',
    timestamps: true,
    underscored: true
  });

  return AgrupacionTituloSyllabus;
};
```

#### 1.4. Registrar modelos en `models/index.js`

```javascript
// Agregar imports
const initTituloExtraidoSyllabus = require('./TituloExtraidoSyllabus');
const initAgrupacionTituloSyllabus = require('./AgrupacionTituloSyllabus');

// Inicializar
const TituloExtraidoSyllabus = initTituloExtraidoSyllabus(sequelize, Sequelize.DataTypes);
const AgrupacionTituloSyllabus = initAgrupacionTituloSyllabus(sequelize, Sequelize.DataTypes);

// Asociaciones
TituloExtraidoSyllabus.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(TituloExtraidoSyllabus, { foreignKey: 'usuario_id', as: 'titulos_syllabus' });

// Exportar
module.exports = {
  // ... otros modelos
  TituloExtraidoSyllabus,
  AgrupacionTituloSyllabus
};
```

#### 1.5. Crear controlador `syllabusExtractionController.js`

Copiar la lógica de `programaAnaliticoController.js` pero adaptada para syllabus:

```javascript
// my-node-backend/src/controllers/syllabusExtractionController.js
const db = require('../models');
const mammoth = require('mammoth');
const xlsx = require('xlsx');

// 📄 EXTRAER TÍTULOS DE EXCEL/WORD PARA SYLLABUS
exports.extraerTitulosSyllabus = async (req, res) => {
  // Similar a extraerTitulos pero guarda en titulos_extraidos_syllabus
};

// 🗂️ OBTENER AGRUPACIONES DE SYLLABUS
exports.obtenerAgrupacionesSyllabus = async (req, res) => {
  // Similar a obtenerAgrupaciones
};

// 💾 GUARDAR AGRUPACIONES DE SYLLABUS
exports.guardarAgrupacionesSyllabus = async (req, res) => {
  // Similar a guardarAgrupaciones
};

// 🗑️ ELIMINAR AGRUPACIONES DE SYLLABUS
exports.eliminarAgrupacionesSyllabus = async (req, res) => {
  // Similar a eliminarAgrupaciones
};
```

#### 1.6. Crear rutas `syllabusExtractionRoutes.js`

```javascript
// my-node-backend/src/routes/syllabusExtractionRoutes.js
const express = require('express');
const router = express.Router();
const syllabusController = require('../controllers/syllabusExtractionController');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/syllabus/' });

// Extracción de títulos
router.post('/extraer', authenticate, authorize(['administrador']), upload.single('file'), syllabusController.extraerTitulosSyllabus);

// Gestión de agrupaciones
router.get('/sesion-extraccion/:sessionId/agrupaciones', authenticate, syllabusController.obtenerAgrupacionesSyllabus);
router.post('/sesion-extraccion/:sessionId/agrupaciones', authenticate, authorize(['administrador']), syllabusController.guardarAgrupacionesSyllabus);
router.delete('/sesion-extraccion/:sessionId/agrupaciones', authenticate, authorize(['administrador']), syllabusController.eliminarAgrupacionesSyllabus);

module.exports = router;
```

#### 1.7. Registrar rutas en `server.js`

```javascript
const syllabusExtractionRoutes = require('./routes/syllabusExtractionRoutes');
app.use('/api/syllabus-extraction', syllabusExtractionRoutes);
```

---

### 2. **Frontend - Admin: Subir y Organizar**

#### 2.1. Crear página de extracción
**`app/dashboard/admin/syllabus/extraer-titulos/page.tsx`**

Similar a la página de programa analítico pero para syllabus:
- Subir archivo Excel/Word
- Ver títulos extraídos
- Botón "Organizar en Pestañas"

#### 2.2. Crear página de organización
**`app/dashboard/admin/syllabus/organizar-pestanas/page.tsx`**

Copiar la lógica de `admin/organizar-pestanas/page.tsx`:
- Drag & drop de títulos
- Crear pestañas
- Asignar colores e iconos
- Guardar configuración

---

### 3. **Frontend - Docente: Visualizar y Completar**

#### 3.1. Crear página de formularios dinámicos
**`app/dashboard/docente/syllabus-formularios/page.tsx`**

Similar a `docente/formularios-dinamicos/page.tsx`:
- Listar sesiones de syllabus disponibles
- Seleccionar sesión
- Ver títulos organizados en pestañas
- Completar formulario organizado

#### 3.2. Adaptar componente FormularioDinamico

El componente `components/programa-analitico/formulario-dinamico.tsx` ya está preparado para recibir agrupaciones. Solo necesitas:
- Pasar las agrupaciones de syllabus al componente
- El componente automáticamente mostrará las pestañas

---

## 🚀 Orden de Implementación Recomendado

### Fase 1: Backend (Base de datos y modelos)
1. ✅ Ejecutar migración `create-titulos-syllabus.sql`
2. ✅ Ejecutar migración `create-agrupaciones-syllabus.sql`
3. ✅ Crear modelo `TituloExtraidoSyllabus.js`
4. ✅ Crear modelo `AgrupacionTituloSyllabus.js`
5. ✅ Registrar modelos en `models/index.js`

### Fase 2: Backend (Lógica de negocio)
6. ✅ Crear `syllabusExtractionController.js`
7. ✅ Implementar función `extraerTitulosSyllabus`
8. ✅ Implementar funciones CRUD de agrupaciones
9. ✅ Crear `syllabusExtractionRoutes.js`
10. ✅ Registrar rutas en `server.js`

### Fase 3: Frontend Admin
11. ✅ Crear página `admin/syllabus/extraer-titulos`
12. ✅ Crear página `admin/syllabus/organizar-pestanas`
13. ✅ Agregar enlaces en dashboard admin

### Fase 4: Frontend Docente
14. ✅ Crear página `docente/syllabus-formularios`
15. ✅ Integrar con FormularioDinamico
16. ✅ Agregar enlace en dashboard docente

### Fase 5: Pruebas
17. ✅ Admin sube archivo de syllabus
18. ✅ Sistema extrae títulos automáticamente
19. ✅ Admin organiza títulos en pestañas
20. ✅ Docente visualiza formulario organizado
21. ✅ Docente completa y guarda syllabus

---

## 📝 Notas Importantes

### Diferencias con Programa Analítico
- Usar tablas separadas: `titulos_extraidos_syllabus` y `agrupaciones_titulos_syllabus`
- Rutas API en `/api/syllabus-extraction` en lugar de `/api/programa-analitico`
- Guardar contenido en tabla `syllabi` con campo `datos_syllabus`

### Reutilización de Código
- El componente `FormularioDinamico` ya está preparado (acepta `agrupaciones` como prop)
- La lógica de organización con drag & drop se puede reutilizar casi idénticamente
- Los estilos y UI components (Tabs, Badge, Card) son los mismos

### Validaciones
- Verificar que el usuario tenga permisos
- Validar formato de archivos (Excel: .xlsx, Word: .docx)
- Asegurar que session_id sea único
- Validar que titulo_ids existan en la sesión

---

## 🎨 Ejemplo Visual del Flujo

```
ADMIN:
1. Dashboard Admin → "Syllabus" → "Extraer Títulos"
2. Sube archivo "Syllabus Matemáticas.xlsx"
3. Sistema extrae 25 títulos automáticamente
4. Click en "Organizar Pestañas"
5. Arrastra títulos a 4 pestañas:
   - 📋 Datos Generales (5 campos)
   - 🎯 Contenidos (8 campos)
   - 📚 Evaluación (6 campos)
   - 🔧 Recursos (6 campos)
6. Guarda configuración

DOCENTE:
1. Dashboard Docente → "Formularios de Syllabus"
2. Ve lista de syllabus disponibles
3. Selecciona "Syllabus Matemáticas.xlsx"
4. Ve banner verde: "✅ Formulario organizado en pestañas"
5. Ve las 4 pestañas creadas por el admin
6. Completa campos en cada pestaña
7. Guarda syllabus completado
```

---

## 🔗 Archivos de Referencia

Para implementar cada parte, puedes copiar y adaptar estos archivos existentes:

### Backend
- Migración: `my-node-backend/migrations/create-agrupaciones-titulos.sql`
- Modelo: `my-node-backend/src/models/AgrupacionTitulo.js`
- Controlador: `my-node-backend/src/controllers/programaAnaliticoController.js`
- Rutas: `my-node-backend/src/routes/programaAnaliticoRoutes.js`

### Frontend Admin
- Extracción: `app/dashboard/admin/programa-analitico/page.tsx`
- Organización: `app/dashboard/admin/organizar-pestanas/page.tsx`

### Frontend Docente
- Formularios: `app/dashboard/docente/formularios-dinamicos/page.tsx`
- Componente: `components/programa-analitico/formulario-dinamico.tsx`

---

## ✅ Checklist de Tareas

### Backend
- [ ] Crear migración `create-titulos-syllabus.sql`
- [ ] Crear migración `create-agrupaciones-syllabus.sql`
- [ ] Ejecutar migraciones en base de datos
- [ ] Crear modelo `TituloExtraidoSyllabus.js`
- [ ] Crear modelo `AgrupacionTituloSyllabus.js`
- [ ] Registrar modelos en `models/index.js`
- [ ] Crear `syllabusExtractionController.js`
- [ ] Implementar `extraerTitulosSyllabus`
- [ ] Implementar `obtenerAgrupacionesSyllabus`
- [ ] Implementar `guardarAgrupacionesSyllabus`
- [ ] Crear `syllabusExtractionRoutes.js`
- [ ] Registrar rutas en `server.js`

### Frontend Admin
- [ ] Crear página `admin/syllabus/extraer-titulos/page.tsx`
- [ ] Crear página `admin/syllabus/organizar-pestanas/page.tsx`
- [ ] Agregar enlaces en dashboard admin

### Frontend Docente
- [ ] Crear página `docente/syllabus-formularios/page.tsx`
- [ ] Adaptar llamadas a API de syllabus
- [ ] Integrar con FormularioDinamico
- [ ] Agregar enlace en dashboard docente

### Pruebas
- [ ] Subir archivo Excel de syllabus
- [ ] Verificar extracción de títulos
- [ ] Organizar títulos en pestañas
- [ ] Visualizar pestañas en vista docente
- [ ] Completar y guardar formulario
- [ ] Verificar datos guardados en BD

---

## 💡 Consejos

1. **Usa búsqueda y reemplazo**: Copia archivos de programa analítico y reemplaza todas las ocurrencias:
   - `programa-analitico` → `syllabus-extraction`
   - `ProgramaAnalitico` → `Syllabus`
   - `AgrupacionTitulo` → `AgrupacionTituloSyllabus`
   - `TituloExtraido` → `TituloExtraidoSyllabus`

2. **Prueba en cada fase**: No avances a la siguiente fase hasta que la anterior funcione

3. **Reutiliza UI**: Los componentes visuales (pestañas, badges, cards) ya funcionan perfectamente

4. **Mantén consistencia**: Usa los mismos colores, iconos y estilos que en programa analítico

---

¿Por dónde quieres empezar? ¿Necesitas que te ayude con alguna parte específica?
