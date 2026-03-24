# ✅ SISTEMA DE VALIDACIÓN: 1 Syllabus y 1 Programa Analítico por Periodo/Materia

## 📋 IMPLEMENTACIÓN COMPLETADA

### 🎯 OBJETIVO
- Un profesor solo puede subir **1 syllabus** por periodo por materia
- Un profesor solo puede subir **1 programa analítico** por periodo por materia
- Si intenta subir otro, recibe mensaje de error
- Puede **eliminar** el existente para subir uno nuevo
- **Indicador visual** cuando ya está subido

---

## ✅ CAMBIOS EN SYLLABUS

### 1. Modificación en `syllabusController.js` - Función `create`

**Archivo:** `my-node-backend/src/controllers/syllabusController.js`  
**Línea:** ~12

```javascript
exports.create = async (req, res) => {
  try {
    const { nombre, periodo, materias, datos_syllabus } = req.body;
    const usuario_id = req.user.id; 

    if (!nombre || !periodo || !datos_syllabus) {
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, periodo y datos_syllabus son obligatorios'
      });
    }

    // 🔒 VALIDACIÓN: Verificar si ya existe un syllabus para esta materia y periodo
    const syllabusExistente = await Syllabus.findOne({
      where: {
        usuario_id: usuario_id,
        periodo: periodo,
        materias: materias || nombre,
        es_eliminado: false // Solo considerar los NO eliminados
      }
    });

    if (syllabusExistente) {
      return res.status(409).json({ // 409 = Conflict
        success: false,
        message: `Ya existe un syllabus para la materia "${materias || nombre}" en el periodo "${periodo}". Solo puede tener un syllabus por materia por periodo.`,
        existente: {
          id: syllabusExistente.id,
          nombre: syllabusExistente.nombre,
          fecha_creacion: syllabusExistente.created_at
        }
      });
    }
    
    // ... resto del código ...
  }
};
```

### 2. Nueva función `verificarExistencia`

**Archivo:** `my-node-backend/src/controllers/syllabusController.js`  
**Línea:** ~195 (después de `getMine`)

```javascript
// --- VERIFICAR SI YA EXISTE SYLLABUS PARA MATERIA/PERIODO ---
exports.verificarExistencia = async (req, res) => {
  try {
    const { periodo, materia } = req.query;
    const usuario_id = req.user.id;

    console.log('🔍 Verificando existencia:', { usuario_id, periodo, materia });

    if (!periodo || !materia) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere periodo y materia'
      });
    }

    const syllabusExistente = await Syllabus.findOne({
      where: {
        usuario_id: usuario_id,
        periodo: periodo,
        materias: materia,
        es_eliminado: false
      },
      attributes: ['id', 'nombre', 'created_at', 'updated_at']
    });

    if (syllabusExistente) {
      return res.status(200).json({
        success: true,
        existe: true,
        message: `Ya existe un syllabus para "${materia}" en el periodo "${periodo}"`,
        syllabus: {
          id: syllabusExistente.id,
          nombre: syllabusExistente.nombre,
          fecha_creacion: syllabusExistente.created_at,
          fecha_actualizacion: syllabusExistente.updated_at
        }
      });
    }

    return res.status(200).json({
      success: true,
      existe: false,
      message: 'No existe syllabus para esta materia/periodo, puede subir uno nuevo'
    });

  } catch (error) {
    console.error('❌ Error al verificar existencia:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar existencia de syllabus',
      error: error.message
    });
  }
};
```

### 3. Nueva ruta en `syllabus.routes.js`

**Archivo:** `my-node-backend/src/routes/syllabus.routes.js`  
**Línea:** ~30 (ANTES de la ruta `/mine`)

```javascript
// GET /api/syllabi/verificar-existencia -> Verificar si ya existe syllabus para materia/periodo
// PERMITIDO PARA: 'profesor', 'comision_academica', 'administrador'
// Query params: periodo, materia
router.get('/verificar-existencia', 
  authorize(['profesor', 'administrador', 'comision_academica']), 
  syllabusController.verificarExistencia
);
```

---

## 📝 PRÓXIMOS PASOS - FRONTEND

### 1. Verificar antes de mostrar el formulario

**Archivo a crear/modificar:** `app/dashboard/docente/syllabus/page.tsx`

```typescript
const verificarSyllabusExistente = async (periodo: string, materia: string) => {
  try {
    const response = await fetch(
      `http://localhost:4000/api/syllabi/verificar-existencia?periodo=${encodeURIComponent(periodo)}&materia=${encodeURIComponent(materia)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();
    
    if (data.existe) {
      // Mostrar alerta
      alert(`⚠️ ${data.message}\n\nFecha de creación: ${new Date(data.syllabus.fecha_creacion).toLocaleDateString()}\n\nSi desea subir uno nuevo, primero elimine el existente.`);
      
      // Opcional: Redirigir a la lista
      router.push('/dashboard/docente/mis-syllabus');
      
      return true; // Ya existe
    }
    
    return false; // No existe, puede continuar
    
  } catch (error) {
    console.error('Error al verificar:', error);
    return false;
  }
};

// Llamar cuando el usuario seleccione periodo y materia
const handleContinuar = async () => {
  const yaExiste = await verificarSyllabusExistente(periodoSeleccionado, materiaSeleccionada);
  
  if (yaExiste) {
    return; // Detener, no permitir continuar
  }
  
  // Si no existe, continuar con el flujo normal
  setMostrarEditor(true);
};
```

### 2. Manejar el error 409 al guardar

```typescript
const handleGuardar = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/syllabi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        nombre: nombreSyllabus,
        periodo: periodoSeleccionado,
        materias: materiaSeleccionada,
        datos_syllabus: datosSyllabus
      })
    });

    const data = await response.json();

    if (response.status === 409) {
      // Ya existe
      alert(`❌ ${data.message}\n\nSyllabus existente:\n- ID: ${data.existente.id}\n- Nombre: ${data.existente.nombre}\n- Fecha: ${new Date(data.existente.fecha_creacion).toLocaleDateString()}\n\n💡 Si desea reemplazarlo, elimine el syllabus existente primero.`);
      return;
    }

    if (!response.ok) {
      throw new Error(data.message);
    }

    alert('✅ Syllabus guardado exitosamente');
    router.push('/dashboard/docente/mis-syllabus');

  } catch (error) {
    console.error('Error al guardar:', error);
    alert(`❌ Error: ${error.message}`);
  }
};
```

### 3. Mostrar indicador visual en la lista

**En la página de "Mis Syllabus":**

```tsx
{syllabus.tiene_subido_este_periodo ? (
  <span className="flex items-center gap-2 text-green-600 font-semibold">
    <CheckCircle className="h-5 w-5" />
    Subido
  </span>
) : (
  <span className="text-gray-400">
    Sin subir
  </span>
)}
```

### 4. Botón para eliminar y permitir nuevo upload

```tsx
<Button
  variant="destructive"
  size="sm"
  onClick={() => handleEliminarParaReemplazar(syllabus.id)}
>
  <Trash2 className="h-4 w-4 mr-2" />
  Eliminar para subir nuevo
</Button>
```

```typescript
const handleEliminarParaReemplazar = async (id: number) => {
  if (!confirm('¿Está seguro que desea eliminar este syllabus?\n\nEsto le permitirá subir uno nuevo para esta materia y periodo.')) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:4000/api/syllabi/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al eliminar');
    }

    alert('✅ Syllabus eliminado. Ahora puede subir uno nuevo.');
    
    // Recargar la lista
    fetchSyllabi();

  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al eliminar el syllabus');
  }
};
```

---

## 🧪 PRUEBAS

### Caso 1: Profesor intenta subir segundo syllabus para misma materia/periodo

**Request:**
```http
POST /api/syllabi
Authorization: Bearer <token_profesor>
Content-Type: application/json

{
  "nombre": "Syllabus Matemáticas 2",
  "periodo": "2025-1",
  "materias": "Matemáticas",
  "datos_syllabus": { ... }
}
```

**Response esperada: 409 Conflict**
```json
{
  "success": false,
  "message": "Ya existe un syllabus para la materia \"Matemáticas\" en el periodo \"2025-1\". Solo puede tener un syllabus por materia por periodo.",
  "existente": {
    "id": 15,
    "nombre": "Syllabus Matemáticas",
    "fecha_creacion": "2026-01-15T10:30:00.000Z"
  }
}
```

### Caso 2: Verificar existencia antes de subir

**Request:**
```http
GET /api/syllabi/verificar-existencia?periodo=2025-1&materia=Matemáticas
Authorization: Bearer <token_profesor>
```

**Response si existe:**
```json
{
  "success": true,
  "existe": true,
  "message": "Ya existe un syllabus para \"Matemáticas\" en el periodo \"2025-1\"",
  "syllabus": {
    "id": 15,
    "nombre": "Syllabus Matemáticas",
    "fecha_creacion": "2026-01-15T10:30:00.000Z",
    "fecha_actualizacion": "2026-01-20T14:20:00.000Z"
  }
}
```

**Response si NO existe:**
```json
{
  "success": true,
  "existe": false,
  "message": "No existe syllabus para esta materia/periodo, puede subir uno nuevo"
}
```

### Caso 3: Eliminar para subir uno nuevo

**Request:**
```http
DELETE /api/syllabi/15
Authorization: Bearer <token_profesor>
```

**Response:**
```json
{
  "success": true,
  "message": "Syllabus eliminado exitosamente"
}
```

**Luego puede subir uno nuevo para la misma materia/periodo.**

---

## 📊 DIAGRAMA DE FLUJO

```
Usuario selecciona Periodo + Materia
          │
          ▼
    ┌─────────────────┐
    │ Verificar si    │
    │ ya existe       │
    └─────┬───────────┘
          │
    ┌─────▼─────┐
    │ ¿Existe?  │
    └─┬─────┬───┘
      │     │
    NO│     │SÍ
      │     │
      │     ▼
      │  ┌─────────────────────┐
      │  │ Mostrar alerta:     │
      │  │ "Ya existe syllabus"│
      │  │                     │
      │  │ Opciones:           │
      │  │ - Ver existente     │
      │  │ - Eliminar y subir  │
      │  │   nuevo             │
      │  └─────────────────────┘
      │
      ▼
┌──────────────────┐
│ Permitir subir   │
│ nuevo syllabus   │
└──────────────────┘
      │
      ▼
┌──────────────────┐
│ Usuario llena    │
│ formulario       │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Intenta guardar  │
└──────┬───────────┘
       │
  ┌────▼────┐
  │ ¿Existe?│
  └─┬────┬──┘
    │    │
   NO│   │SÍ
    │    │
    │    ▼
    │  ┌──────────────┐
    │  │ Error 409    │
    │  │ "Ya existe"  │
    │  └──────────────┘
    │
    ▼
┌──────────────────┐
│ Guardar OK       │
│ Status 201       │
└──────────────────┘
```

---

## 🔒 REGLAS DE VALIDACIÓN

1. **Unicidad:** `(usuario_id, periodo, materias)` debe ser único
2. **Soft Delete:** Solo considera registros con `es_eliminado = false`
3. **Periodo exacto:** "2025-1" ≠ "2025-I" (match exacto de string)
4. **Materia exacta:** "Matemáticas" ≠ "matematicas" (case sensitive)

---

## 📝 RECOMENDACIONES

### Para el Frontend

1. **Normalizar nombres:**
   ```typescript
   const normalizarMateria = (materia: string) => {
     return materia.trim().toLowerCase();
   };
   ```

2. **Confirmar antes de eliminar:**
   ```typescript
   const confirmarEliminacion = () => {
     return window.confirm(
       '⚠️ ADVERTENCIA\n\n' +
       'Al eliminar este syllabus, podrá subir uno nuevo.\n' +
       'Esta acción no se puede deshacer.\n\n' +
       '¿Desea continuar?'
     );
   };
   ```

3. **Loading states:**
   ```tsx
   {verificando && <Spinner />}
   {!verificando && !existe && <FormularioSyllabus />}
   {!verificando && existe && <AlertaYaExiste />}
   ```

### Para UX

1. **Badge visual:**
   ```tsx
   {yaSubido && (
     <Badge variant="success">
       <CheckCircle className="h-3 w-3 mr-1" />
       Subido este periodo
     </Badge>
   )}
   ```

2. **Tooltip explicativo:**
   ```tsx
   <Tooltip content="Solo puede tener un syllabus por materia por periodo">
     <InfoIcon className="h-4 w-4 text-gray-400" />
   </Tooltip>
   ```

---

## ✅ ESTADO ACTUAL

- ✅ Validación en `create` implementada
- ✅ Función `verificarExistencia` creada
- ✅ Ruta `/verificar-existencia` agregada
- ⏳ Frontend pendiente de implementación
- ⏳ Mismo sistema para Programa Analítico (próximo paso)

---

## 🔄 PRÓXIMO: PROGRAMA ANALÍTICO

Aplicar el mismo patrón a:
- `programaAnaliticoController.js`
- Función `guardarFormularioDinamico`
- Nueva ruta de verificación
- Frontend correspondiente

---

**Fecha:** 2026-01-30  
**Estado:** ✅ Backend completado - Frontend pendiente  
**Archivos modificados:**
- `my-node-backend/src/controllers/syllabusController.js`
- `my-node-backend/src/routes/syllabus.routes.js`
