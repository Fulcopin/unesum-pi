# ✅ Permisos Compartidos: Comisión Académica

## 🎯 Problema Resuelto
Los usuarios con rol `comision_academica` recibían errores **401 (Unauthorized)** al intentar acceder a endpoints que estaban restringidos solo para administradores.

## 🔧 Cambios Realizados

### 1. **Middleware de Autenticación** (`auth.middleware.js`)
Se actualizó el middleware `authenticate` para que reconozca y valide correctamente a usuarios con rol `comision_academica`:

```javascript
// ANTES: Solo buscaba administradores en la tabla usuarios
if (decoded.rol === 'administrador') {
  user = await Usuario.findByPk(decoded.id);
}

// AHORA: Busca administradores Y comisión académica
if (decoded.rol === 'administrador' || decoded.rol === 'comision_academica' || decoded.rol === 'comision') {
  user = await Usuario.findByPk(decoded.id);
  if (user && !user.estado) {
    return res.status(401).json({ success: false, message: 'La cuenta del usuario está inactiva.' });
  }
}
```

### 2. **Rutas de Periodos** (`periodo.routes.js`)
La comisión académica ahora puede crear, editar y eliminar periodos:

```javascript
// ANTES: Solo administradores
authorize(['administrador'])

// AHORA: Administradores y comisión académica
authorize(['administrador', 'comision_academica'])
```

**Endpoints actualizados:**
- `POST /api/periodo` - Crear periodo
- `PUT /api/periodo/:id` - Actualizar periodo
- `PATCH /api/periodo/:id/estado` - Cambiar estado
- `DELETE /api/periodo/:id` - Eliminar periodo

### 3. **Rutas de Syllabus** (`syllabusExtractionRoutes.js`)
La comisión académica puede gestionar completamente el syllabus:

**Endpoints actualizados:**
- `POST /api/syllabus-extraction/extraer-titulos` - Extraer títulos de archivo
- `POST /api/syllabus-extraction/sesion-extraccion/:sessionId/agrupaciones` - Guardar agrupaciones
- `DELETE /api/syllabus-extraction/sesion-extraccion/:sessionId/agrupaciones` - Eliminar agrupaciones
- `DELETE /api/syllabus-extraction/sesion/:sessionId` - Eliminar sesión completa

### 4. **Rutas de Programas Analíticos** (`programasAnaliticos.routes.js`)
La comisión académica tiene acceso completo a los programas analíticos:

**Endpoints actualizados:**
- `POST /api/programas-analiticos/upload` - Subir Excel de programa
- `GET /api/programas-analiticos` - Listar todos los programas
- `GET /api/programas-analiticos/:id` - Ver programa específico
- `POST /api/programas-analiticos` - Crear programa
- `PUT /api/programas-analiticos/:id` - Actualizar programa
- `DELETE /api/programas-analiticos/:id` - Eliminar programa

### 5. **Rutas de Programa Analítico** (`programaAnaliticoRoutes.js`)
Gestión de agrupaciones de títulos:

**Endpoints actualizados:**
- `POST /api/programa-analitico/sesion-extraccion/:sessionId/agrupaciones` - Guardar agrupaciones
- `DELETE /api/programa-analitico/sesion-extraccion/:sessionId/agrupaciones` - Eliminar agrupaciones

## 📋 Resumen de Permisos

| Funcionalidad | Administrador | Comisión Académica | Profesor/Docente |
|--------------|---------------|-------------------|------------------|
| Gestionar Periodos | ✅ | ✅ | ❌ |
| Extraer Títulos Syllabus | ✅ | ✅ | ❌ |
| Ver Sesiones Syllabus | ✅ | ✅ | ✅ |
| Gestionar Agrupaciones Syllabus | ✅ | ✅ | ❌ |
| Eliminar Sesiones Syllabus | ✅ | ✅ | ❌ |
| Subir Programas Analíticos | ✅ | ✅ | ✅ |
| Gestionar Programas Analíticos | ✅ | ✅ | ❌ |
| Ver Formularios Dinámicos | ✅ | ✅ | ✅ |

## 🔐 Roles Soportados en la Base de Datos

El middleware ahora soporta correctamente estos roles:

1. **`administrador`** - Tabla: `usuarios`
2. **`comision_academica`** - Tabla: `usuarios`
3. **`comision`** - Tabla: `usuarios`
4. **`profesor`** - Tabla: `profesores`
5. **`docente`** - Tabla: `profesores`

## ✨ Resultado

Los usuarios con rol `comision_academica` ahora tienen los mismos permisos que los administradores para gestionar:
- ✅ Periodos académicos
- ✅ Extracciones de syllabus
- ✅ Programas analíticos
- ✅ Agrupaciones y organización de contenido

**Ya no recibirán errores 401 (Unauthorized)** al acceder a estos endpoints.
