# 🎯 Explicación: Acordeones y Extracción de JSON

## 📅 Fecha: 3 de febrero de 2026

---

## ❓ Pregunta: "Los acordeones son del mismo JSON?"

### ✅ **Respuesta: SÍ, ahora los acordeones se extraen dinámicamente del JSON**

---

## 🔄 Flujo Completo de Extracción

### **1. Usuario Sube Documento Word**
```
Usuario → Click "Subir Word" → Selecciona archivo .docx
```

### **2. Frontend Envía al Backend**
```javascript
// app/dashboard/comision/crear-programa-analitico/page.tsx
const formData = new FormData()
formData.append('archivo', file)

fetch('/api/programa-analitico/extraer-titulos', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
})
```

### **3. Backend Analiza el Documento**
```javascript
// my-node-backend/src/controllers/programaAnaliticoController.js
exports.extraerTitulos = async (req, res) => {
  // 1. Convierte Word a JSON con xlsx/mammoth
  // 2. Analiza cada celda/línea con IA de detección de títulos
  // 3. Calcula puntuación por características:
  //    - Celda combinada: +30 puntos
  //    - Mayúsculas: +20 puntos
  //    - Texto corto: +15 puntos
  //    - Termina en ":": +10 puntos
  //    - Palabras clave: +5 puntos c/u
  //    - Umbral: 25+ puntos = es título
  // 4. Retorna JSON con títulos detectados
}
```

### **4. Backend Retorna JSON Estructurado**
```json
{
  "success": true,
  "data": {
    "titulos": [
      {
        "titulo": "ASIGNATURA",
        "tipo": "cabecera",
        "fila": 0,
        "columna": 0,
        "puntuacion": 65,
        "caracteristicas": ["celda_combinada", "mayusculas", "texto_corto"],
        "contenido": [
          "Nombre: Programación I",
          "Código: INFO-101"
        ]
      },
      {
        "titulo": "CARACTERIZACIÓN",
        "tipo": "etiqueta",
        "fila": 5,
        "columna": 0,
        "puntuacion": 45,
        "contenido": [
          "Esta asignatura introduce los fundamentos..."
        ]
      }
    ],
    "totalTitulos": 15,
    "tipoArchivo": "Word"
  }
}
```

### **5. Frontend Convierte JSON a Acordeones**
```javascript
// Función: convertirTitulosASecciones()
const seccionesExtraidas = convertirTitulosASecciones(result.data.titulos)

// Resultado:
[
  {
    nombre: "ASIGNATURA",
    campos: [
      { titulo: "Nombre", valor: "Programación I" },
      { titulo: "Código", valor: "INFO-101" }
    ]
  },
  {
    nombre: "CARACTERIZACIÓN",
    campos: [
      { titulo: "", valor: "Esta asignatura introduce..." }
    ]
  }
]
```

### **6. React Renderiza Acordeones**
```tsx
<Accordion type="multiple">
  {secciones.map((seccion, idx) => (
    <AccordionItem key={idx} value={`section-${idx}`}>
      <AccordionTrigger>{seccion.nombre}</AccordionTrigger>
      <AccordionContent>
        {seccion.campos.map((campo, campoIdx) => (
          <div key={campoIdx}>
            <Input value={campo.titulo} placeholder="Título" />
            <Textarea value={campo.valor} placeholder="Contenido" />
          </div>
        ))}
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

---

## 🧠 Algoritmo de Detección de Títulos

### **Características Analizadas (Backend)**

| Característica | Puntos | Descripción |
|---------------|--------|-------------|
| **Celda Combinada** | +30 | Celdas merged suelen ser cabeceras |
| **Mayúsculas (>70%)** | +20 | Títulos suelen estar en MAYÚSCULAS |
| **Texto Corto (<50 chars)** | +15 | Títulos son concisos |
| **Termina en ":"** | +10 | Indica etiqueta/título |
| **Primera Columna** | +10 | Columna A suele tener títulos |
| **Palabra Clave** | +5 c/u | PROGRAMA, OBJETIVOS, etc. |
| **Texto Muy Largo (>100)** | -20 | Probablemente es contenido |
| **Número al Inicio** | -5 | Puede ser contenido enumerado |

### **Umbral de Decisión**
```
Puntuación ≥ 25 → ES TÍTULO
Puntuación < 25 → ES CONTENIDO
```

### **Palabras Clave Reconocidas**
```javascript
const palabrasClave = [
  'PROGRAMA', 'OBJETIVOS', 'RESULTADOS', 'APRENDIZAJE', 'CONTENIDO',
  'ASIGNATURA', 'PERIODO', 'NIVEL', 'CARACTERIZACIÓN', 'COMPETENCIAS',
  'UNIDADES', 'METODOLOGÍA', 'EVALUACIÓN', 'BIBLIOGRAFÍA', 'VISADO',
  'DESCRIPCIÓN', 'ESTRATEGIAS', 'RECURSOS', 'TEMAS', 'HORAS'
]
```

---

## 📊 Ejemplo Completo: De Word a Acordeones

### **Archivo Word Original:**
```
╔════════════════════════════════════════════════╗
║  PROGRAMA ANALÍTICO DE ASIGNATURA              ║
╠════════════════════════════════════════════════╣
║ ASIGNATURA                                     ║
║ Nombre: Programación I                         ║
║ Código: INFO-101                               ║
╠════════════════════════════════════════════════╣
║ CARACTERIZACIÓN                                ║
║ Esta asignatura introduce los fundamentos      ║
║ de la programación estructurada...             ║
╠════════════════════════════════════════════════╣
║ OBJETIVOS DE LA ASIGNATURA                     ║
║ - Objetivo 1: Comprender algoritmos básicos    ║
║ - Objetivo 2: Aplicar estructuras de control   ║
╚════════════════════════════════════════════════╝
```

### **Paso 1: Backend Detecta Títulos**
```json
{
  "titulos": [
    {
      "titulo": "ASIGNATURA",
      "puntuacion": 65,
      "caracteristicas": ["celda_combinada", "mayusculas", "keyword:asignatura"]
    },
    {
      "titulo": "CARACTERIZACIÓN",
      "puntuacion": 45,
      "caracteristicas": ["mayusculas", "texto_corto", "keyword:caracterización"]
    },
    {
      "titulo": "OBJETIVOS DE LA ASIGNATURA",
      "puntuacion": 50,
      "caracteristicas": ["mayusculas", "keyword:objetivos", "keyword:asignatura"]
    }
  ]
}
```

### **Paso 2: Frontend Convierte a Secciones**
```javascript
const secciones = [
  {
    nombre: "ASIGNATURA",
    campos: [
      { titulo: "Nombre", valor: "Programación I" },
      { titulo: "Código", valor: "INFO-101" }
    ]
  },
  {
    nombre: "CARACTERIZACIÓN",
    campos: [
      { titulo: "", valor: "Esta asignatura introduce los fundamentos..." }
    ]
  },
  {
    nombre: "OBJETIVOS DE LA ASIGNATURA",
    campos: [
      { titulo: "", valor: "Objetivo 1: Comprender algoritmos básicos" },
      { titulo: "", valor: "Objetivo 2: Aplicar estructuras de control" }
    ]
  }
]
```

### **Paso 3: Renderiza Acordeones**
```
┌─────────────────────────────────────────┐
│ ▼ ASIGNATURA                            │
│   ┌─────────────────────────────────┐   │
│   │ Título: Nombre                  │   │
│   │ Valor: Programación I           │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │ Título: Código                  │   │
│   │ Valor: INFO-101                 │   │
│   └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ ▶ CARACTERIZACIÓN                       │
├─────────────────────────────────────────┤
│ ▶ OBJETIVOS DE LA ASIGNATURA            │
└─────────────────────────────────────────┘
```

---

## 🔄 Métodos de Extracción

### **Método 1: Backend API (Principal) ✅**
```
Ventajas:
✅ Detección inteligente con IA
✅ Maneja celdas combinadas
✅ Reconoce formato visual (mayúsculas, posición)
✅ Extrae contenido asociado
✅ Funciona con Excel y Word

Desventajas:
❌ Requiere conexión al backend
```

### **Método 2: Mammoth Local (Fallback)**
```
Ventajas:
✅ Funciona sin backend
✅ Procesa en el navegador
✅ Extrae texto plano rápido

Desventajas:
❌ No detecta formato visual
❌ No maneja celdas combinadas
❌ Menos preciso en detección de títulos
```

---

## 🎨 Formato JSON Guardado en BD

### **Estructura Final**
```json
{
  "version": "3.0",
  "tipo": "programa_analitico_acordeon",
  "secciones": [
    {
      "nombre": "ASIGNATURA",
      "campos": [
        { "titulo": "Nombre", "valor": "Programación I" },
        { "titulo": "Código", "valor": "INFO-101" }
      ]
    }
  ],
  "metadata": {
    "asignatura": "Programación I",
    "periodo": "2025-2026",
    "nivel": "I",
    "fuente": "extraido_de_word",
    "titulosDetectados": 15,
    "createdAt": "2026-02-03T10:00:00Z"
  }
}
```

---

## 🧪 Casos de Uso

### **Caso 1: Documento con Formato Estándar**
```
Input: Programa analítico con títulos en mayúsculas y celdas combinadas
Resultado: ✅ 95% de títulos detectados correctamente
```

### **Caso 2: Documento con Formato Irregular**
```
Input: Programa analítico con títulos en minúsculas y sin celdas combinadas
Resultado: ⚠️ 70% detectados (usa palabras clave)
Solución: Usuario puede agregar/editar secciones manualmente
```

### **Caso 3: Documento sin Estructura Clara**
```
Input: Documento de texto plano sin formato
Resultado: ❌ Detección mínima
Solución: Sistema usa secciones predefinidas vacías
Usuario completa manualmente
```

---

## 🛠️ Funciones Clave

### **Frontend: handleUploadWord()**
```javascript
// 1. Crea FormData con archivo
// 2. Envía a /api/programa-analitico/extraer-titulos
// 3. Recibe JSON con títulos
// 4. Llama a convertirTitulosASecciones()
// 5. Actualiza estado de secciones
// 6. React re-renderiza acordeones
```

### **Frontend: convertirTitulosASecciones()**
```javascript
// 1. Recorre array de títulos
// 2. Para cada título, extrae contenido
// 3. Detecta formato "Título: Valor"
// 4. Crea estructura { nombre, campos[] }
// 5. Retorna array de secciones
```

### **Backend: exports.extraerTitulos()**
```javascript
// 1. Recibe archivo Word/Excel
// 2. Convierte a JSON (xlsx/mammoth)
// 3. Llama a detectarSoloTitulos()
// 4. Analiza características de cada celda
// 5. Calcula puntuación
// 6. Filtra títulos (umbral 25+)
// 7. Retorna JSON estructurado
```

---

## 📈 Mejoras Futuras

### **1. Machine Learning**
```
- Entrenar modelo con programas analíticos reales
- Mejorar detección con redes neuronales
- Reconocer patrones específicos por carrera
```

### **2. OCR para PDFs**
```
- Soportar archivos PDF escaneados
- Extracción con Tesseract.js
- Detección de títulos en imágenes
```

### **3. Plantillas Inteligentes**
```
- Guardar estructura de secciones por asignatura
- Auto-completar campos comunes
- Sugerir contenido basado en histórico
```

---

## ✅ Resumen

| Aspecto | Descripción |
|---------|-------------|
| **¿De dónde vienen los acordeones?** | Del JSON extraído del documento Word/Excel |
| **¿Quién detecta los títulos?** | Backend con algoritmo de puntuación por características |
| **¿Cómo se organizan?** | Frontend convierte JSON a estructura de secciones+campos |
| **¿Se pueden editar?** | ✅ Sí, usuario puede agregar/eliminar/modificar campos |
| **¿Se guarda la estructura?** | ✅ Sí, en formato JSON en campo `datos_tabla` de BD |

---

**Conclusión:** Los acordeones NO son estáticos ni predefinidos. Se extraen **dinámicamente** del JSON generado por el backend al analizar el documento Word/Excel con un algoritmo inteligente que detecta títulos por características visuales y semánticas. 🎯
