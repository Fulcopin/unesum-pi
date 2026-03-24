# 🎯 Sistema de Validación y Comparación Inteligente de Programas Analíticos

## 📋 **DESCRIPCIÓN**

Sistema robusto que procesa archivos Word (.docx) y los compara contra una **Plantilla Maestra** almacenada en la base de datos. El sistema identifica secciones mediante palabras clave, valida la estructura y realiza un "llenado quirúrgico" de campos.

---

## ✨ **CARACTERÍSTICAS PRINCIPALES**

### 1. **Extracción Agnóstica**
- ❌ **NO depende** de números de fila fijos
- ✅ Identifica secciones mediante **palabras clave** (ej: "CARACTERIZACIÓN", "OBJETIVOS")
- ✅ Normalización de texto: quita tildes, convierte a minúsculas
- ✅ Similitud inteligente: detecta variaciones del 75%+

### 2. **Comparación de Estructura**
- ✅ Compara títulos del Word vs plantilla maestra
- ✅ Detecta secciones **obligatorias faltantes**
- ✅ Detecta secciones **adicionales**
- ✅ Calcula **porcentaje de coincidencia** (mínimo 90%)

### 3. **Llenado Quirúrgico**

#### **Tipo: Cabecera** 🔒
- **Campos**: ASIGNATURA, PERIODO, NIVEL
- **Acción**: Inyecta datos oficiales de la base de datos
- **Editabilidad**: ❌ Bloqueado (datos oficiales)

#### **Tipo: Contenido** 📝
- **Secciones**: OBJETIVOS, METODOLOGÍA, BIBLIOGRAFÍA
- **Acción**: Extrae texto/tablas del Word tal cual
- **Editabilidad**: ✅ Editable

#### **Tipo: Exclusión** 🚫
- **Secciones**: UNIDADES TEMÁTICAS, CONTENIDOS
- **Acción**: Preserva EXACTAMENTE lo que viene del Word
- **Editabilidad**: ✅ Editable (planificación del docente)

---

## 🏗️ **ARQUITECTURA**

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│  app/dashboard/comision/crear-programa-analitico/page.tsx   │
│                                                              │
│  • handleUploadConValidacion()                              │
│  • ValidationResultDialog (modal de resultados)             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP POST /api/programa-analitico/upload-validado
                       │ FormData: { file, periodo, asignatura_id }
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                         │
│  my-node-backend/src/controllers/                           │
│   programaAnaliticoController.js                            │
│                                                              │
│  • exports.uploadConValidacion()                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Llama a servicio de validación
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVICIO DE VALIDACIÓN                    │
│  my-node-backend/src/services/                              │
│   programaAnaliticoValidator.service.js                     │
│                                                              │
│  1. extractSeccionesWord()     → Extrae secciones del Word  │
│  2. validarContraPlantilla()   → Compara con plantilla DB   │
│  3. construirProgramaAnalitico() → Genera JSON estructurado │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Consulta plantilla maestra
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS                             │
│  Tabla: programas_analiticos                                │
│                                                              │
│  • WHERE asignatura_id IS NULL  (plantilla maestra)         │
│  • periodo = "Primer Periodo PII 2026"                      │
│  • datos_tabla.secciones → JSON con estructura              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 **ESTRUCTURA DE ARCHIVOS**

```
unesum-final/
├── my-node-backend/
│   └── src/
│       ├── controllers/
│       │   └── programaAnaliticoController.js     ✅ Endpoint uploadConValidacion
│       ├── services/
│       │   └── programaAnaliticoValidator.service.js  ✅ NUEVO: Lógica de validación
│       └── routes/
│           └── programaAnaliticoRoutes.js         ✅ Ruta POST /upload-validado
│
├── app/
│   └── dashboard/
│       └── comision/
│           └── crear-programa-analitico/
│               └── page.tsx                       ✅ Frontend con upload
│
└── components/
    └── programa-analitico/
        └── validation-result-dialog.tsx           ✅ NUEVO: Modal de resultados
```

---

## 🚀 **USO DEL SISTEMA**

### **1. Admin: Crear Plantilla Maestra**

La plantilla debe tener la siguiente estructura en `datos_tabla.secciones`:

```json
{
  "version": "2.0",
  "nombre": "Plantilla PII 2026",
  "secciones": [
    {
      "titulo": "DATOS INFORMATIVOS",
      "obligatoria": true,
      "tipo": "cabecera",
      "campos": ["ASIGNATURA", "PERIODO", "NIVEL"]
    },
    {
      "titulo": "CARACTERIZACIÓN DE LA ASIGNATURA",
      "obligatoria": true,
      "tipo": "contenido"
    },
    {
      "titulo": "UNIDADES TEMÁTICAS",
      "obligatoria": true,
      "tipo": "exclusion"
    }
  ]
}
```

**Guardar en DB:**
```javascript
await ProgramaAnalitico.create({
  nombre: "Plantilla Maestra PII 2026",
  periodo: "Primer Periodo PII 2026",
  asignatura_id: null, // ← IMPORTANTE: NULL para indicar plantilla maestra
  datos_tabla: plantillaJSON
});
```

### **2. Comisión: Subir Programa Analítico**

1. Acceder a: `/dashboard/comision/crear-programa-analitico?asignatura=31&periodo=Primer%20Periodo%20PII%202026`
2. Seleccionar periodo
3. Hacer clic en **"Cargar desde archivo Word"**
4. Seleccionar archivo `.docx`
5. El sistema automáticamente:
   - Extrae las secciones del Word
   - Compara contra la plantilla maestra
   - Muestra resultados de validación
   - Si es válido (≥90%), guarda en BD

### **3. Ver Resultados**

El sistema muestra un modal con:
- ✅ Porcentaje de coincidencia
- ✅ Secciones encontradas vs requeridas
- ⚠️ Secciones faltantes (si hay)
- ℹ️ Secciones adicionales detectadas

---

## 🔧 **INSTALACIÓN**

### **Backend:**

```bash
cd my-node-backend
npm install mammoth cheerio
```

### **Frontend:**

```bash
cd unesum-final
npm install lucide-react
```

---

## 🎯 **ENDPOINTS**

### **POST /api/programa-analitico/upload-validado**

**Headers:**
```
Authorization: Bearer <token>
```

**Body (FormData):**
```
file: archivo.docx
periodo: "Primer Periodo PII 2026"
asignatura_id: 31
nombre: "Programa Analítico - Programación II"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Programa analítico validado y guardado exitosamente",
  "data": {
    "id": 123,
    "nombre": "Programa Analítico - Programación II",
    "periodo": "Primer Periodo PII 2026",
    "asignatura_id": 31,
    "datos_tabla": { /* JSON estructurado */ }
  },
  "validacion": {
    "success": true,
    "porcentaje_coincidencia": 100,
    "total_requeridos": 9,
    "encontrados": 9,
    "faltantes": [],
    "extras": []
  }
}
```

**Response (Error - Validación Fallida):**
```json
{
  "success": false,
  "message": "El documento no cumple con la estructura requerida (75% de coincidencia, mínimo 90%)",
  "validacion": {
    "success": false,
    "porcentaje_coincidencia": 75,
    "total_requeridos": 9,
    "encontrados": 7,
    "faltantes": ["METODOLOGÍA", "BIBLIOGRAFÍA"],
    "extras": ["REFERENCIAS ADICIONALES"]
  }
}
```

**Response (Error - Sin Plantilla):**
```json
{
  "success": false,
  "error": "No existe una plantilla maestra para el periodo \"Primer Periodo PII 2026\". Contacte al administrador."
}
```

---

## 🧪 **TESTING**

### **1. Crear Plantilla de Prueba:**

```javascript
const plantilla = {
  version: "2.0",
  nombre: "Plantilla Test",
  secciones: [
    {
      titulo: "DATOS INFORMATIVOS",
      obligatoria: true,
      tipo: "cabecera",
      campos: ["ASIGNATURA", "PERIODO", "NIVEL"]
    },
    {
      titulo: "OBJETIVOS DE LA ASIGNATURA",
      obligatoria: true,
      tipo: "contenido"
    }
  ]
};

await ProgramaAnalitico.create({
  nombre: "Plantilla Test",
  periodo: "Test 2026",
  asignatura_id: null,
  datos_tabla: plantilla
});
```

### **2. Crear Word de Prueba:**

```
DATOS INFORMATIVOS

ASIGNATURA: [vacío]
PERIODO: [vacío]
NIVEL: [vacío]

OBJETIVOS DE LA ASIGNATURA

- Objetivo 1: Aprender conceptos básicos
- Objetivo 2: Aplicar conocimientos
```

### **3. Subir y Verificar:**

- Subir el Word
- Verificar que:
  - ✅ Coincidencia = 100%
  - ✅ Campos de cabecera se llenan automáticamente
  - ✅ Objetivos se preservan del Word

---

## 📊 **FLUJO DE DATOS**

```
1. Usuario sube Word (.docx)
         ↓
2. mammoth.convertToHtml(buffer)
         ↓
3. cheerio.load(html) → Análisis DOM
         ↓
4. Detectar títulos de sección:
   - <h1>, <h2>, <h3>
   - Texto en MAYÚSCULAS
   - Texto con numeración (1., 2.3)
         ↓
5. Extraer contenido:
   - Tablas → tabla: [[cel1, cel2], ...]
   - Texto → contenido: "texto plano"
         ↓
6. Buscar en Plantilla Maestra:
   - Coincidencia exacta normalizada
   - Coincidencia por similitud (≥75%)
         ↓
7. Construir JSON estructurado:
   - tabs: [{ title, rows: [{ cells: [...] }] }]
   - Cada celda con: content, isEditable, style
         ↓
8. Guardar en DB con asignatura_id
```

---

## 🛠️ **FUNCIONES CLAVE**

### **normalizeText(text)**
```javascript
// "CARACTERIZACIÓN" → "caracterizacion"
// "  OBJETIVOS   " → "objetivos"
```

### **calculateSimilarity(text1, text2)**
```javascript
// "OBJETIVOS DE LA ASIGNATURA" vs "OBJETIVOS ASIGNATURA" → 80%
```

### **buscarSeccionPorTitulo(seccionesWord, tituloPlantilla)**
```javascript
// Busca "METODOLOGÍA" en:
// - "METODOLOGIA" → Match exacto
// - "1. METODOLOGÍA DE ENSEÑANZA" → Match por similitud
// - "ESTRATEGIAS METODOLÓGICAS" → Match 75%+
```

### **construirProgramaAnalitico()**
```javascript
// Genera:
{
  tabs: [
    {
      id: "tab-123",
      title: "DATOS INFORMATIVOS",
      rows: [
        {
          cells: [
            { content: "ASIGNATURA", isHeader: true, isEditable: false },
            { content: "TI-301 - Programación II", isEditable: false }
          ]
        }
      ]
    }
  ]
}
```

---

## ⚠️ **TROUBLESHOOTING**

### **Error: "No existe una plantilla maestra"**

**Causa:** No hay registro con `asignatura_id = NULL` para ese periodo

**Solución:**
```sql
SELECT * FROM programas_analiticos 
WHERE asignatura_id IS NULL 
AND periodo = 'Primer Periodo PII 2026';
```

Si está vacío, crear plantilla maestra como admin.

### **Error: "Coincidencia 60% (mínimo 90%)"**

**Causa:** Los títulos del Word no coinciden con la plantilla

**Solución:**
1. Verificar títulos en plantilla: `datos_tabla.secciones[].titulo`
2. Comparar con títulos del Word
3. Ajustar Word para que coincidan (sin tildes está OK)

### **Error: "Archivo corrupto"**

**Causa:** El Word no se puede leer con mammoth

**Solución:**
1. Abrir Word → Guardar Como → Formato `.docx` moderno
2. Verificar que no tenga password
3. Verificar que no sea `.doc` (Office 97-2003)

---

## 📝 **NOTAS IMPORTANTES**

1. **Plantilla Maestra debe tener `asignatura_id = NULL`**
2. **Periodo debe coincidir exactamente** (case-sensitive)
3. **Umbral de similitud**: 75% para match flexible, 90% para validación final
4. **Campos de cabecera**: Siempre se llenan con datos oficiales (ignora Word)
5. **Secciones de exclusión**: NUNCA se modifican (preserva docente)

---

## 🎓 **MEJORAS FUTURAS**

- [ ] Soporte para imágenes en el Word
- [ ] Detección de tablas anidadas
- [ ] Validación de formato de celdas
- [ ] Exportación a PDF con los datos llenados
- [ ] Historial de versiones del programa analítico
- [ ] Notificaciones automáticas al docente

---

## 📧 **SOPORTE**

Para problemas o dudas, contactar al equipo de desarrollo con:
- Logs del backend (`console.log`)
- Archivo Word que causó el error
- Periodo y asignatura_id usados
- Screenshot del error en el frontend

---

**Fecha de creación:** 6 de Febrero, 2026
**Versión:** 1.0.0
**Autor:** Sistema de Gestión Académica UNESUM
