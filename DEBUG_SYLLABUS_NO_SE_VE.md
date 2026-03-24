# 🔍 DEBUG: Ver Contenido del Syllabus Guardado

## 📋 PROBLEMA ACTUAL

**Síntoma:** Cuando haces clic en "Modificar" en el syllabus "Fundamento de Programación PI 2025", la pantalla queda en blanco sin mostrar la tabla.

**Causa probable:** El campo `datos_syllabus` (JSON) en la base de datos no tiene la estructura correcta que el editor espera.

---

## ✅ SOLUCIÓN IMPLEMENTADA

He mejorado la función `handleLoadSyllabus` para:

1. **Mostrar logs detallados** de lo que contiene `datos_syllabus`
2. **Validar y normalizar** la estructura automáticamente
3. **Crear tabs desde rows** si la estructura es del formato antiguo

### Código actualizado (línea ~220):

```typescript
const handleLoadSyllabus = (syllabusId: string) => {
  console.log("🔍 handleLoadSyllabus - ID recibido:", syllabusId);
  console.log("📚 savedSyllabi disponibles:", savedSyllabi.length);
  
  // ... validaciones ...
  
  if (syllabusToLoad) {
    console.log("✅ Cargando syllabus:", syllabusToLoad.nombre);
    console.log("📊 Estructura datos_syllabus:", JSON.stringify(syllabusToLoad.datos_syllabus, null, 2));
    
    const editorData = syllabusToLoad.datos_syllabus;
    editorData.id = syllabusToLoad.id;
    
    // ✅ VALIDACIÓN Y NORMALIZACIÓN DE LA ESTRUCTURA
    if (!editorData.tabs || editorData.tabs.length === 0) {
      console.log("⚠️ No hay tabs, creando estructura desde rows...");
      
      // Si tiene rows directamente (formato antiguo)
      if ((editorData as any).rows && Array.isArray((editorData as any).rows)) {
        console.log("📋 Encontradas", (editorData as any).rows.length, "filas directas");
        editorData.tabs = [{ 
          id: `tab-${Date.now()}`, 
          title: "General", 
          rows: (editorData as any).rows 
        }];
      } else {
        // Crear estructura vacía
        console.log("⚠️ No hay rows, creando estructura vacía");
        editorData.tabs = [{ 
          id: `tab-${Date.now()}`, 
          title: "General", 
          rows: [] 
        }];
      }
    } else {
      console.log(`✅ Estructura con ${editorData.tabs.length} tabs encontrada`);
      editorData.tabs.forEach((tab: any, idx: number) => {
        console.log(`   Tab ${idx + 1}: "${tab.title}" - ${tab.rows?.length || 0} filas`);
      });
    }
    
    // ... resto del código ...
  }
};
```

---

## 🧪 PASOS PARA VERIFICAR

### 1. Reinicia el frontend si es necesario

```powershell
# Presiona Ctrl+C en la terminal de Next.js
# Luego ejecuta:
npm run dev
```

### 2. Abre la consola del navegador

1. Presiona **F12** o **Ctrl + Shift + I**
2. Ve a la pestaña **Console**
3. Limpia la consola (ícono de prohibido ⛔ o Ctrl+L)

### 3. Intenta cargar el syllabus

1. En `/dashboard/admin/editor-syllabus`
2. Busca "Syllabus de Fundamento de Programación PI 2025" en la tabla
3. Click en **"Modificar"**
4. **Observa la consola**

---

## 📊 LOGS ESPERADOS EN LA CONSOLA

### Si TODO está bien:

```bash
🔍 handleLoadSyllabus - ID recibido: 3
📚 savedSyllabi disponibles: 1
🔢 ID parseado: 3
📖 Syllabus encontrado: SÍ
✅ Cargando syllabus: Syllabus de Fundamento de Programación PI 2025
📊 Estructura datos_syllabus: {
  "id": 3,
  "name": "Syllabus",
  "tabs": [
    {
      "id": "tab-123456",
      "title": "General",
      "rows": [
        {
          "id": "r-1",
          "cells": [
            { "id": "c-1", "content": "Campo 1", "isHeader": true, ... },
            { "id": "c-2", "content": "Valor 1", "isHeader": false, ... }
          ]
        },
        ...
      ]
    }
  ]
}
✅ Estructura con 1 tabs encontrada
   Tab 1: "General" - 15 filas
✅ Syllabus cargado exitosamente
   - ID: 3
   - Nombre: Syllabus
   - Periodo: Primer Periodo PII 2026
   - Tabs: 1
   - Filas en tab activo: 15
```

### Si tiene estructura ANTIGUA (formato sin tabs):

```bash
🔍 handleLoadSyllabus - ID recibido: 3
📚 savedSyllabi disponibles: 1
🔢 ID parseado: 3
📖 Syllabus encontrado: SÍ
✅ Cargando syllabus: Syllabus de Fundamento de Programación PI 2025
📊 Estructura datos_syllabus: {
  "id": 3,
  "name": "Syllabus",
  "rows": [
    {
      "id": "r-1",
      "cells": [...]
    }
  ]
}
⚠️ No hay tabs, creando estructura desde rows...
📋 Encontradas 15 filas directas
✅ Syllabus cargado exitosamente
   - ID: 3
   - Nombre: Syllabus
   - Periodo: Primer Periodo PII 2026
   - Tabs: 1
   - Filas en tab activo: 15
```

### Si está VACÍO:

```bash
🔍 handleLoadSyllabus - ID recibido: 3
📚 savedSyllabi disponibles: 1
🔢 ID parseado: 3
📖 Syllabus encontrado: SÍ
✅ Cargando syllabus: Syllabus de Fundamento de Programación PI 2025
📊 Estructura datos_syllabus: {}
⚠️ No hay tabs, creando estructura desde rows...
⚠️ No hay rows, creando estructura vacía
✅ Syllabus cargado exitosamente
   - ID: 3
   - Nombre: Syllabus de Fundamento de Programación PI 2025
   - Periodo: Primer Periodo PII 2026
   - Tabs: 1
   - Filas en tab activo: 0
```

---

## 🔧 SOLUCIONES SEGÚN EL CASO

### Caso A: Si dice "Estructura con X tabs encontrada"

**Resultado:** ✅ La estructura es correcta
**Acción:** El syllabus debería mostrarse correctamente. Si no se ve:
- Verifica que `activeTab` no sea null
- Revisa si hay errores de renderizado en la consola (errores rojos)

### Caso B: Si dice "Encontradas X filas directas"

**Resultado:** ⚠️ Formato antiguo (sin tabs)
**Acción:** La función automáticamente crea un tab "General" con esas filas
- El syllabus debería mostrarse correctamente ahora
- Al guardar, se guardará con la nueva estructura (con tabs)

### Caso C: Si dice "No hay rows, creando estructura vacía"

**Resultado:** ❌ El syllabus está vacío en la base de datos
**Acción:** 
1. **Opción 1 - Subir nuevamente desde Word:**
   - Click en "Nuevo"
   - Selecciona periodo
   - Sube el archivo Word original
   
2. **Opción 2 - Crear manualmente:**
   - Click en botones "+ Fila ↑" para agregar filas
   - Click en "Guardar"

### Caso D: Si NO se encuentra el syllabus

```bash
❌ No se encontró el syllabus con ID: 3
📋 IDs disponibles: [1, 2, 4]
```

**Problema:** El syllabus no existe en `savedSyllabi` o el ID no coincide
**Causa:** 
- El filtro por periodo lo está ocultando
- No se cargó correctamente desde `/api/syllabi`

**Solución:**
1. Verifica que el periodo seleccionado sea correcto
2. Recarga la página (Ctrl + R)
3. Si persiste, verifica en la base de datos:
   ```sql
   SELECT id, nombre, periodo, usuario_id, datos_syllabus 
   FROM syllabi 
   WHERE nombre LIKE '%Fundamento%';
   ```

---

## 🗄️ VERIFICAR EN BASE DE DATOS

Si quieres ver directamente qué hay guardado:

```sql
-- Ver todos los syllabi de comisión académica
SELECT 
  id, 
  nombre, 
  periodo, 
  materias,
  jsonb_pretty(datos_syllabus) as estructura
FROM syllabi
WHERE usuario_id = [TU_ID_USUARIO]
ORDER BY created_at DESC;
```

**Reemplaza `[TU_ID_USUARIO]`** con tu ID real.

### Estructura esperada en `datos_syllabus`:

```json
{
  "id": 3,
  "name": "Syllabus",
  "tabs": [
    {
      "id": "tab-1234567890",
      "title": "General",
      "rows": [
        {
          "id": "r-1",
          "cells": [
            {
              "id": "c-r-1-0",
              "content": "Campo",
              "isHeader": true,
              "rowSpan": 1,
              "colSpan": 1,
              "isEditable": true
            }
          ]
        }
      ]
    }
  ],
  "metadata": {
    "createdAt": "2026-01-11T...",
    "updatedAt": "2026-01-11T..."
  }
}
```

---

## 📝 SIGUIENTES PASOS

1. **Recarga el frontend** (Ctrl+R en el navegador)
2. **Abre consola del navegador** (F12)
3. **Click en "Modificar"** en el syllabus
4. **Copia y pega aquí los logs** que aparecen en la consola
5. Con esos logs puedo darte la solución exacta

---

## 🎯 RESULTADO ESPERADO FINAL

Después de esta corrección, cuando hagas clic en "Modificar":

1. ✅ **Se abre el editor** con el nombre del syllabus
2. ✅ **Se muestra el tab "General"** (o los tabs que tenga)
3. ✅ **Se renderiza la tabla** con todas las filas y columnas
4. ✅ **Puedes editar las celdas** haciendo doble clic
5. ✅ **Puedes guardar cambios** con el botón "Guardar"

---

**Fecha:** 2026-01-11  
**Archivo modificado:** `app/dashboard/admin/editor-syllabus/page.tsx`  
**Línea:** ~220 (función `handleLoadSyllabus`)  
**Estado:** ✅ Corrección implementada - Esperando prueba
