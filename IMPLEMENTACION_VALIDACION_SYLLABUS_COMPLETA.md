# 🎯 IMPLEMENTACIÓN COMPLETA - VALIDACIÓN DE SYLLABUS

## Fecha: 11 de Enero de 2026

---

## 📋 RESUMEN EJECUTIVO

Se ha implementado un sistema completo de validación de syllabus que permite:

1. **Admin configura estructura** en el editor visual (`/dashboard/admin/editor-syllabus`)
2. **Admin marca plantilla** para un periodo académico
3. **Profesores suben syllabus** que son validados automáticamente
4. **Sistema rechaza** documentos que no cumplan con la estructura requerida

### ✅ VENTAJAS DEL NUEVO SISTEMA

- ✓ **Una sola fuente de verdad**: El editor del admin
- ✓ **No requiere subir Word aparte** para plantilla
- ✓ **Configuración visual** más fácil
- ✓ **Validación automática** antes de guardar
- ✓ **Feedback detallado** de campos faltantes

---

## 🏗️ ARQUITECTURA IMPLEMENTADA

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ADMIN CONFIGURA ESTRUCTURA EN EDITOR                     │
│    /dashboard/admin/editor-syllabus                          │
│    ↓ Guarda en: syllabi.datos_syllabus (JSONB)              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ADMIN MARCA COMO PLANTILLA                               │
│    POST /api/syllabi/:id/marcar-plantilla                   │
│    ↓ Actualiza: es_plantilla_referencia = true              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. PROFESOR SUBE SYLLABUS                                   │
│    POST /api/syllabi/upload-validado                        │
│    ↓ Valida contra plantilla.datos_syllabus                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
         ┌─────────────────┴─────────────────┐
         │                                   │
    ✅ VÁLIDO                          ❌ INVÁLIDO
         │                                   │
    Guarda en DB                    Rechaza con detalles
    Status 201                       Status 400
```

---

## 📁 ARCHIVOS MODIFICADOS/CREADOS

### 1. Controlador Principal
- **Archivo**: `my-node-backend/src/controllers/syllabusController.js`
- **Función modificada**: `subirSyllabusConValidacion`
- **Cambios**:
  - Busca plantilla por periodo: `WHERE periodo = X AND es_plantilla_referencia = true`
  - Valida usando `validarSyllabusContraPlantilla(plantilla.datos_syllabus, filePath)`
  - Rechaza si `resultado.esValido === false`
  - Guarda resultado en `datos_syllabus.validacion`

### 2. Utilidad de Validación
- **Archivo**: `my-node-backend/src/utils/syllabusValidatorEditor.js`
- **Funciones principales**:
  - `extraerCamposRequeridos(datosSyllabus)` - Extrae campos con `isHeader: true`
  - `extraerTitulosWord(filePath)` - Extrae títulos en negrita del Word del profesor
  - `compararTitulos(camposRequeridos, titulosWord)` - Compara y calcula coincidencia
  - `validarSyllabusContraPlantilla(datosSyllabusPlantilla, archivoWordProfesor)` - Función principal

### 3. Rutas
- **Archivo**: `my-node-backend/src/routes/syllabus.routes.js`
- **Rutas disponibles**:
  ```javascript
  POST /api/syllabi/upload-validado           // Profesor sube con validación
  POST /api/syllabi/:id/marcar-plantilla      // Admin marca plantilla
  GET  /api/syllabi/plantilla/:periodo        // Obtener plantilla de periodo
  POST /api/syllabi/plantilla/upload          // Admin sube plantilla (legacy)
  ```

### 4. Modelo
- **Archivo**: `my-node-backend/src/models/syllabi.js`
- **Campos nuevos**:
  - `es_plantilla_referencia` (BOOLEAN, default: false)
  - `titulos_extraidos` (JSONB, nullable)

### 5. Migración
- **Archivo**: `my-node-backend/src/migrations/20260111000000-add-plantilla-referencia-to-syllabi.js`
- **Cambios en DB**:
  - Agrega columna `es_plantilla_referencia`
  - Agrega columna `titulos_extraidos`
  - Crea índice compuesto `idx_syllabi_plantilla_periodo`

---

## 🔄 FLUJO COMPLETO DE USO

### PASO 1: Admin Configura la Estructura

1. Admin accede a `/dashboard/admin/editor-syllabus`
2. Configura pestañas y campos con el editor visual
3. Marca campos importantes con `isHeader: true`
4. Guarda → Se almacena en `syllabi.datos_syllabus`

**Estructura de datos_syllabus**:
```javascript
{
  tabs: [
    {
      title: "DATOS GENERALES",
      rows: [
        {
          cells: [
            { content: "Código de Asignatura", isHeader: true },
            { content: "ENF-101", isHeader: false }
          ]
        }
      ]
    }
  ]
}
```

### PASO 2: Admin Marca como Plantilla

**Opción A - Marcar syllabus existente**:
```bash
POST /api/syllabi/:id/marcar-plantilla
Content-Type: application/json
Authorization: Bearer <token_admin>

{
  "periodo": "2025-1"
}
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Syllabus marcado como plantilla de referencia exitosamente",
  "data": {
    "id": 123,
    "nombre": "Plantilla Syllabus 2025-1",
    "periodo": "2025-1",
    "es_plantilla_referencia": true
  }
}
```

### PASO 3: Profesor Sube Syllabus con Validación

**Request**:
```bash
POST /api/syllabi/upload-validado
Content-Type: multipart/form-data
Authorization: Bearer <token_profesor>

# Form data:
- file: syllabus.docx
- nombre: "Syllabus Enfermería Básica"
- periodo: "2025-1"
- materias: "Enfermería Básica"
```

**Respuesta exitosa (válido)**:
```json
{
  "success": true,
  "message": "✅ Syllabus validado y guardado exitosamente",
  "data": {
    "id": 456,
    "nombre": "Syllabus Enfermería Básica",
    "periodo": "2025-1",
    "validacion": {
      "porcentaje_coincidencia": 100,
      "total_requeridos": 23,
      "encontrados": 23
    }
  }
}
```

**Respuesta error (inválido)**:
```json
{
  "success": false,
  "message": "El syllabus no cumple con la estructura requerida según la plantilla del administrador",
  "detalles": {
    "porcentaje_coincidencia": 78,
    "total_requeridos": 23,
    "encontrados": 18,
    "faltantes": [
      "Código de Asignatura",
      "Prerrequisito",
      "Total horas por componente",
      "Evaluación de Recuperación",
      "DECANO/A"
    ],
    "extras": [
      "Campo Extra 1",
      "Campo Extra 2"
    ]
  }
}
```

### PASO 4: Verificar Plantilla de un Periodo

```bash
GET /api/syllabi/plantilla/2025-1
Authorization: Bearer <token>
```

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "nombre": "Plantilla Syllabus 2025-1",
    "periodo": "2025-1",
    "titulos_requeridos": [
      "DATOS GENERALES",
      "Código de Asignatura",
      "Nombre de la asignatura",
      "..."
    ],
    "total_titulos": 23,
    "creador": {
      "id": 1,
      "nombres": "Juan",
      "apellidos": "Pérez"
    }
  }
}
```

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### Tabla: syllabi

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BIGINT | Primary key |
| nombre | TEXT | Nombre del syllabus |
| periodo | TEXT | Periodo académico (ej: "2025-1") |
| materias | TEXT | Nombre de la materia |
| datos_syllabus | JSONB | **Estructura del editor** |
| usuario_id | BIGINT | FK a usuarios |
| es_plantilla_referencia | BOOLEAN | **Marca si es plantilla oficial** |
| titulos_extraidos | JSONB | **Títulos extraídos del Word** |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Fecha de actualización |
| deleted_at | TIMESTAMP | Soft delete |

### Índices

```sql
-- Búsqueda rápida de plantilla por periodo
CREATE INDEX idx_syllabi_plantilla_periodo 
ON syllabi (periodo, es_plantilla_referencia) 
WHERE es_plantilla_referencia = true;

-- Índices existentes
CREATE INDEX idx_syllabi_periodo ON syllabi (periodo);
CREATE INDEX idx_syllabi_usuario_id ON syllabi (usuario_id);
```

---

## 🚀 PASOS PARA EJECUTAR (ORDEN EXACTO)

### 1. Aplicar Migraciones en Base de Datos

```powershell
cd c:\distributivofinallllllllllllllllllllllllllllllllllllllllllll\unesum-final\my-node-backend

# Ejecutar migraciones pendientes
npx sequelize-cli db:migrate

# Verificar que se aplicaron
npx sequelize-cli db:migrate:status
```

**Verificación en Neon (SQL directo)**:
```sql
-- Verificar que existen las columnas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'syllabi'
AND column_name IN ('es_plantilla_referencia', 'titulos_extraidos');

-- Verificar el índice
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'syllabi'
AND indexname = 'idx_syllabi_plantilla_periodo';
```

### 2. Reiniciar el Backend

```powershell
# Detener el proceso actual (Ctrl+C si está corriendo)

# Reiniciar en modo desarrollo
npm run dev

# O en modo producción
npm start
```

**Verificar logs del inicio**:
```
[nodemon] starting `node src/index.js`
🚀 Servidor corriendo en puerto 4000
✅ Conexión a la base de datos establecida
```

### 3. Re-login de Usuarios (Importante)

Si modificaste `usuarios.carrera_id` en la base de datos:

1. Todos los usuarios deben **cerrar sesión** y **volver a iniciar sesión**
2. Esto regenera el JWT con los datos actualizados
3. Sin esto, `req.user.carrera_id` seguirá siendo `null`

### 4. Crear Plantilla de Referencia

**Opción A - Desde el Frontend (Recomendado)**:
1. Login como administrador
2. Ir a `/dashboard/admin/editor-syllabus`
3. Configurar la estructura completa
4. Guardar el syllabus
5. Usar el endpoint para marcar como plantilla:

```javascript
// Desde la consola del navegador o Postman
fetch('http://localhost:4000/api/syllabi/123/marcar-plantilla', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ periodo: '2025-1' })
})
```

**Opción B - Directamente en DB (Solo testing)**:
```sql
-- Ver syllabi existentes del admin
SELECT id, nombre, periodo, es_plantilla_referencia
FROM syllabi
WHERE usuario_id = (SELECT id FROM usuarios WHERE rol = 'administrador')
ORDER BY created_at DESC
LIMIT 5;

-- Marcar uno como plantilla
UPDATE syllabi
SET es_plantilla_referencia = true
WHERE id = 123 AND periodo = '2025-1';

-- Desmarcar cualquier otra plantilla del mismo periodo
UPDATE syllabi
SET es_plantilla_referencia = false
WHERE periodo = '2025-1' AND id != 123;
```

### 5. Probar la Validación

**Test con Postman/Insomnia**:

```
POST http://localhost:4000/api/syllabi/upload-validado

Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: multipart/form-data

Body (form-data):
  file: [archivo syllabus.docx]
  nombre: "Syllabus Prueba"
  periodo: "2025-1"
  materias: "Enfermería Básica"
```

**Test desde el Frontend**:
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('nombre', 'Syllabus Prueba');
formData.append('periodo', '2025-1');
formData.append('materias', 'Enfermería Básica');

const response = await fetch('http://localhost:4000/api/syllabi/upload-validado', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log('Resultado validación:', result);
```

---

## 🔍 LOGS Y DEBUGGING

### Logs en el Backend (Console)

Cuando un profesor sube un syllabus, verás:

```
📤 Usuario María García subiendo syllabus para periodo: 2025-1
📋 Plantilla encontrada: Plantilla Syllabus 2025-1 (ID: 123) - validando contra configuración del editor

📋 Extrayendo campos requeridos de configuración del editor
  📑 Tab 1: "DATOS GENERALES"
    ✓ Campo: "Código de Asignatura"
    ✓ Campo: "Nombre de la asignatura"
    ✓ Campo: "Prerrequisito"
✅ Total de campos requeridos: 23

📄 Extrayendo títulos de documento del profesor: uploads/1736639472391-syllabus.docx
    ✓ Título: "DATOS GENERALES"
    ✓ Título: "Código de Asignatura"
    ...
✅ Total títulos extraídos del Word: 25

🔍 Comparando títulos...
   Campos requeridos: 23
   Títulos en Word: 25
   ✓ Encontrado: "Código de Asignatura"
   ✓ Encontrado: "Nombre de la asignatura"
   ❌ Falta: "Evaluación de Recuperación"
   ...

📊 Resultado:
   Coincidencia: 91%
   Faltantes: 2
   Extras: 4
   ✅ VÁLIDO

✅ Syllabus validado y guardado: ID 456
```

### Errores Comunes y Soluciones

#### ❌ "No existe una plantilla de referencia para el periodo 2025-1"

**Causa**: No hay ningún syllabus marcado como plantilla para ese periodo.

**Solución**:
```sql
-- Verificar plantillas
SELECT id, nombre, periodo, es_plantilla_referencia
FROM syllabi
WHERE es_plantilla_referencia = true;

-- Si no hay ninguna, marcar una
UPDATE syllabi
SET es_plantilla_referencia = true
WHERE id = 123 AND periodo = '2025-1';
```

#### ❌ "La plantilla de referencia no contiene la configuración del editor"

**Causa**: El campo `datos_syllabus` está vacío o es `{}`.

**Solución**:
- El admin debe crear el syllabus usando el editor visual
- No basta con subir un Word, debe configurarse en `/dashboard/admin/editor-syllabus`

#### ❌ "No se pudieron extraer títulos del documento"

**Causa**: El Word del profesor no tiene títulos en negrita o la estructura no es legible.

**Solución**:
- Verificar que el Word tenga títulos en **negrita** (`<strong>` o `<b>`)
- Verificar que el archivo sea `.docx` válido
- Revisar logs de mammoth para errores de parsing

#### ❌ "req.user.carrera_id es null"

**Causa**: El token JWT no contiene `carrera_id` actualizado.

**Solución**:
1. El usuario debe cerrar sesión
2. Volver a iniciar sesión (regenera token con datos frescos)
3. O modificar el middleware de auth para recargar usuario desde DB

---

## 📊 MÉTRICAS Y MONITOREO

### Queries Útiles para Admin

```sql
-- Ver todas las plantillas activas
SELECT id, nombre, periodo, usuario_id, created_at
FROM syllabi
WHERE es_plantilla_referencia = true
ORDER BY periodo DESC;

-- Contar syllabi validados por periodo
SELECT periodo, COUNT(*) as total_syllabi
FROM syllabi
WHERE es_plantilla_referencia = false
  AND datos_syllabus->>'tipo' = 'syllabus_validado'
GROUP BY periodo
ORDER BY periodo DESC;

-- Ver tasa de aprobación (syllabi que pasaron validación)
SELECT 
  periodo,
  COUNT(*) as total_intentos,
  SUM(CASE WHEN (datos_syllabus->'validacion'->>'esValido')::boolean = true THEN 1 ELSE 0 END) as aprobados,
  ROUND(
    SUM(CASE WHEN (datos_syllabus->'validacion'->>'esValido')::boolean = true THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100,
    2
  ) as porcentaje_aprobacion
FROM syllabi
WHERE datos_syllabus->>'tipo' = 'syllabus_validado'
GROUP BY periodo;

-- Ver campos más faltantes
SELECT 
  jsonb_array_elements_text(datos_syllabus->'validacion'->'faltantes') as campo_faltante,
  COUNT(*) as veces_faltante
FROM syllabi
WHERE datos_syllabus->'validacion'->'faltantes' IS NOT NULL
GROUP BY campo_faltante
ORDER BY veces_faltante DESC
LIMIT 10;
```

---

## 🎓 PRÓXIMOS PASOS RECOMENDADOS

### 1. Interfaz Frontend para Profesores
- Mostrar **preview de campos requeridos** antes de subir
- Mostrar **progreso en tiempo real** durante validación
- Mostrar **feedback visual** de campos faltantes con highlight

### 2. Sistema de Notificaciones
- Notificar al profesor si su syllabus fue rechazado
- Enviar email con lista de campos faltantes
- Notificar al admin cuando hay muchos rechazos (indica problema con plantilla)

### 3. Historial de Validaciones
- Guardar intentos fallidos para análisis
- Dashboard con estadísticas de validación
- Reportes de calidad de syllabi por carrera/facultad

### 4. Versionado de Plantillas
- Permitir múltiples versiones de plantilla por periodo
- Sistema de aprobación de cambios en plantilla
- Historial de cambios en estructura

### 5. Exportación y Reportes
- Exportar todos los syllabi validados a PDF
- Generar reporte consolidado por facultad
- Comparativa entre periodos

---

## 📞 SOPORTE Y CONTACTO

### Para Desarrolladores
- Revisa logs en `my-node-backend/logs/` (si están configurados)
- Usa `console.log` en `syllabusController.js` para debugging
- Verifica queries en Neon con el Query Editor

### Para Administradores
- Verificar plantilla configurada: `/api/syllabi/plantilla/:periodo`
- Revisar syllabi rechazados en DB con query de métricas
- Contactar soporte técnico si validación falla constantemente

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Modelo `syllabi` actualizado con nuevos campos
- [x] Migración creada para agregar columnas
- [x] Utilidad `syllabusValidatorEditor.js` implementada
- [x] Controlador `syllabusController.js` actualizado
- [x] Rutas configuradas en `syllabus.routes.js`
- [x] Documentación completa creada
- [ ] Migraciones ejecutadas en Neon
- [ ] Backend reiniciado
- [ ] Usuarios re-logueados
- [ ] Plantilla de referencia creada
- [ ] Validación probada con syllabus real
- [ ] Frontend actualizado (si es necesario)

---

## 🔐 SEGURIDAD Y PERMISOS

### Roles y Acciones Permitidas

| Acción | Administrador | Profesor | Comisión | Comisión Académica |
|--------|---------------|----------|----------|-------------------|
| Configurar editor | ✅ | ❌ | ❌ | ❌ |
| Marcar plantilla | ✅ | ❌ | ❌ | ❌ |
| Ver plantilla | ✅ | ✅ | ✅ | ✅ |
| Subir con validación | ✅ | ✅ | ✅ | ✅ |
| Ver todos los syllabi | ✅ | ❌ | ❌ | ❌ |
| Ver mis syllabi | ✅ | ✅ | ✅ | ✅ |

---

**Documento generado**: 11 de Enero de 2026  
**Versión**: 1.0  
**Estado**: ✅ Implementación completada, pendiente de testing
