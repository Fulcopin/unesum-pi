# 🧪 PRUEBAS - VALIDACIÓN DE SYLLABUS

## ✅ Estado Actual

- ✅ Backend corriendo en http://localhost:4000
- ✅ Frontend corriendo en http://localhost:3000
- ✅ Base de datos sincronizada
- ✅ Modelos actualizados
- ⚠️ Pendiente: Ejecutar migraciones específicas (las columnas ya existen en DB)

---

## 📋 PASOS PARA PROBAR LA IMPLEMENTACIÓN

### 1️⃣ Verificar que las Columnas Existen en la Base de Datos

Ejecuta este SQL en Neon para verificar:

```sql
-- Verificar columnas en syllabi
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'syllabi'
  AND column_name IN ('es_plantilla_referencia', 'titulos_extraidos')
ORDER BY column_name;

-- Debe mostrar:
-- es_plantilla_referencia | boolean | NO | false
-- titulos_extraidos       | jsonb   | YES | NULL
```

### 2️⃣ Marcar el Estado de la Migración (Si las columnas ya existen)

Si las columnas ya están en la base de datos pero la migración aparece como "down", puedes marcar manualmente el estado:

```sql
-- Verificar migraciones ejecutadas
SELECT * FROM "SequelizeMeta" ORDER BY name DESC;

-- Si no existe el registro de la migración, insertarlo
INSERT INTO "SequelizeMeta" (name)
VALUES ('20260111000000-add-plantilla-referencia-to-syllabi.js')
ON CONFLICT DO NOTHING;
```

### 3️⃣ Crear una Plantilla de Referencia (Como Admin)

**Opción A: Desde el Editor del Admin (Recomendado)**

1. Login como admin en http://localhost:3000
2. Ir a `/dashboard/admin/editor-syllabus`
3. Configurar la estructura completa del syllabus
4. Guardar el syllabus (esto crea un registro en `syllabi` con `datos_syllabus`)
5. Obtener el ID del syllabus creado
6. Marcarlo como plantilla usando la API:

```bash
# Usando PowerShell o CMD
$token = "TU_TOKEN_DE_ADMIN"
$syllabusId = 123  # ID del syllabus que acabas de crear

Invoke-RestMethod -Uri "http://localhost:4000/api/syllabi/$syllabusId/marcar-plantilla" `
  -Method POST `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body (@{periodo = "2025-1"} | ConvertTo-Json)
```

**Opción B: Directamente en la Base de Datos (Solo para testing)**

```sql
-- Ver syllabi existentes
SELECT id, nombre, periodo, es_plantilla_referencia, 
       (datos_syllabus IS NOT NULL) as tiene_datos
FROM syllabi
WHERE usuario_id IN (SELECT id FROM usuarios WHERE rol = 'administrador')
ORDER BY created_at DESC
LIMIT 10;

-- Marcar uno como plantilla (reemplaza 123 con el ID correcto)
UPDATE syllabi
SET es_plantilla_referencia = true
WHERE id = 123 AND periodo = '2025-1';

-- Verificar
SELECT id, nombre, periodo, es_plantilla_referencia
FROM syllabi
WHERE es_plantilla_referencia = true;
```

### 4️⃣ Verificar la Plantilla con la API

```bash
# PowerShell
$token = "TU_TOKEN"
Invoke-RestMethod -Uri "http://localhost:4000/api/syllabi/plantilla/2025-1" `
  -Headers @{Authorization = "Bearer $token"}
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "nombre": "Plantilla Syllabus 2025-1",
    "periodo": "2025-1",
    "titulos_requeridos": [...],
    "total_titulos": 23,
    "creador": {...}
  }
}
```

### 5️⃣ Probar Subida de Syllabus con Validación (Como Profesor)

**Test con Postman/Insomnia:**

```
POST http://localhost:4000/api/syllabi/upload-validado

Headers:
  Authorization: Bearer <token_profesor>

Body (form-data):
  file: [seleccionar archivo syllabus.docx]
  nombre: "Syllabus Enfermería Básica"
  periodo: "2025-1"
  materias: "Enfermería Básica"
```

**Test con PowerShell:**

```powershell
$token = "TOKEN_DEL_PROFESOR"
$filepath = "C:\ruta\a\syllabus.docx"

$headers = @{
    "Authorization" = "Bearer $token"
}

$form = @{
    file = Get-Item -Path $filepath
    nombre = "Syllabus Prueba"
    periodo = "2025-1"
    materias = "Enfermería Básica"
}

Invoke-RestMethod -Uri "http://localhost:4000/api/syllabi/upload-validado" `
    -Method POST `
    -Headers $headers `
    -Form $form
```

### 6️⃣ Interpretar Resultados

**✅ Caso Exitoso (Syllabus válido):**

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

**❌ Caso Fallido (Syllabus inválido):**

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

---

## 🔍 DIAGNÓSTICO DE PROBLEMAS

### Problema 1: "No existe una plantilla de referencia para el periodo X"

**Causa:** No hay ningún syllabus marcado como plantilla para ese periodo.

**Solución:**
```sql
-- Verificar plantillas
SELECT id, nombre, periodo, es_plantilla_referencia
FROM syllabi
WHERE es_plantilla_referencia = true;

-- Si no hay ninguna para el periodo, marcar una
UPDATE syllabi
SET es_plantilla_referencia = true
WHERE id = <ID_DEL_SYLLABUS> AND periodo = '2025-1';
```

### Problema 2: "La plantilla de referencia no contiene la configuración del editor"

**Causa:** El campo `datos_syllabus` está vacío o es `{}`.

**Verificación:**
```sql
SELECT 
  id, 
  nombre, 
  periodo,
  datos_syllabus IS NOT NULL as tiene_datos,
  jsonb_typeof(datos_syllabus) as tipo_datos,
  datos_syllabus->'tabs' as tiene_tabs
FROM syllabi
WHERE es_plantilla_referencia = true;
```

**Solución:**
- El admin DEBE crear el syllabus usando el editor visual en `/dashboard/admin/editor-syllabus`
- No puedes simplemente subir un Word y marcarlo como plantilla
- El editor debe guardar la estructura en `datos_syllabus` con el formato:
  ```json
  {
    "tabs": [
      {
        "title": "DATOS GENERALES",
        "rows": [
          {
            "cells": [
              {"content": "Campo", "isHeader": true},
              {"content": "Valor", "isHeader": false}
            ]
          }
        ]
      }
    ]
  }
  ```

### Problema 3: Error al extraer títulos del Word del profesor

**Causa:** El documento Word no tiene títulos en negrita o mammoth no puede leerlo.

**Verificación:**
- Revisar logs del backend: busca mensajes como "📄 Extrayendo títulos de documento del profesor"
- Verificar que el Word tenga títulos en **negrita** (usando `<strong>` o `<b>`)

**Solución:**
- Asegúrate de que el Word sea `.docx` (no `.doc`)
- Los títulos importantes deben estar en negrita
- Verifica que el archivo no esté corrupto

### Problema 4: El backend no inicia o da error de módulos

**Solución:**
```powershell
cd c:\distributivofinallllllllllllllllllllllllllllllllllllllllllll\unesum-final\my-node-backend

# Reinstalar dependencias
npm install

# Verificar que mammoth esté instalado
npm list mammoth

# Si no está, instalarlo
npm install mammoth

# Reiniciar
npm run dev
```

---

## 📊 VERIFICACIONES EN LA BASE DE DATOS

### Ver todas las plantillas activas

```sql
SELECT 
  id,
  nombre,
  periodo,
  es_plantilla_referencia,
  (datos_syllabus->'tabs') IS NOT NULL as tiene_estructura,
  jsonb_array_length(datos_syllabus->'tabs') as cantidad_tabs,
  created_at
FROM syllabi
WHERE es_plantilla_referencia = true
ORDER BY periodo DESC;
```

### Ver syllabi validados recientemente

```sql
SELECT 
  s.id,
  s.nombre,
  s.periodo,
  u.nombres || ' ' || u.apellidos as profesor,
  (s.datos_syllabus->'validacion'->>'esValido')::boolean as es_valido,
  (s.datos_syllabus->'validacion'->>'porcentaje')::integer as porcentaje,
  s.created_at
FROM syllabi s
JOIN usuarios u ON s.usuario_id = u.id
WHERE s.datos_syllabus->>'tipo' = 'syllabus_validado'
ORDER BY s.created_at DESC
LIMIT 20;
```

### Contar syllabi aprobados vs rechazados

```sql
SELECT 
  periodo,
  COUNT(*) FILTER (WHERE (datos_syllabus->'validacion'->>'esValido')::boolean = true) as aprobados,
  COUNT(*) FILTER (WHERE (datos_syllabus->'validacion'->>'esValido')::boolean = false) as rechazados,
  COUNT(*) as total
FROM syllabi
WHERE datos_syllabus->>'tipo' = 'syllabus_validado'
GROUP BY periodo
ORDER BY periodo DESC;
```

### Ver campos más faltantes

```sql
SELECT 
  jsonb_array_elements_text(datos_syllabus->'validacion'->'faltantes') as campo_faltante,
  COUNT(*) as veces_faltante
FROM syllabi
WHERE 
  datos_syllabus->'validacion'->'faltantes' IS NOT NULL
  AND jsonb_array_length(datos_syllabus->'validacion'->'faltantes') > 0
GROUP BY campo_faltante
ORDER BY veces_faltante DESC
LIMIT 15;
```

---

## 🎯 CHECKLIST DE PRUEBA COMPLETA

- [ ] 1. Backend corriendo en puerto 4000
- [ ] 2. Frontend corriendo en puerto 3000
- [ ] 3. Columnas `es_plantilla_referencia` y `titulos_extraidos` existen en DB
- [ ] 4. Admin puede crear syllabus en el editor visual
- [ ] 5. Admin puede marcar syllabus como plantilla
- [ ] 6. GET `/api/syllabi/plantilla/:periodo` retorna la plantilla correctamente
- [ ] 7. Profesor puede subir syllabus con validación
- [ ] 8. Sistema rechaza syllabus que no cumplen estructura
- [ ] 9. Sistema acepta syllabus que sí cumplen estructura
- [ ] 10. Datos de validación se guardan correctamente en `datos_syllabus.validacion`
- [ ] 11. Logs del backend muestran el proceso de validación claramente

---

## 📞 PRÓXIMOS PASOS

1. **Completar el checklist de prueba** anterior
2. **Probar con un Word real** que tenga la estructura completa
3. **Probar con un Word incompleto** para ver el rechazo
4. **Verificar los logs** del backend durante cada prueba
5. **Ajustar el umbral de validación** si es necesario (actualmente requiere 100% coincidencia)
6. **Implementar frontend** para mostrar feedback visual de validación

---

**Estado actual**: ✅ Implementación completa, backend activo, listo para pruebas

**Fecha**: 11 de Enero de 2026
