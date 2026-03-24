# 🔧 SOLUCIÓN: Permisos y Filtrado para Comisión Académica

## 📋 PROBLEMAS IDENTIFICADOS

### 1. Error 403 - Forbidden
```
GET http://localhost:4000/api/syllabi 403 (Forbidden)
Error: No tienes permiso para realizar esta acción.
```

**Causa:** El endpoint `/api/syllabi` solo permitía acceso a rol `administrador`, pero el usuario tiene rol `comision_academica`.

### 2. No se guardan los syllabi
El botón "Guardar" no funciona para comisión académica.

### 3. Pantalla en blanco
Después de los cambios de permisos, la interfaz no carga correctamente.

---

## ✅ SOLUCIONES IMPLEMENTADAS

### 1. Permisos actualizados en `syllabus.routes.js`

**Archivo:** `my-node-backend/src/routes/syllabus.routes.js`

#### Cambios realizados:

```javascript
// ANTES: Solo administrador
router.get('/', authorize(['administrador']), syllabusController.getAll);

// AHORA: Admin + Comisión Académica
router.get('/', authorize(['administrador', 'comision_academica']), syllabusController.getAll);
```

#### Rutas actualizadas:

| Ruta | Método | Roles Permitidos |
|------|--------|------------------|
| `/api/syllabi` | GET | `administrador`, `comision_academica` |
| `/api/syllabi` | POST | `profesor`, `administrador`, `comision_academica` |
| `/api/syllabi/:id` | GET | `profesor`, `administrador`, `comision_academica` |
| `/api/syllabi/:id` | PUT | `profesor`, `administrador`, `comision_academica` |
| `/api/syllabi/:id` | DELETE | `profesor`, `administrador`, `comision_academica` |
| `/api/syllabi/upload` | POST | `profesor`, `administrador`, `comision_academica` |
| `/api/syllabi/upload-excel` | POST | `profesor`, `administrador`, `comision_academica` |
| `/api/syllabi/upload-validado` | POST | `profesor`, `comision`, `comision_academica` |

---

### 2. Filtrado por usuario en `syllabusController.js`

**Archivo:** `my-node-backend/src/controllers/syllabusController.js`

**Función modificada:** `exports.getAll`

#### Lógica implementada:

```javascript
exports.getAll = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const usuario_rol = req.user.rol;

    // 🔍 Construcción dinámica del WHERE
    const whereCondition = {};
    
    // Si es comisión académica, solo ve sus propios syllabi
    if (usuario_rol === 'comision_academica') {
      whereCondition.usuario_id = usuario_id;
    }
    // Si es administrador, ve TODOS (whereCondition vacío)

    const syllabi = await Syllabus.findAll({
      where: whereCondition,
      order: [['updatedAt', 'DESC']],
      include: {
        model: Usuario,
        as: 'creador',
        attributes: ['id', 'nombres', 'apellidos', 'rol']
      }
    });

    return res.status(200).json({ success: true, data: syllabi });
  } catch (error) {
    console.error('❌ Error al obtener syllabi:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener los syllabi',
      error: error.message
    });
  }
};
```

#### Comportamiento:

| Rol | Ve syllabi de: |
|-----|----------------|
| `administrador` | **TODOS** los usuarios |
| `comision_academica` | **SOLO los suyos** (filtrado por `usuario_id`) |
| `profesor` | Solo los suyos (usando `/api/syllabi/mine`) |

---

## 🔄 PASOS PARA APLICAR LOS CAMBIOS

### Paso 1: Reiniciar el Backend

El backend debe reiniciarse para cargar los cambios:

```powershell
# Detener el proceso actual de Node.js
Get-Process node | Where-Object {$_.MainWindowTitle -match "backend"} | Stop-Process

# O usar Ctrl+C en la terminal del backend

# Luego reiniciar:
cd my-node-backend
npm run dev
```

### Paso 2: Recargar el Frontend

En el navegador:
1. Presiona `Ctrl + Shift + R` (recarga forzada)
2. O cierra y abre nuevamente el navegador
3. Vuelve a iniciar sesión como `comision_academica`

---

## 🧪 PRUEBAS A REALIZAR

### Prueba 1: Verificar que carga la lista de syllabi

1. Login como `comision_academica`
2. Ir a `/dashboard/admin/editor-syllabus`
3. **Esperado:** 
   - No debe salir error 403
   - Debe cargar la interfaz correctamente
   - Debe mostrar solo los syllabi que esta comisión académica ha subido

### Prueba 2: Crear y guardar un syllabus

1. Click en "Nuevo" o "+ Crear Primer Syllabus"
2. Seleccionar periodo: "Primer Periodo PII 2026"
3. Agregar contenido (filas, columnas, texto)
4. Click en "Guardar" (botón azul)
5. **Esperado:**
   - Mensaje: "¡Syllabus guardado exitosamente!"
   - El syllabus aparece en "Syllabus Creados"
   - Se puede volver a cargar

### Prueba 3: Subir Word validado

1. Crear syllabus en el editor
2. Marcar como plantilla de referencia
3. Subir un documento Word con los mismos campos
4. **Esperado:**
   - Si cumple >= 95% → Se guarda
   - Si cumple < 95% → Muestra campos faltantes

### Prueba 4: Verificar filtrado

**Como Comisión Académica:**
```sql
-- Ver tus propios syllabi
SELECT id, nombre, periodo, usuario_id 
FROM syllabi 
WHERE usuario_id = [TU_ID];
```

**Como Administrador:**
```sql
-- Ver TODOS los syllabi
SELECT id, nombre, periodo, usuario_id 
FROM syllabi;
```

---

## 📊 LOGS DEL BACKEND

Cuando funcione correctamente, deberías ver en la consola del backend:

```bash
📋 [getAll] Usuario: 5, Rol: comision_academica, WHERE: { usuario_id: 5 }
✅ [getAll] Encontrados 3 syllabi
```

Si eres administrador:

```bash
📋 [getAll] Usuario: 1, Rol: administrador, WHERE: {}
✅ [getAll] Encontrados 15 syllabi
```

---

## 🐛 SOLUCIÓN A PROBLEMAS COMUNES

### Problema: Sigue saliendo 403

**Solución:**
1. Verifica que el backend se reinició correctamente
2. Busca en consola: `Server running on port 4000`
3. Si no, detén todos los procesos Node y reinicia:
   ```powershell
   Stop-Process -Name node -Force
   cd my-node-backend
   npm run dev
   ```

### Problema: No se ve nada (pantalla blanca)

**Solución:**
1. Abre consola del navegador (F12)
2. Busca errores en rojo
3. Si dice "Cannot read property of undefined":
   - Verifica que `savedSyllabi` existe
   - Revisa que `syllabi` no es null
4. Recarga con `Ctrl + Shift + R`

### Problema: Ve syllabi de otros usuarios

**Solución:**
Verifica el rol en la base de datos:

```sql
SELECT id, nombres, apellidos, correo, rol 
FROM usuarios 
WHERE correo = '[tu_correo]';
```

Debe ser exactamente: `comision_academica` (no `comisión_académica` con tilde)

### Problema: No se guarda al hacer clic en "Guardar"

**Verificaciones:**
1. Abre consola del navegador (F12)
2. Click en "Guardar"
3. Busca en "Network" la petición a `/api/syllabi`
4. Si es 403 → Problema de permisos
5. Si es 400 → Falta algún campo (periodo, nombre, datos_syllabus)
6. Si es 500 → Error del servidor (ver logs del backend)

**Solución si falta periodo:**
```typescript
// Verifica que selectedPeriod no esté vacío
console.log("Periodo seleccionado:", selectedPeriod);

// Si está vacío, selecciona uno del dropdown antes de guardar
```

---

## 📝 RESUMEN DE CAMBIOS

| Archivo | Cambio | Estado |
|---------|--------|--------|
| `syllabus.routes.js` | Agregado `comision_academica` a rutas | ✅ Completo |
| `syllabusController.js` | Filtrado por `usuario_id` en `getAll` | ✅ Completo |
| Backend | Reinicio requerido | ⏳ Pendiente |
| Frontend | Recarga requerida | ⏳ Pendiente |

---

## 🎯 SIGUIENTE PASO

**ACCIÓN INMEDIATA REQUERIDA:**

```powershell
# 1. Ir a la terminal del backend y presionar Ctrl+C para detener
# 2. Luego ejecutar:
cd my-node-backend
npm run dev

# 3. Esperar a que diga: "Server running on port 4000"
# 4. En el navegador, recargar con Ctrl+Shift+R
# 5. Volver a iniciar sesión
# 6. Ir a /dashboard/admin/editor-syllabus
```

**Después de esto, deberías poder:**
- ✅ Ver la interfaz sin error 403
- ✅ Ver solo tus syllabi (no los de otros)
- ✅ Crear y guardar nuevos syllabi
- ✅ Subir archivos Word con validación

---

**Fecha:** 2026-01-11  
**Versión:** 2.2  
**Estado:** 🔧 Cambios listos - Reinicio pendiente
