# 📮 EJEMPLOS DE REQUESTS - Sistema de Validación de Títulos

## 🔐 Autenticación

Todas las requests requieren token JWT en el header:
```
Authorization: Bearer <tu_token_aqui>
```

---

## 1️⃣ ADMIN SUBE PLANTILLA DE REFERENCIA

### Request

```http
POST http://localhost:4000/api/syllabi/plantilla/upload
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data

Body (form-data):
- file: [Seleccionar archivo .docx]
- nombre: Plantilla Syllabus 2025-1
- periodo: 2025-1
```

### Response Exitosa (201)

```json
{
  "success": true,
  "message": "Plantilla de referencia creada exitosamente",
  "data": {
    "id": 15,
    "nombre": "Plantilla Syllabus 2025-1",
    "periodo": "2025-1",
    "es_plantilla_referencia": true,
    "total_titulos": 14,
    "titulos_requeridos": [
      "DATOS GENERALES",
      "CÓDIGO DE ASIGNATURA",
      "NOMBRE DE LA ASIGNATURA",
      "PREREQUISITO",
      "CORREQUISITO",
      "FACULTAD",
      "CARRERA",
      "UNIDAD CURRICULAR EJE DE FORMACION",
      "CAMPO DE FORMACION",
      "MODALIDAD",
      "PERIODO ACADEMICO ORDINARIO PAO",
      "NIVEL",
      "PARALELOS",
      "HORARIO DE CLASES"
    ]
  }
}
```

### Response con Error (400)

```json
{
  "success": false,
  "message": "No se pudieron extraer títulos del documento. Asegúrese de que los títulos importantes estén en negrita."
}
```

---

## 2️⃣ MARCAR SYLLABUS EXISTENTE COMO PLANTILLA

### Request

```http
POST http://localhost:4000/api/syllabi/25/marcar-plantilla
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

Body:
{
  "periodo": "2025-1"
}
```

### Response Exitosa (200)

```json
{
  "success": true,
  "message": "Syllabus marcado como plantilla de referencia exitosamente",
  "data": {
    "id": 25,
    "nombre": "Syllabus Base Facultad",
    "periodo": "2025-1",
    "es_plantilla_referencia": true,
    "titulos_extraidos": [
      "DATOS GENERALES",
      "CODIGO DE ASIGNATURA",
      "NOMBRE DE LA ASIGNATURA"
    ]
  }
}
```

---

## 3️⃣ CONSULTAR PLANTILLA DE UN PERIODO

### Request

```http
GET http://localhost:4000/api/syllabi/plantilla/2025-1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response Exitosa (200)

```json
{
  "success": true,
  "data": {
    "id": 15,
    "nombre": "Plantilla Syllabus 2025-1",
    "periodo": "2025-1",
    "titulos_requeridos": [
      "DATOS GENERALES",
      "CÓDIGO DE ASIGNATURA",
      "NOMBRE DE LA ASIGNATURA",
      "PREREQUISITO",
      "CORREQUISITO",
      "FACULTAD",
      "CARRERA",
      "UNIDAD CURRICULAR EJE DE FORMACION",
      "CAMPO DE FORMACION",
      "MODALIDAD",
      "PERIODO ACADEMICO ORDINARIO PAO",
      "NIVEL",
      "PARALELOS",
      "HORARIO DE CLASES"
    ],
    "total_titulos": 14,
    "creador": {
      "id": 1,
      "nombres": "Admin",
      "apellidos": "Sistema"
    }
  }
}
```

### Response sin Plantilla (404)

```json
{
  "success": false,
  "message": "No existe plantilla de referencia para el periodo 2025-2"
}
```

---

## 4️⃣ PROFESOR SUBE SYLLABUS CON VALIDACIÓN

### Request

```http
POST http://localhost:4000/api/syllabi/upload-validado
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data

Body (form-data):
- file: [Seleccionar archivo .docx]
- nombre: Syllabus Programación 1
- periodo: 2025-1
- materias: Programación 1
```

### Response Exitosa - Validación Pasada (201)

```json
{
  "success": true,
  "message": "✅ Syllabus validado y guardado exitosamente",
  "data": {
    "id": 45,
    "nombre": "Syllabus Programación 1",
    "periodo": "2025-1",
    "validacion": {
      "porcentaje_coincidencia": 100,
      "titulos_requeridos": 14,
      "titulos_encontrados": 14,
      "titulos_correctos": 14
    }
  }
}
```

### Response con Validación Fallida (400)

```json
{
  "success": false,
  "message": "El syllabus no cumple con la estructura requerida",
  "error": "❌ El syllabus no cumple con la estructura requerida.\n\n📊 Coincidencia: 71.4%\n📋 Títulos requeridos: 14\n✅ Títulos encontrados: 10\n❌ Títulos faltantes: 4\n\n⚠️ Títulos que faltan en su documento:\n   1. PREREQUISITO\n   2. CORREQUISITO\n   3. HORARIO DE CLASES\n   4. HORARIO PARA TUTORÍAS\n\n💡 Por favor, asegúrese de incluir todos los títulos requeridos en su documento.",
  "detalles": {
    "porcentaje_coincidencia": 71.4,
    "titulos_requeridos": 14,
    "titulos_encontrados": 10,
    "titulos_faltantes": [
      "PREREQUISITO",
      "CORREQUISITO",
      "HORARIO DE CLASES",
      "HORARIO PARA TUTORÍAS"
    ]
  }
}
```

### Response sin Plantilla para el Periodo (400)

```json
{
  "success": false,
  "message": "No existe una plantilla de referencia para el periodo 2025-2. Contacte al administrador."
}
```

---

## 🧪 COLECCIÓN POSTMAN

### Configuración de Environment

Crear un environment con estas variables:

```json
{
  "API_URL": "http://localhost:4000/api",
  "TOKEN_ADMIN": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "TOKEN_PROFESOR": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "PERIODO_ACTUAL": "2025-1"
}
```

### Collection: Validación de Títulos en Syllabus

```json
{
  "info": {
    "name": "Validación Títulos Syllabus",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Admin - Subir Plantilla",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{TOKEN_ADMIN}}"
          }
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "file",
              "type": "file",
              "src": "plantilla.docx"
            },
            {
              "key": "nombre",
              "value": "Plantilla Syllabus {{PERIODO_ACTUAL}}",
              "type": "text"
            },
            {
              "key": "periodo",
              "value": "{{PERIODO_ACTUAL}}",
              "type": "text"
            }
          ]
        },
        "url": {
          "raw": "{{API_URL}}/syllabi/plantilla/upload",
          "host": ["{{API_URL}}"],
          "path": ["syllabi", "plantilla", "upload"]
        }
      }
    },
    {
      "name": "2. Consultar Plantilla Periodo",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{TOKEN_ADMIN}}"
          }
        ],
        "url": {
          "raw": "{{API_URL}}/syllabi/plantilla/{{PERIODO_ACTUAL}}",
          "host": ["{{API_URL}}"],
          "path": ["syllabi", "plantilla", "{{PERIODO_ACTUAL}}"]
        }
      }
    },
    {
      "name": "3. Profesor - Subir Syllabus Validado",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{TOKEN_PROFESOR}}"
          }
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "file",
              "type": "file",
              "src": "mi_syllabus.docx"
            },
            {
              "key": "nombre",
              "value": "Syllabus Programación 1",
              "type": "text"
            },
            {
              "key": "periodo",
              "value": "{{PERIODO_ACTUAL}}",
              "type": "text"
            },
            {
              "key": "materias",
              "value": "Programación 1",
              "type": "text"
            }
          ]
        },
        "url": {
          "raw": "{{API_URL}}/syllabi/upload-validado",
          "host": ["{{API_URL}}"],
          "path": ["syllabi", "upload-validado"]
        }
      }
    },
    {
      "name": "4. Admin - Marcar Syllabus Como Plantilla",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{TOKEN_ADMIN}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"periodo\": \"{{PERIODO_ACTUAL}}\"\n}"
        },
        "url": {
          "raw": "{{API_URL}}/syllabi/25/marcar-plantilla",
          "host": ["{{API_URL}}"],
          "path": ["syllabi", "25", "marcar-plantilla"]
        }
      }
    }
  ]
}
```

---

## 🧪 Tests en Postman

### Test 1: Verificar que plantilla se creó correctamente

```javascript
pm.test("Plantilla creada exitosamente", function () {
    pm.response.to.have.status(201);
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data.es_plantilla_referencia).to.be.true;
    pm.expect(jsonData.data.total_titulos).to.be.above(0);
});
```

### Test 2: Verificar que validación rechaza syllabus inválido

```javascript
pm.test("Syllabus inválido rechazado", function () {
    pm.response.to.have.status(400);
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.false;
    pm.expect(jsonData.detalles.titulos_faltantes).to.be.an('array');
});
```

### Test 3: Verificar que validación acepta syllabus válido

```javascript
pm.test("Syllabus válido aceptado", function () {
    pm.response.to.have.status(201);
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data.validacion.porcentaje_coincidencia).to.equal(100);
});
```

---

## 📝 Notas Importantes

### Headers Requeridos
- `Authorization: Bearer <token>` - Siempre requerido
- `Content-Type: multipart/form-data` - Para upload de archivos (automático en Postman)

### Formatos de Archivo
- Solo se aceptan archivos `.docx` (Word)
- El archivo debe tener títulos en **negrita** para ser detectados

### Roles Permitidos
- `/plantilla/upload` → Solo **admin**
- `/:id/marcar-plantilla` → Solo **admin**
- `/plantilla/:periodo` → **Todos** los roles autenticados
- `/upload-validado` → **profesor**, **comision**, **comision_academica**

---

## 🔍 Debugging

### Ver logs del backend

Los logs mostrarán:
```
📤 Admin subiendo plantilla de referencia para periodo: 2025-1
📋 Títulos extraídos de la plantilla: 14
Títulos: [ 'DATOS GENERALES', 'CÓDIGO DE ASIGNATURA', ... ]
✅ Plantilla de referencia creada: ID 15, Periodo: 2025-1, Títulos: 14
```

```
📤 Usuario Juan Pérez subiendo syllabus para periodo: 2025-1
📋 Plantilla encontrada: Plantilla Syllabus 2025-1, Títulos requeridos: 14
📋 Títulos extraídos del syllabus del profesor: 10
📊 Comparación: 71.4% coincidencia
   ✅ Encontrados: 10/14
   ❌ Faltantes: 4
```

---

## 🎯 Casos de Prueba Recomendados

1. **Admin sube plantilla válida** → Debe guardar y extraer títulos
2. **Admin sube plantilla sin títulos en negrita** → Debe rechazar
3. **Profesor sube syllabus sin plantilla en periodo** → Debe rechazar
4. **Profesor sube syllabus válido (100%)** → Debe aceptar
5. **Profesor sube syllabus inválido (80%)** → Debe rechazar con detalles
6. **Consultar plantilla de periodo inexistente** → Debe retornar 404

---

**Fecha:** 11 de enero de 2026  
**Versión:** 1.0
