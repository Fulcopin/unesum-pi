# 🎯 SISTEMA DE VALIDACIÓN DE SYLLABUS - GUÍA COMPLETA
## Para Comisión Académica

---

## 📋 RESUMEN EJECUTIVO

El sistema permite que la **Comisión Académica** suba documentos Word de syllabus y los **valida automáticamente** contra una plantilla de referencia configurada por el administrador. Solo se aceptan documentos que contengan TODOS los títulos requeridos.

---

## 🔄 FLUJO COMPLETO

```
┌─────────────────────────────────────────────────────────────────┐
│  1️⃣  ADMINISTRADOR CREA PLANTILLA                                │
│      - Va a /dashboard/admin/editor-syllabus                    │
│      - Crea estructura completa en editor visual                │
│      - Marca campos importantes con "Es encabezado"             │
│      - Guarda el syllabus                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  2️⃣  ADMINISTRADOR MARCA COMO PLANTILLA                          │
│      - Ejecuta SQL: UPDATE syllabi SET es_plantilla...          │
│      - O usa endpoint POST /api/syllabi/:id/marcar-plantilla    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  3️⃣  COMISIÓN ACADÉMICA SUBE WORD                                │
│      - Va a /dashboard/admin/editor-syllabus                    │
│      - Selecciona periodo: "Primer Periodo PII 2026"            │
│      - Click en "Subir Nuevo Word (.docx)"                      │
│      - Selecciona archivo Word                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  4️⃣  SISTEMA VALIDA AUTOMÁTICAMENTE                             │
│      ✓ Busca plantilla del periodo                              │
│      ✓ Extrae campos con isHeader=true de la plantilla          │
│      ✓ Extrae títulos en negrita del Word subido                │
│      ✓ Compara ambos                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  5️⃣  RESULTADO                                                   │
│                                                                 │
│      ✅ SI COINCIDEN 100%:                                       │
│         - Guarda el syllabus en la base de datos                │
│         - Carga el syllabus en el editor                        │
│         - Muestra: "Validación exitosa: 100% coincidencia"      │
│                                                                 │
│      ❌ SI NO COINCIDEN:                                         │
│         - NO guarda nada                                        │
│         - Muestra lista de títulos faltantes                    │
│         - Muestra lista de títulos extra (si hay)               │
│         - Muestra porcentaje de coincidencia                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 CONFIGURACIÓN INICIAL (Solo una vez)

### Paso 1: Crear Plantilla en Editor Visual

1. **Iniciar sesión como Administrador**
2. **Ir a:** `http://localhost:3000/dashboard/admin/editor-syllabus`
3. **Click en:** "➕ Nuevo"
4. **Configurar metadata:**
   - Nombre: "Plantilla Oficial Primer Periodo 2026"
   - Periodo: "Primer Periodo PII 2026" ⚠️ **IMPORTANTE: Debe ser exacto**
   - Materias: "Todas"

5. **Crear estructura con pestañas:**
   - Pestaña 1: "DATOS GENERALES Y ESPECÍFICOS DE LA ASIGNATURA"
   - Pestaña 2: "ESTRUCTURA DE LA ASIGNATURA"
   - Pestaña 3: "RESULTADOS Y EVALUACIÓN DE LOS APRENDIZAJES"
   - Pestaña 4: "VISADO"

6. **Agregar filas y celdas en cada pestaña**

7. **CRUCIAL: Marcar campos como "Es encabezado"**
   - Haz click en cada celda que contenga un título
   - Activa el checkbox "Es encabezado" ✓
   - Ejemplos de títulos a marcar:
     * "Código de Asignatura"
     * "Nombre de la asignatura"
     * "Prerrequisito"
     * "Correquisito"
     * "Facultad"
     * "Carrera"
     * etc.

8. **Guardar** el syllabus

### Paso 2: Marcar como Plantilla de Referencia

**Opción A: Usando SQL (Recomendado)**

```sql
-- 1. Ver el syllabus que acabas de crear
SELECT id, nombre, periodo, "createdAt"
FROM syllabi
ORDER BY "createdAt" DESC
LIMIT 5;

-- 2. Anotar el ID (ejemplo: 5)

-- 3. Marcar como plantilla
UPDATE syllabi 
SET es_plantilla_referencia = true 
WHERE id = 5;  -- ⚠️ Reemplazar con tu ID

-- 4. Verificar
SELECT id, nombre, periodo, es_plantilla_referencia
FROM syllabi
WHERE es_plantilla_referencia = true;
```

**Opción B: Usando API (Postman/Thunder Client)**

```http
POST http://localhost:4000/api/syllabi/5/marcar-plantilla
Authorization: Bearer TU_TOKEN_ADMIN
Content-Type: application/json

{
  "periodo": "Primer Periodo PII 2026"
}
```

### Paso 3: Verificar Configuración

```sql
-- Ver campos que se validarán
SELECT 
  cell->>'content' as titulo_requerido
FROM syllabi,
     jsonb_array_elements(datos_syllabus->'tabs') as tab,
     jsonb_array_elements(tab->'rows') as row,
     jsonb_array_elements(row->'cells') as cell
WHERE es_plantilla_referencia = true
  AND periodo = 'Primer Periodo PII 2026'
  AND (cell->>'isHeader')::boolean = true
  AND length(cell->>'content') > 2;
```

Deberías ver algo como:
```
Código de Asignatura
:
Nombre de la asignatura
:
Prerrequisito
:
...
```

---

## 📤 USO DIARIO (Comisión Académica)

### Subir y Validar Documento

1. **Iniciar sesión como Comisión Académica**
2. **Ir a:** `http://localhost:3000/dashboard/admin/editor-syllabus`
3. **Seleccionar Periodo Académico:** "Primer Periodo PII 2026"
4. **Click en:** "Subir Nuevo Word (.docx)"
5. **Seleccionar** el archivo Word del profesor
6. **Esperar** la validación automática

### Resultados Posibles

#### ✅ Validación Exitosa

```
✅ Validación exitosa

El syllabus cumple con la estructura requerida
📊 Coincidencia: 100%

El documento ha sido guardado y cargado en el editor.
```

**El sistema:**
- Guarda el syllabus en la base de datos
- Lo carga automáticamente en el editor para que puedas verlo
- Actualiza la lista de syllabi guardados

#### ❌ Validación Fallida

```
❌ El syllabus NO cumple con la estructura requerida

📊 Coincidencia: 75%

❌ Títulos faltantes (10):
• Código de Asignatura
• Nombre de la asignatura
• Prerrequisito
• Unidades temáticas
• ...

⚠️ Títulos extra (2):
• Campo Nuevo 1
• Campo Nuevo 2
```

**El sistema:**
- NO guarda nada
- Muestra exactamente qué títulos faltan
- El profesor debe corregir su Word

---

## 📝 REQUISITOS DEL DOCUMENTO WORD

### Para que pase la validación, el Word del profesor DEBE:

1. **Tener TODOS los títulos en negrita**
   ```
   ✅ CORRECTO:
   Código de Asignatura: ENF-101
   ^^^^^^^^^^^^^^^^^^^ (en negrita)
   
   ❌ INCORRECTO:
   Código de Asignatura: ENF-101
   (sin negrita)
   ```

2. **Usar los nombres EXACTOS de los títulos**
   - El sistema normaliza (quita acentos, mayúsculas, dos puntos)
   - "Código de Asignatura" = "codigo de asignatura" ✅
   - "Código de Asignatura:" = "codigo de asignatura" ✅
   - "Código" ≠ "Código de Asignatura" ❌

3. **No omitir ningún título**
   - Si la plantilla tiene 50 títulos, el Word debe tener los 50
   - Incluso los dos puntos ":" deben estar

4. **Formato Word (.docx)**
   - No PDF, no DOC antiguo
   - Archivo .docx moderno

---

## 🔍 TROUBLESHOOTING

### Error: "No existe una plantilla de referencia para el periodo X"

**Causas:**
- No se marcó ningún syllabus como plantilla
- El nombre del periodo no coincide exactamente

**Solución:**
```sql
-- Verificar si existe
SELECT id, nombre, periodo, es_plantilla_referencia
FROM syllabi
WHERE periodo = 'Primer Periodo PII 2026';

-- Si existe pero no está marcada:
UPDATE syllabi 
SET es_plantilla_referencia = true 
WHERE id = TU_ID;
```

### Error: "La plantilla no contiene configuración del editor"

**Causa:** El syllabus se creó de forma incorrecta (no desde el editor visual)

**Solución:** Crear uno nuevo desde `/dashboard/admin/editor-syllabus`

### Error: "No se encontraron campos con isHeader=true"

**Causa:** No marcaste ningún campo como "Es encabezado"

**Solución:**
1. Cargar el syllabus en el editor
2. Hacer click en cada celda con título importante
3. Activar checkbox "Es encabezado" ✓
4. Guardar
5. Volver a marcar como plantilla

### El Word tiene los títulos pero no valida

**Posibles causas:**
1. Los títulos NO están en negrita
2. Los nombres son ligeramente diferentes
3. El archivo está corrupto

**Solución:**
1. Abrir el Word
2. Seleccionar cada título
3. Aplicar negrita (Ctrl+B)
4. Verificar nombres exactos con la query:
   ```sql
   SELECT cell->>'content'
   FROM syllabi,
        jsonb_array_elements(datos_syllabus->'tabs') as tab,
        jsonb_array_elements(tab->'rows') as row,
        jsonb_array_elements(row->'cells') as cell
   WHERE es_plantilla_referencia = true
     AND (cell->>'isHeader')::boolean = true;
   ```

---

## 💾 ESTRUCTURA DE DATOS

### Tabla `syllabi`

```sql
- id: BIGSERIAL PRIMARY KEY
- nombre: TEXT
- periodo: TEXT  -- "Primer Periodo PII 2026"
- materias: TEXT
- datos_syllabus: JSONB  -- Estructura del editor
- es_plantilla_referencia: BOOLEAN DEFAULT false
- usuario_id: BIGINT
- profesor_id: INTEGER
- titulos_extraidos: JSONB
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
- deletedAt: TIMESTAMP  -- Soft delete
```

### Campo `datos_syllabus` (JSONB)

```json
{
  "tabs": [
    {
      "id": "tab-0-xxx",
      "title": "DATOS GENERALES",
      "rows": [
        {
          "id": "row-0-0-xxx",
          "cells": [
            {
              "id": "cell-0-0-0-xxx",
              "content": "Código de Asignatura",
              "isHeader": true,     // ← ESTO MARCA EL CAMPO COMO REQUERIDO
              "isEditable": true,
              "rowSpan": 1,
              "colSpan": 1
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 🎯 ENDPOINTS RELACIONADOS

### 1. Subir con Validación (Comisión Académica)

```http
POST /api/syllabi/upload-validado
Authorization: Bearer TOKEN_COMISION
Content-Type: multipart/form-data

FormData:
- file: archivo.docx
- nombre: "Syllabus Enfermería"
- periodo: "Primer Periodo PII 2026"
- materias: "Enfermería Básica"
```

### 2. Marcar como Plantilla (Solo Admin)

```http
POST /api/syllabi/:id/marcar-plantilla
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json

{
  "periodo": "Primer Periodo PII 2026"
}
```

### 3. Obtener Plantilla del Periodo

```http
GET /api/syllabi/plantilla/:periodo
Authorization: Bearer TOKEN
```

---

## 📊 MONITOREO Y LOGS

El sistema genera logs detallados en la consola del backend:

```
📤 Usuario Comisión subiendo syllabus para periodo: Primer Periodo PII 2026
📋 Plantilla encontrada: Plantilla Oficial (ID: 5) - validando contra configuración del editor
📄 Extrayendo títulos de documento del profesor: /uploads/file-xxx.docx
📊 Resultado validación: 85% coincidencia - Válido: false
❌ Validación fallida - Faltantes: 8 campos
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] **Paso 1:** Crear syllabus en editor visual
- [ ] **Paso 2:** Marcar todos los campos importantes con "Es encabezado"
- [ ] **Paso 3:** Guardar el syllabus
- [ ] **Paso 4:** Ejecutar UPDATE para marcar como plantilla
- [ ] **Paso 5:** Verificar con SELECT que tiene títulos
- [ ] **Paso 6:** Probar subiendo un Word válido
- [ ] **Paso 7:** Probar subiendo un Word inválido (debe rechazar)
- [ ] **Paso 8:** Capacitar a Comisión Académica en el uso

---

## 📞 SOPORTE

Si encuentras problemas:

1. **Revisa logs del backend** (consola donde corre `npm run dev`)
2. **Revisa console del navegador** (F12 → Console)
3. **Ejecuta queries de verificación** (ver VERIFICAR_PLANTILLA.sql)
4. **Verifica que los nombres de periodo coincidan EXACTAMENTE**

---

**Última actualización:** 2026-01-11
**Versión del sistema:** 2.0
