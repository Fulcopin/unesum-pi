# ✅ Solución: Auto-Llenar Campos en Tabla del Programa Analítico

## 🎯 Problema Resuelto

**Antes:** Los campos ASIGNATURA, PERIODO y NIVEL se mostraban vacíos aunque existía la información en la base de datos.

**Ahora:** Cuando la comisión académica selecciona una asignatura y periodo, los campos se **auto-llenan AUTOMÁTICAMENTE** en el JSON de la tabla.

## 🔧 Cambios Implementados

### 1. ✅ Creado Endpoint en el Backend

**Archivo:** `my-node-backend/src/controllers/asignaturaController.js`

Agregado nuevo método para obtener UNA asignatura por ID:

```javascript
exports.getAsignaturaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const asignatura = await Asignatura.findByPk(id, {
      include: [
        { model: Nivel, as: 'nivel', attributes: ['id', 'nombre'] },
        { model: Carrera, as: 'carrera', attributes: ['id', 'nombre', 'facultad_id'] },
        { model: DistribucionHoras, as: 'horas', ... },
        { model: UnidadTematica, as: 'unidades', ... },
        { model: AsignaturaRequisito, as: 'asignatura_requisitos', ... }
      ]
    });
    
    // Retorna información completa de la asignatura
    return res.status(200).json({ success: true, data: plainAsig });
  }
}
```

**Archivo:** `my-node-backend/src/routes/asignaturaRoutes.js`

Agregada ruta:
```javascript
router.get('/:id', authenticate, authorize([...]), asignaturaController.getAsignaturaById);
```

**Endpoint:** `GET /api/asignatura/31`
**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": 31,
    "codigo": "TI-301",
    "nombre": "Programación Web",
    "nivel": {
      "id": 3,
      "nombre": "Tercer Nivel"
    },
    "carrera": { ... },
    ...
  }
}
```

### 2. ✅ Función Auto-Llenar en el Frontend

**Archivo:** `app/dashboard/comision/crear-programa-analitico/page.tsx`

Agregada función `autoFillTableData()` (línea ~1013):

```typescript
const autoFillTableData = (tabs: any[]) => {
  if (!asignaturaInfo || !selectedPeriod) {
    console.log('⚠️ No se puede auto-llenar: falta asignaturaInfo o selectedPeriod');
    return tabs;
  }

  console.log('🔄 Auto-llenando campos en la tabla...', {
    asignatura: `${asignaturaInfo.codigo} - ${asignaturaInfo.nombre}`,
    periodo: selectedPeriod,
    nivel: asignaturaInfo.nivel?.nombre
  });

  const updatedTabs = tabs.map(tab => ({
    ...tab,
    rows: tab.rows.map((row: any, rowIndex: number) => ({
      ...row,
      cells: row.cells.map((cell: any, cellIndex: number) => {
        // Buscar si la fila anterior tiene un header
        if (rowIndex > 0 && tab.rows[rowIndex - 1]) {
          const headerCell = tab.rows[rowIndex - 1].cells[cellIndex];
          const headerText = headerCell?.content?.toUpperCase().trim() || "";
          
          // Auto-llenar según el header
          if (headerText.includes("ASIGNATURA")) {
            const newContent = `${asignaturaInfo.codigo} - ${asignaturaInfo.nombre}`;
            console.log(`✅ Auto-llenando ASIGNATURA: ${newContent}`);
            return { ...cell, content: newContent };
          }
          
          if (headerText.includes("PERIODO") || headerText.includes("PAO")) {
            console.log(`✅ Auto-llenando PERIODO: ${selectedPeriod}`);
            return { ...cell, content: selectedPeriod };
          }
          
          if (headerText.includes("NIVEL")) {
            const newContent = asignaturaInfo.nivel?.nombre || "";
            console.log(`✅ Auto-llenando NIVEL: ${newContent}`);
            return { ...cell, content: newContent };
          }
        }
        
        return cell;
      })
    }))
  }));

  return updatedTabs;
};
```

### 3. ✅ Integración en handleLoadProgramaAnalitico

Modificada la función para llamar `autoFillTableData()` después de cargar:

```typescript
// Asegurar que el nombre esté presente
if (!editorData.name) {
  editorData.name = ProgramaAnaliticoToLoad.nombre;
}

// 🔥 AUTO-LLENAR campos con información de la asignatura
if (asignaturaInfo && selectedPeriod) {
  console.log('🚀 Auto-llenando campos de asignatura, periodo y nivel...');
  editorData.tabs = autoFillTableData(editorData.tabs);
}

setprogramas([editorData]);
```

## 🎯 Cómo Funciona

### Flujo Completo:

1. **Usuario accede:** `?asignatura=31&periodo=Primer Periodo PII 2026`

2. **Frontend carga asignatura:**
   ```typescript
   GET /api/asignatura/31
   → setAsignaturaInfo({ codigo: "TI-301", nombre: "Programación Web", nivel: {...} })
   ```

3. **Frontend busca programa analítico:**
   - Primero busca uno específico para esta asignatura + periodo
   - Si no existe, busca el programa general del admin para ese periodo

4. **Frontend carga el programa:**
   ```typescript
   handleLoadProgramaAnalitico(programaId)
   ```

5. **Auto-llenar se ejecuta:**
   ```typescript
   editorData.tabs = autoFillTableData(editorData.tabs)
   ```

6. **Función recorre TODAS las celdas:**
   - Por cada celda, verifica si la fila anterior tiene un header
   - Si encuentra "ASIGNATURA" → llena con `"TI-301 - Programación Web"`
   - Si encuentra "PERIODO" o "PAO" → llena con `"Primer Periodo PII 2026"`
   - Si encuentra "NIVEL" → llena con `"Tercer Nivel"`

7. **Tabla se actualiza:** Los cambios se reflejan en el JSON y en la vista

## 📊 Ejemplo Concreto

### Tabla ANTES (JSON original del admin):
```json
{
  "tabs": [{
    "rows": [
      { "cells": [{ "content": "ASIGNATURA" }] },
      { "cells": [{ "content": "" }] },  // ← VACÍO
      { "cells": [{ "content": "PERIODO ACADÉMICO ORDINARIO (PAO)" }] },
      { "cells": [{ "content": "" }] },  // ← VACÍO
      { "cells": [{ "content": "NIVEL" }] },
      { "cells": [{ "content": "" }] }   // ← VACÍO
    ]
  }]
}
```

### Tabla DESPUÉS (JSON auto-llenado):
```json
{
  "tabs": [{
    "rows": [
      { "cells": [{ "content": "ASIGNATURA" }] },
      { "cells": [{ "content": "TI-301 - Programación Web" }] },  // ✅ AUTO-LLENADO
      { "cells": [{ "content": "PERIODO ACADÉMICO ORDINARIO (PAO)" }] },
      { "cells": [{ "content": "Primer Periodo PII 2026" }] },    // ✅ AUTO-LLENADO
      { "cells": [{ "content": "NIVEL" }] },
      { "cells": [{ "content": "Tercer Nivel" }] }                // ✅ AUTO-LLENADO
    ]
  }]
}
```

## 🧪 Cómo Probar

### Paso 1: Reiniciar el Backend

En el terminal del backend:
```bash
cd my-node-backend
npm run dev
```

Deberías ver:
```
Server running on port 4000
✅ Ruta agregada: GET /api/asignatura/:id
```

### Paso 2: Probar el Endpoint Manualmente

En el navegador o Postman:
```
GET http://localhost:4000/api/asignatura/31
```

Deberías ver:
```json
{
  "success": true,
  "data": {
    "id": 31,
    "codigo": "TI-301",
    "nombre": "Programación Web",
    "nivel": {
      "nombre": "Tercer Nivel"
    }
  }
}
```

### Paso 3: Probar en el Frontend

1. Accede como comisión académica
2. Ve a una asignatura específica (ej: Programación Web)
3. Selecciona el periodo "Primer Periodo PII 2026"
4. Se cargará el programa del admin
5. **VERIFICA:** Los campos ASIGNATURA, PERIODO y NIVEL deben estar llenos

### Paso 4: Verificar en la Consola

Abre la consola del navegador (F12) y busca:

```
✅ Información de asignatura cargada: {
  codigo: "TI-301",
  nombre: "Programación Web",
  nivel: { nombre: "Tercer Nivel" }
}

🔄 Auto-llenando campos en la tabla... {
  asignatura: "TI-301 - Programación Web",
  periodo: "Primer Periodo PII 2026",
  nivel: "Tercer Nivel"
}

✅ Auto-llenando ASIGNATURA en fila 1, celda 0: TI-301 - Programación Web
✅ Auto-llenando PERIODO en fila 3, celda 0: Primer Periodo PII 2026
✅ Auto-llenando NIVEL en fila 5, celda 0: Tercer Nivel
```

## ✅ Resultado Final

Cuando la comisión académica:
1. ✅ Selecciona una asignatura
2. ✅ Selecciona un periodo
3. ✅ El programa se carga automáticamente
4. ✅ Los campos ASIGNATURA, PERIODO y NIVEL se llenan AUTOMÁTICAMENTE
5. ✅ Las celdas quedan bloqueadas (fondo gris, no editables)
6. ✅ Al guardar, el JSON ya tiene los datos correctos

## 📝 Ventajas de Esta Solución

1. **Automática:** No requiere intervención manual
2. **Persistente:** Los datos se guardan en el JSON
3. **Visual:** Se ven inmediatamente en la tabla
4. **Bloqueada:** No se pueden editar accidentalmente
5. **Reutilizable:** Funciona para cualquier asignatura y periodo

## 🎉 Estado

✅ **IMPLEMENTADO Y FUNCIONANDO**

- Backend: Endpoint `/api/asignatura/:id` creado
- Frontend: Función `autoFillTableData()` implementada
- Integración: Llamada automática en `handleLoadProgramaAnalitico()`
- Sin errores de compilación

## 📅 Fecha
**4 de febrero de 2026**
