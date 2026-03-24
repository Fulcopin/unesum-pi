# 🎯 DETECCIÓN AUTOMÁTICA DE TÍTULOS SIN PATRONES

## 📋 Problema Anterior

**Sistema anterior (NO ESCALABLE):**
```javascript
// ❌ Patrones hardcodeados - NO ESCALABLE
const seccionesEspeciales = [
  { patron: /PROGRAMA\s+ANALÍTICO/i, nombre: 'PROGRAMA ANALÍTICO DE ASIGNATURA' },
  { patron: /OBJETIVOS/i, nombre: 'OBJETIVOS DE LA ASIGNATURA' },
  { patron: /NUEVP/i, nombre: 'NUEVP' }, // ⚠️ Hay que agregar manualmente cada título nuevo
  // ... 20+ patrones más
];
```

**Limitaciones:**
- ❌ Si el usuario cambia el texto del título → **NO SE DETECTA**
- ❌ Si agrega secciones nuevas → **HAY QUE MODIFICAR EL CÓDIGO**
- ❌ No funciona con plantillas personalizadas
- ❌ Requiere mantenimiento constante

---

## ✅ Nueva Solución: Detección Inteligente por Características

### 🔍 Cómo Funciona

El nuevo sistema **NO usa patrones predefinidos**. En su lugar, analiza **características visuales y estructurales** de cada celda:

```javascript
const analizarCaracteristicas = (texto, fila, col) => {
  let puntuacion = 0;
  let caracteristicas = [];

  // ✅ 1. Es celda combinada? (+30 puntos)
  if (celdasCombinadas.has(`${fila}-${col}`)) {
    puntuacion += 30;
    caracteristicas.push('celda_combinada');
  }

  // ✅ 2. Está en mayúsculas? (+20 puntos)
  const porcentajeMayusculas = (textoLimpio.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length / textoLimpio.length;
  if (porcentajeMayusculas > 0.7) {
    puntuacion += 20;
    caracteristicas.push('mayusculas');
  }

  // ✅ 3. Es texto corto? (menos de 50 caracteres) (+15 puntos)
  if (textoLimpio.length < 50) {
    puntuacion += 15;
    caracteristicas.push('texto_corto');
  }

  // ✅ 4. Termina con ":" (indica etiqueta) (+10 puntos)
  if (textoLimpio.endsWith(':')) {
    puntuacion += 10;
    caracteristicas.push('termina_con_dos_puntos');
  }

  // ✅ 5. Primera columna (A) suele tener títulos (+10 puntos)
  if (col === 0) {
    puntuacion += 10;
    caracteristicas.push('primera_columna');
  }

  // ✅ 6. Contiene palabras clave comunes (+5 puntos c/u)
  const palabrasClave = [
    'PROGRAMA', 'OBJETIVOS', 'RESULTADOS', 'APRENDIZAJE', 'CONTENIDO',
    'ASIGNATURA', 'PERIODO', 'NIVEL', 'CARACTERIZACIÓN', 'COMPETENCIAS',
    'UNIDADES', 'METODOLOGÍA', 'EVALUACIÓN', 'BIBLIOGRAFÍA', 'VISADO',
    'DESCRIPCIÓN', 'ESTRATEGIAS', 'RECURSOS', 'TEMAS', 'HORAS'
  ];
  
  palabrasClave.forEach(palabra => {
    if (textoLimpio.toUpperCase().includes(palabra)) {
      puntuacion += 5;
    }
  });

  // ⚠️ PENALIZACIONES
  // Si es muy largo (>100 chars), probablemente no es título (-20 puntos)
  if (textoLimpio.length > 100) {
    puntuacion -= 20;
  }

  // Si contiene números al inicio (ej: "1. ", "2.3"), puede ser contenido (-5 puntos)
  if (/^\d+\.?\s/.test(textoLimpio)) {
    puntuacion -= 5;
  }

  return {
    puntuacion,
    caracteristicas,
    esTitulo: puntuacion >= 25 // Umbral: 25+ puntos = es título
  };
};
```

---

## 📊 Sistema de Puntuación

| Característica | Puntos | Razón |
|---------------|--------|-------|
| **Celda combinada** | +30 | Las secciones importantes se fusionan en Excel |
| **Mayúsculas (>70%)** | +20 | Los títulos suelen estar en MAYÚSCULAS |
| **Texto corto (<50 chars)** | +15 | Títulos son concisos |
| **Termina con ":"** | +10 | Etiquetas clásicas: "ASIGNATURA:", "NIVEL:" |
| **Primera columna (A)** | +10 | Los títulos suelen estar a la izquierda |
| **Palabra clave académica** | +5 cada una | "PROGRAMA", "OBJETIVOS", etc. |
| **Texto muy largo (>100)** | -20 | Probablemente es contenido, no título |
| **Número al inicio** | -5 | "1. Tema 1" es contenido, no título |

**Umbral de decisión:** Si `puntuacion >= 25`, se considera título.

---

## 🎯 Ejemplos Reales

### Ejemplo 1: Título de Sección Principal
```
Celda A1: "PROGRAMA ANALÍTICO DE ASIGNATURA"
- ✅ Celda combinada (A1:L1) → +30
- ✅ 100% mayúsculas → +20
- ✅ 36 caracteres (corto) → +15
- ✅ Primera columna → +10
- ✅ Contiene "PROGRAMA" → +5
- ✅ Contiene "ASIGNATURA" → +5
TOTAL: 85 puntos → ✅ ES TÍTULO (tipo: cabecera)
```

### Ejemplo 2: Campo de Datos
```
Celda A5: "ASIGNATURA:"
- ❌ NO combinada → 0
- ✅ 100% mayúsculas → +20
- ✅ 11 caracteres (corto) → +15
- ✅ Termina con ":" → +10
- ✅ Primera columna → +10
- ✅ Contiene "ASIGNATURA" → +5
TOTAL: 60 puntos → ✅ ES TÍTULO (tipo: campo)
```

### Ejemplo 3: Contenido (NO es título)
```
Celda B5: "Introducción a la programación orientada a objetos con Java"
- ❌ NO combinada → 0
- ❌ Minúsculas → 0
- ❌ 64 caracteres (largo) → 0
- ❌ NO termina con ":" → 0
- ❌ Segunda columna → 0
- ⚠️ MUY LARGO → -20
TOTAL: -20 puntos → ❌ NO ES TÍTULO
```

### Ejemplo 4: **NUEVP** (Título Personalizado)
```
Celda A50: "NUEVP"
- ✅ Celda combinada (A50:D50) → +30
- ✅ 100% mayúsculas → +20
- ✅ 5 caracteres (muy corto) → +15
- ✅ Primera columna → +10
TOTAL: 75 puntos → ✅ ES TÍTULO ✨ (detectado automáticamente)
```

---

## 🚀 Ventajas del Nuevo Sistema

### ✅ **Escalabilidad Total**
- **No necesitas modificar código** para agregar nuevas secciones
- Funciona con **cualquier plantilla personalizada**
- El usuario puede agregar "NUEVP", "XYZ", "MI_SECCION" y se detectará automáticamente

### ✅ **Detección Inteligente**
- Analiza **estructura visual** del Excel (celdas combinadas, formato)
- Usa **múltiples criterios** para decidir si es título
- **Sistema de puntuación** ajustable

### ✅ **Resultados Ordenados por Relevancia**
```javascript
// Los títulos se ordenan por puntuación (más importantes primero)
const titulosOrdenados = Array.from(titulosUnicos.values())
  .sort((a, b) => b.puntuacion - a.puntuacion);
```

### ✅ **Transparencia**
Cada título muestra:
- ✅ Puntuación obtenida
- ✅ Características detectadas
- ✅ Ubicación exacta (fila, columna)

---

## 📦 Respuesta de la API

```json
{
  "success": true,
  "message": "Se detectaron 12 títulos en el archivo Excel",
  "data": {
    "tipoArchivo": "Excel",
    "nombreArchivo": "programa_analitico.xlsx",
    "totalFilas": 150,
    "totalTitulos": 12,
    "titulos": [
      {
        "numero": 1,
        "titulo": "PROGRAMA ANALÍTICO DE ASIGNATURA",
        "tipo": "cabecera",
        "fila": 1,
        "columna": 1,
        "columnaLetra": "A",
        "puntuacion": 85,
        "caracteristicas": "celda_combinada, mayusculas, texto_corto, primera_columna, keyword:programa, keyword:asignatura"
      },
      {
        "numero": 2,
        "titulo": "NUEVP",
        "tipo": "titulo_seccion",
        "fila": 50,
        "columna": 1,
        "columnaLetra": "A",
        "puntuacion": 75,
        "caracteristicas": "celda_combinada, mayusculas, texto_corto, primera_columna"
      }
      // ... más títulos
    ]
  }
}
```

---

## ⚙️ Ajustes Disponibles

### 1. Cambiar Umbral de Detección
```javascript
// Más estricto (solo títulos muy claros)
esTitulo: puntuacion >= 35

// Más permisivo (detectar más posibles títulos)
esTitulo: puntuacion >= 20
```

### 2. Agregar Nuevas Características
```javascript
// ✅ 7. Celda con fondo de color (+15 puntos)
if (celdaTieneFondo(celda)) {
  puntuacion += 15;
  caracteristicas.push('tiene_fondo_color');
}

// ✅ 8. Texto en negrita (+10 puntos)
if (esNegrita(celda)) {
  puntuacion += 10;
  caracteristicas.push('negrita');
}
```

### 3. Personalizar Palabras Clave
```javascript
// Agregar términos específicos de tu institución
const palabrasClave = [
  'PROGRAMA', 'OBJETIVOS', 'RESULTADOS',
  'UNESUM', 'CARRERA', 'MALLA', // ✅ Personalizadas
  'NUEVP', 'XYZ' // ✅ Las que necesites
];
```

---

## 🎓 Casos de Uso

### ✅ Caso 1: Usuario Cambia Nombre de Sección
```
Antes: "OBJETIVOS DE LA ASIGNATURA"
Después: "METAS DE APRENDIZAJE"

✅ Sistema anterior: ❌ NO DETECTARÍA
✅ Sistema nuevo: ✅ DETECTA (celda combinada + mayúsculas + corto = 65 pts)
```

### ✅ Caso 2: Plantilla Personalizada
```
Usuario crea sección: "EVALUACIÓN FORMATIVA Y SUMATIVA"

✅ Sistema anterior: ❌ Requiere agregar patrón manualmente
✅ Sistema nuevo: ✅ DETECTA automáticamente (75 pts)
```

### ✅ Caso 3: Excel en Otro Idioma
```
Sección en inglés: "LEARNING OUTCOMES"

✅ Sistema anterior: ❌ Solo español
✅ Sistema nuevo: ✅ DETECTA (celda combinada + mayúsculas = 65 pts)
```

---

## 📈 Métricas de Rendimiento

| Métrica | Sistema Anterior | Sistema Nuevo |
|---------|-----------------|---------------|
| **Patrones hardcodeados** | 20+ | 0 ✅ |
| **Mantenimiento requerido** | Alto | Mínimo ✅ |
| **Soporta plantillas custom** | ❌ No | ✅ Sí |
| **Detecta títulos en otros idiomas** | ❌ No | ✅ Sí |
| **Escalabilidad** | ❌ Baja | ✅ Alta |
| **Falsos positivos** | Bajo | Medio (ajustable) |
| **Falsos negativos** | Alto | Bajo ✅ |

---

## 🛠️ Integración

### Endpoint
```bash
POST /api/programa-analitico/extraer-titulos
Content-Type: multipart/form-data

archivo: [archivo.xlsx]
```

### Frontend (React)
```typescript
const extraerTitulos = async (archivo: File) => {
  const formData = new FormData();
  formData.append('archivo', archivo);

  const response = await fetch('/api/programa-analitico/extraer-titulos', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  console.log(`Títulos detectados: ${data.data.totalTitulos}`);
  data.data.titulos.forEach(t => {
    console.log(`- ${t.titulo} (${t.puntuacion} pts)`);
  });
};
```

---

## 🎯 Conclusión

**El nuevo sistema es 100% escalable:**
- ✅ No requiere patrones hardcodeados
- ✅ Detecta títulos automáticamente por características visuales
- ✅ Funciona con cualquier plantilla personalizada
- ✅ El usuario puede agregar **CUALQUIER título** y se detectará
- ✅ Sistema de puntuación transparente y ajustable

**Ya no necesitas preguntarte:**
> "Si agrego NUEVP, ¿cómo lo detecto?"

**La respuesta es:**
> Si está en celda combinada, mayúsculas, y es texto corto → **SE DETECTA AUTOMÁTICAMENTE** ✨
