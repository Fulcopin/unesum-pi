# 📋 SISTEMA DE VALIDACIÓN DE TÍTULOS EN SYLLABUS

## 🎯 Objetivo
Garantizar que todos los syllabus subidos por profesores/comisión tengan la **misma estructura** (títulos en negrita) que el syllabus de referencia subido por el **administrador** para cada periodo académico.

---

## 🔄 Flujo del Sistema

### PASO 1: Admin Sube Plantilla de Referencia

1. **Admin** sube un documento Word que será la **plantilla de referencia** para el periodo
2. El sistema **extrae automáticamente** todos los títulos en negrita del documento
3. Estos títulos se guardan en la base de datos como los **títulos requeridos**
4. El syllabus se marca con `es_plantilla_referencia = true`

**Endpoint:** `POST /api/syllabi/plantilla/upload`

```javascript
// Ejemplo de request
FormData:
- file: syllabus_plantilla.docx
- nombre: "Plantilla Syllabus 2025-1"
- periodo: "2025-1"
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Plantilla de referencia creada exitosamente",
  "data": {
    "id": 123,
    "nombre": "Plantilla Syllabus 2025-1",
    "periodo": "2025-1",
    "es_plantilla_referencia": true,
    "total_titulos": 15,
    "titulos_requeridos": [
      "DATOS GENERALES",
      "CÓDIGO DE ASIGNATURA",
      "NOMBRE DE LA ASIGNATURA",
      "PREREQUISITO",
      "CORREQUISITO",
      "FACULTAD",
      "CARRERA",
      "UNIDAD CURRICULAR/EJE DE FORMACIÓN",
      "CAMPO DE FORMACIÓN",
      "MODALIDAD",
      "PERIODO ACADÉMICO ORDINARIO (PAO)",
      "NIVEL",
      "PARALELO/S",
      "HORARIO DE CLASES",
      "HORARIO PARA TUTORÍAS"
    ]
  }
}
```

---

### PASO 2: Profesor/Comisión Sube Syllabus con Validación

1. **Profesor/Comisión** sube su documento Word de syllabus
2. El sistema **extrae los títulos en negrita** del documento subido
3. El sistema **busca la plantilla de referencia** del mismo periodo
4. **Compara** los títulos extraídos con los títulos requeridos
5. Si **todos los títulos requeridos están presentes** → ✅ Se guarda
6. Si **faltan títulos** → ❌ Se rechaza con mensaje de error detallado

**Endpoint:** `POST /api/syllabi/upload-validado`

```javascript
// Ejemplo de request
FormData:
- file: mi_syllabus.docx
- nombre: "Syllabus Programación 1"
- periodo: "2025-1"
- materias: "Programación 1"
```

**Respuesta Exitosa (✅):**
```json
{
  "success": true,
  "message": "✅ Syllabus validado y guardado exitosamente",
  "data": {
    "id": 456,
    "nombre": "Syllabus Programación 1",
    "periodo": "2025-1",
    "validacion": {
      "porcentaje_coincidencia": 100,
      "titulos_requeridos": 15,
      "titulos_encontrados": 15,
      "titulos_correctos": 15
    }
  }
}
```

**Respuesta con Error (❌):**
```json
{
  "success": false,
  "message": "El syllabus no cumple con la estructura requerida",
  "error": "❌ El syllabus no cumple con la estructura requerida.\n\n📊 Coincidencia: 80.0%\n📋 Títulos requeridos: 15\n✅ Títulos encontrados: 12\n❌ Títulos faltantes: 3\n\n⚠️ Títulos que faltan en su documento:\n   1. HORARIO DE CLASES\n   2. HORARIO PARA TUTORÍAS\n   3. EVALUACIÓN DE RECUPERACIÓN\n\n💡 Por favor, asegúrese de incluir todos los títulos requeridos en su documento.",
  "detalles": {
    "porcentaje_coincidencia": 80,
    "titulos_requeridos": 15,
    "titulos_encontrados": 12,
    "titulos_faltantes": [
      "HORARIO DE CLASES",
      "HORARIO PARA TUTORÍAS",
      "EVALUACIÓN DE RECUPERACIÓN"
    ]
  }
}
```

---

## 🗄️ Cambios en la Base de Datos

### Nuevos Campos en la Tabla `syllabi`

```sql
ALTER TABLE syllabi ADD COLUMN es_plantilla_referencia BOOLEAN DEFAULT false;
ALTER TABLE syllabi ADD COLUMN titulos_extraidos JSONB;
```

**Campos:**
- `es_plantilla_referencia`: Booleano que indica si este syllabus es la plantilla oficial del periodo
- `titulos_extraidos`: Array JSON con todos los títulos en negrita extraídos del documento

**Ejemplo de datos:**
```json
{
  "id": 123,
  "nombre": "Plantilla Syllabus 2025-1",
  "periodo": "2025-1",
  "es_plantilla_referencia": true,
  "titulos_extraidos": [
    "DATOS GENERALES",
    "CÓDIGO DE ASIGNATURA",
    "NOMBRE DE LA ASIGNATURA",
    ...
  ]
}
```

---

## 📁 Archivos Nuevos Creados

### 1. `my-node-backend/src/utils/syllabusValidator.js`
**Funciones principales:**
- `extraerTitulosNegrita(filePath)` - Extrae títulos en negrita de un Word
- `compararTitulos(requeridos, encontrados)` - Compara dos conjuntos de títulos
- `generarMensajeError(comparacion)` - Genera mensaje de error detallado
- `normalizarTitulo(titulo)` - Normaliza títulos para comparación (sin acentos, mayúsculas, etc.)

### 2. `my-node-backend/src/migrations/20260111000000-add-plantilla-referencia-to-syllabi.js`
Migración para agregar los nuevos campos a la tabla `syllabi`.

### 3. Actualizaciones en `syllabusController.js`
**Nuevas funciones:**
- `subirPlantillaAdmin()` - Admin sube plantilla con extracción de títulos
- `marcarComoPlantilla()` - Marcar syllabus existente como plantilla
- `subirSyllabusConValidacion()` - Profesor sube con validación automática
- `obtenerPlantillaPeriodo()` - Consultar títulos requeridos de un periodo

### 4. Actualizaciones en `syllabus.routes.js`
**Nuevas rutas:**
- `POST /api/syllabi/plantilla/upload` - Subir plantilla (admin)
- `POST /api/syllabi/:id/marcar-plantilla` - Marcar como plantilla (admin)
- `GET /api/syllabi/plantilla/:periodo` - Ver títulos requeridos
- `POST /api/syllabi/upload-validado` - Subir con validación (profesor/comisión)

---

## 🚀 Cómo Usar el Sistema

### Para el Administrador:

#### Opción 1: Subir Nueva Plantilla
```bash
# Desde Postman o frontend
POST /api/syllabi/plantilla/upload
Authorization: Bearer <token_admin>
Content-Type: multipart/form-data

Body:
- file: [archivo.docx]
- nombre: "Plantilla Syllabus 2025-1"
- periodo: "2025-1"
```

#### Opción 2: Marcar Syllabus Existente como Plantilla
```bash
POST /api/syllabi/123/marcar-plantilla
Authorization: Bearer <token_admin>

Body:
{
  "periodo": "2025-1"
}
```

---

### Para Profesores/Comisión:

#### 1. Consultar Títulos Requeridos (Opcional)
```bash
GET /api/syllabi/plantilla/2025-1
Authorization: Bearer <token>
```

#### 2. Subir Syllabus con Validación
```bash
POST /api/syllabi/upload-validado
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- file: [mi_syllabus.docx]
- nombre: "Syllabus Programación 1"
- periodo: "2025-1"
- materias: "Programación 1"
```

---

## 🔍 Cómo Funciona la Detección de Títulos

El sistema detecta títulos mediante:

1. **Texto en negrita:** `<strong>`, `<b>` en el HTML del Word
2. **Títulos con estilos:** Heading 1, Heading 2, Heading 3
3. **Texto en mayúsculas:** Más del 70% de letras mayúsculas

### Normalización de Títulos

Antes de comparar, los títulos se normalizan:
- Convertir a MAYÚSCULAS
- Remover acentos (Á → A, É → E, etc.)
- Remover puntuación (`:`, `-`, `.`)
- Normalizar espacios

**Ejemplo:**
```javascript
"Horario para Tutorías:" → "HORARIO PARA TUTORIAS"
"HORARIO  PARA   TUTORÍAS" → "HORARIO PARA TUTORIAS"
```

Esto permite que pequeñas variaciones no causen rechazo.

---

## ⚙️ Configuración en Frontend

### Ejemplo de Formulario para Subir Syllabus Validado

```typescript
const subirSyllabusValidado = async (file: File, datos: any) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('nombre', datos.nombre);
  formData.append('periodo', datos.periodo);
  formData.append('materias', datos.materias);
  
  try {
    const response = await fetch(`${API_URL}/syllabi/upload-validado`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      // Mostrar error detallado con títulos faltantes
      alert(result.error);
      console.error('Títulos faltantes:', result.detalles.titulos_faltantes);
      return;
    }
    
    // Éxito
    alert(`✅ Syllabus validado correctamente (${result.data.validacion.porcentaje_coincidencia}% coincidencia)`);
    
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 📊 Ejemplo Completo de Uso

### 1. Admin Sube Plantilla (Periodo 2025-1)

**Documento Word de Admin contiene:**
```
DATOS GENERALES (en negrita)
Código de Asignatura: _______
Nombre de la asignatura: _______

HORARIO DE CLASES (en negrita)
Lunes: 8:00 - 10:00
```

**Títulos extraídos:**
- DATOS GENERALES
- CÓDIGO DE ASIGNATURA
- NOMBRE DE LA ASIGNATURA
- HORARIO DE CLASES

---

### 2. Profesor Sube Syllabus (Periodo 2025-1)

**Caso A: Syllabus Válido ✅**

Documento Word del Profesor contiene:
```
DATOS GENERALES (en negrita)
Código de Asignatura: PROG-101
Nombre de la asignatura: Programación 1

HORARIO DE CLASES (en negrita)
Martes: 10:00 - 12:00
```

**Resultado:**
```json
{
  "success": true,
  "message": "✅ Syllabus validado y guardado exitosamente",
  "validacion": {
    "porcentaje_coincidencia": 100,
    "titulos_correctos": 4
  }
}
```

---

**Caso B: Syllabus Inválido ❌**

Documento Word del Profesor contiene:
```
DATOS GENERALES (en negrita)
Código: PROG-101
Asignatura: Programación 1
```

**Resultado:**
```json
{
  "success": false,
  "message": "El syllabus no cumple con la estructura requerida",
  "detalles": {
    "porcentaje_coincidencia": 50,
    "titulos_faltantes": [
      "NOMBRE DE LA ASIGNATURA",
      "HORARIO DE CLASES"
    ]
  }
}
```

---

## 🛠️ Pasos para Activar el Sistema

### 1. Ejecutar Migración en Base de Datos

```bash
cd my-node-backend
npm run migrate
```

O ejecutar manualmente en Neon SQL Editor:
```sql
ALTER TABLE syllabi ADD COLUMN IF NOT EXISTS es_plantilla_referencia BOOLEAN DEFAULT false;
ALTER TABLE syllabi ADD COLUMN IF NOT EXISTS titulos_extraidos JSONB;

CREATE INDEX IF NOT EXISTS idx_syllabi_plantilla_periodo 
ON syllabi (periodo, es_plantilla_referencia) 
WHERE es_plantilla_referencia = true;
```

### 2. Reiniciar Backend

```powershell
cd my-node-backend
npm run dev
```

### 3. Probar con Postman o Frontend

**Paso 1:** Admin sube plantilla
```bash
POST http://localhost:4000/api/syllabi/plantilla/upload
```

**Paso 2:** Profesor sube syllabus con validación
```bash
POST http://localhost:4000/api/syllabi/upload-validado
```

---

## ✅ Ventajas del Sistema

1. **Automatización Completa:** No hay que revisar manualmente los syllabus
2. **Estandarización:** Todos los syllabus tienen la misma estructura
3. **Feedback Inmediato:** El profesor sabe exactamente qué falta
4. **Flexible:** Permite pequeñas variaciones en formato (acentos, espacios)
5. **Escalable:** Un admin puede configurar múltiples plantillas por periodo

---

## 📞 Soporte

Si tienes dudas sobre el sistema:
1. Revisa los logs del backend (`console.log`)
2. Verifica que la plantilla tenga títulos en negrita
3. Usa `/api/syllabi/plantilla/:periodo` para ver qué títulos se requieren
4. Contacta al administrador del sistema
