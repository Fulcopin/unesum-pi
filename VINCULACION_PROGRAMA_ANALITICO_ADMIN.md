# 📋 Vinculación Programa Analítico - Panel Admin

## ✅ Estado Actual de Implementación

### 1. 🎯 Panel de Administración
**Ubicación:** `/app/dashboard/admin/page.tsx`

El panel admin ya tiene vinculado el módulo de Programa Analítico:

```typescript
{
  title: "Programa Analítico",
  description: "Gestionar programas analíticos y plantillas",
  icon: ClipboardList,
  href: "/dashboard/admin/programa-analitico",
  color: "bg-cyan-500",
}
```

### 2. 📁 Estructura de Rutas Creadas

```
/dashboard/admin/programa-analitico/
├── page.tsx                 → Vista principal (lista y opciones)
├── crear/page.tsx          → Crear nuevo programa
├── dinamico/page.tsx       → Formulario dinámico
├── lista/page.tsx          → Gestión de Excel
└── asignar/[id]/page.tsx   → Asignar a docente
```

### 3. 🔌 Backend - API Endpoints

**Base:** `http://localhost:4000/api/programa-analitico`

#### Endpoints Disponibles:
- ✅ `GET /` - Listar todos los programas
- ✅ `GET /:id` - Obtener programa por ID
- ✅ `POST /upload` - Subir desde Excel
- ✅ `POST /asignar` - Asignar a docente
- ✅ `GET /disponibles` - Programas con plantilla
- ✅ `GET /mis-programas` - Programas del docente
- ✅ `DELETE /:id` - Eliminar programa

### 4. 🗄️ Base de Datos

#### Tablas Involucradas:

```sql
-- Tabla principal
programas_analiticos
├── id (PK)
├── nombre
├── datos_tabla (JSONB)
├── usuario_id (FK → usuarios)
├── plantilla_id (FK → plantillas_programa) ⚠️ FALTA AGREGAR
├── createdAt
└── updatedAt

-- Plantillas
plantillas_programa
├── id (PK)
├── nombre
├── descripcion
├── tipo
└── activa

-- Secciones de plantilla
secciones_plantilla
├── id (PK)
├── plantilla_id (FK)
├── nombre
├── tipo (texto_largo|tabla)
└── orden

-- Campos de sección
campos_seccion
├── id (PK)
├── seccion_id (FK)
├── nombre
├── tipo_campo
└── orden

-- Asignaciones a docentes
asignaciones_programa_docente
├── id (PK)
├── programa_analitico_id (FK)
├── profesor_id (FK)
├── estado
└── fecha_asignacion
```

### 5. ⚠️ PROBLEMA IDENTIFICADO

El modelo `programas_analiticos.js` **NO tiene la columna `plantilla_id`**:

```javascript
// ❌ FALTA AGREGAR:
plantilla_id: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: {
    model: 'plantillas_programa',
    key: 'id'
  }
}
```

## 🔧 Soluciones Requeridas

### A. Actualizar Modelo de Programas Analíticos

**Archivo:** `my-node-backend/src/models/programas_analiticos.js`

Agregar el campo `plantilla_id` para vincular con las plantillas creadas dinámicamente.

### B. Crear Migración para Agregar Columna

```sql
ALTER TABLE programas_analiticos 
ADD COLUMN plantilla_id INTEGER REFERENCES plantillas_programa(id);
```

### C. Verificar Flujo de Guardado

El controlador `uploadExcel` ya crea la plantilla pero necesita guardar correctamente:

```javascript
const programaData = {
  nombre: datosGenerales.asignatura || 'Programa Analítico',
  plantilla_id: plantilla.id, // ✅ Ya está implementado
  datos_tabla: { /* ... */ },
  usuario_id: req.user?.id || null
};
```

## 🎯 Flujo Completo Implementado

### 1. Admin Sube Excel
```
Admin → /programa-analitico/lista → Sube Excel
     ↓
Backend detecta estructura → Crea plantilla automática
     ↓
Guarda programa con plantilla_id
```

### 2. Admin Asigna a Docente
```
Admin → /programa-analitico → Selecciona programa
     ↓
Asignar → Selecciona docente, asignatura, nivel
     ↓
Crea asignación en asignaciones_programa_docente
```

### 3. Docente Llena Formulario
```
Docente → /dashboard/docente/mis-programas
       ↓
Ve programas asignados → Abre formulario dinámico
       ↓
Llena campos según plantilla → Guarda en contenido_programa
```

## 📊 Verificación Actual

Según los logs del servidor:
```
✅ Se encontraron 0 programas con plantilla
```

**Problema:** No hay programas guardados con `plantilla_id`.

## ✅ Acciones Inmediatas

1. ✅ Verificar que el modelo tenga `plantilla_id`
2. ✅ Ejecutar migración si falta la columna
3. ✅ Probar subir un Excel nuevo
4. ✅ Verificar que se guarde con `plantilla_id`
5. ✅ Confirmar que aparezca en lista de programas

## 🎨 Interfaz Admin Actual

### Módulos Disponibles:
1. **Crear Nuevo** - Formulario desde cero
2. **Importar Excel** - Carga automática con plantilla
3. **Lista de Programas** - Ver todos los programas
4. **Asignar a Docente** - Vincular con profesor

### Acciones por Programa:
- 👁️ **Ver** - Ver contenido completo
- ✏️ **Editar** - Modificar datos
- 👤 **Asignar** - Asignar a docente
- 🗑️ **Eliminar** - Borrar programa

## 🔗 Vínculos Clave

```typescript
// Panel Admin
/dashboard/admin → Módulo "Programa Analítico"

// Gestión de Programas
/programa-analitico → Lista y opciones

// Crear/Importar
/programa-analitico/dinamico → Formulario manual
/programa-analitico/lista → Desde Excel

// Asignación
/programa-analitico/asignar/[id] → Asignar a docente
```

---

**Fecha:** 7 de diciembre de 2025
**Estado:** ✅ Frontend vinculado | ⚠️ Backend necesita ajustes en modelo
