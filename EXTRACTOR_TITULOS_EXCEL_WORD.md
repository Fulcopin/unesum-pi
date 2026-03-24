# 📋 EXTRACTOR DE TÍTULOS - Excel/Word

## 🎯 Propósito

Esta funcionalidad permite **visualizar qué títulos/secciones se detectan** en un archivo Excel o Word **ANTES** de subirlo al sistema. Es una herramienta de validación y depuración.

## ✨ Características

- ✅ Detecta títulos de secciones en archivos Excel (.xlsx, .xls)
- ✅ Detecta títulos de secciones en archivos Word (.docx, .doc)
- ✅ **Extrae cada título SOLO UNA VEZ** (sin duplicados por celdas combinadas)
- ✅ **Prioriza patrones específicos** (ej: "RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA" antes que solo "ASIGNATURA")
- ✅ **Indica la columna exacta** donde se encontró cada título por primera vez (A, B, C, etc.)
- ✅ Muestra el número de fila donde se detectó cada título
- ✅ Muestra el texto original capturado Y el texto limpio
- ✅ Clasifica los títulos por tipo (cabecera, datos_generales, texto_largo, tabla)
- ✅ Resumen estadístico por tipo de sección
- ✅ NO guarda nada en la base de datos, solo extrae y muestra

## 🔧 Implementación Técnica

### Backend

#### Endpoint
```
POST /api/programa-analitico/extraer-titulos
```

**Método:** `programaAnaliticoController.extraerTitulos`

**Ubicación:** `my-node-backend/src/controllers/programaAnaliticoController.js` líneas ~2440+

#### Request
```javascript
FormData {
  archivo: File // Excel (.xlsx, .xls) o Word (.docx, .doc)
}
```

#### Response
```json
{
  "success": true,
  "message": "Se detectaron 15 títulos en el archivo Excel",
  "data": {
    "tipoArchivo": "Excel",
    "nombreArchivo": "programa_analitico.xlsx",
    "totalFilas": 250,
    "totalTitulos": 15,
    "titulos": [
      {
        "numero": 1,
        "titulo": "PROGRAMA ANALÍTICO DE ASIGNATURA",
        "tipo": "cabecera",
        "fila": 2,
        "columna": 3,
        "columnaLetra": "C",
        "textoOriginal": "PROGRAMA ANALÍTICO DE ASIGNATURA",
        "textoLimpio": "PROGRAMA ANALITICO DE ASIGNATURA"
      },
      {
        "numero": 2,
        "titulo": "ASIGNATURA",
        "tipo": "datos_generales",
        "fila": 5,
        "columna": 2,
        "columnaLetra": "B",
        "textoOriginal": "ASIGNATURA",
        "textoLimpio": "ASIGNATURA"
      },
      {
        "numero": 3,
        "titulo": "PERIODO ACADÉMICO ORDINARIO(PAO)",
        "tipo": "datos_generales",
        "fila": 2,
        "columna": 6,
        "columnaLetra": "F",
        "textoOriginal": "PERIODO ACADÉMICO ORDINARIO(P",
        "textoLimpio": "PERIODO ACADEMICO ORDINARIO(P"
      },
      {
        "numero": 4,
        "titulo": "NIVEL",
        "tipo": "datos_generales",
        "fila": 3,
        "columna": 6,
        "columnaLetra": "F",
        "textoOriginal": "NIVEL",
        "textoLimpio": "NIVEL"
      }
      // ... más títulos
    ]
  }
}
```

#### Proceso de Detección

1. **Lectura del archivo:**
   - Excel: usa `xlsx` library
   - Word: usa `procesarWord()` existente

2. **Expansión de celdas combinadas (Excel):**
   - Las celdas merged se expanden con su valor original

3. **Detección inteligente de títulos:**
   - Busca patrones regex en cada celda individualmente
   - **Prioriza patrones más específicos** sobre generales por longitud
   - Ejemplo: "PROGRAMA ANALÍTICO DE ASIGNATURA" tiene prioridad sobre "ASIGNATURA"
   - **Elimina duplicados**: cada título se guarda SOLO UNA VEZ
   - Registra la primera ocurrencia (fila y columna)

4. **Retorna solo los títulos únicos:**
   - NO procesa el contenido completo
   - NO guarda nada en la base de datos
   - Solo información de detección única

### 🎯 Sistema de Priorización

El sistema usa **prioridad por longitud** para evitar detecciones duplicadas:

```javascript
Ejemplo de conflicto:
  Celda: "PROGRAMA ANALÍTICO DE ASIGNATURA"
  
  Patrones que coinciden:
  1. /PROGRAMA\s+ANALÍTICO\s+DE\s+ASIGNATURA/i  (36 caracteres) ✅ GANA
  2. /ASIGNATURA/i                              (10 caracteres) ❌ Descartado
  
  Resultado: Solo se guarda "PROGRAMA ANALÍTICO DE ASIGNATURA"
```

**Beneficios:**
- Evita duplicados como "ASIGNATURA" detectado 50+ veces
- Mantiene solo el título más específico
- Reduce ruido en los resultados

### Frontend

#### Componente
**Ubicación:** `components/programa-analitico/extractor-titulos-modal.tsx`

#### Características UI

1. **Modal con Dialog de shadcn/ui**
2. **Selector de archivo:** Input para .xlsx, .xls, .docx, .doc
3. **Botón "Extraer":** Envía el archivo al backend
4. **Resultados:**
   - Información del archivo (tipo, nombre, filas totales)
   - Lista de títulos detectados con:
     - Número de orden
     - Nombre del título
     - Tipo (con badge coloreado)
     - Fila donde se detectó
     - Texto original capturado
   - Resumen por tipo de sección

#### Estados

- **Loading:** Mientras se procesa el archivo
- **Error:** Si hay problemas (sin archivo, servidor caído, formato inválido)
- **Resultado:** Muestra la lista de títulos detectados

#### Integración

Se agregó una nueva tarjeta en el dashboard de admin:

**Ubicación:** `app/dashboard/admin/programa-analitico/page.tsx`

```tsx
{/* NUEVO: Extractor de Títulos */}
<Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-amber-200">
  <CardHeader className="pb-3">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-amber-500 text-white">
        <FileSpreadsheet className="h-6 w-6" />
      </div>
      <div>
        <CardTitle className="text-lg">Extraer Títulos</CardTitle>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <CardDescription className="mb-4">
      Visualiza qué títulos/secciones se detectan en tu archivo antes de subirlo
    </CardDescription>
    <ExtractorTitulosModal />
  </CardContent>
</Card>
```

## 📖 Cómo Usar

### Desde el Dashboard Admin

1. **Ir a:** Dashboard → Admin → Programas Analíticos
2. **Buscar la tarjeta:** "Extraer Títulos" (color ámbar/naranja)
3. **Click en:** Botón "Extraer Títulos"
4. **Seleccionar archivo:** Excel o Word
5. **Click "Extraer"**
6. **Ver resultados:**
   - Total de títulos detectados
   - Lista completa con detalles
   - Resumen por tipo

### Casos de Uso

#### 1. Validar antes de subir
```
"Tengo un Excel nuevo, quiero ver si se detectan bien las secciones"
→ Usar el Extractor de Títulos
→ Verificar que todos los títulos esperados aparecen
→ Si faltan títulos, revisar el formato del Excel
```

#### 2. Depurar problemas de detección
```
"El sistema no detecta la sección CARACTERIZACIÓN"
→ Usar el Extractor de Títulos
→ Ver en qué fila se detectó (o si no se detectó)
→ Revisar el texto original capturado
→ Comparar con el patrón regex esperado
```

#### 3. Entender la estructura
```
"No sé qué secciones tiene este archivo"
→ Usar el Extractor de Títulos
→ Ver la lista completa de títulos
→ Entender la estructura del documento
```

## 🎨 Tipos de Secciones Detectadas

### 1. **cabecera** (Badge azul)
- PROGRAMA ANALÍTICO DE ASIGNATURA

### 2. **datos_generales** (Badge gris)
- ASIGNATURA
- PERIODO ACADÉMICO ORDINARIO(PAO)
- NIVEL

### 3. **texto_largo** (Badge outline)
- CARACTERIZACIÓN
- OBJETIVOS DE LA ASIGNATURA
- COMPETENCIAS
- RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA
- METODOLOGÍA
- PROCEDIMIENTO DE EVALUACIÓN
- BIBLIOGRAFÍA BÁSICA
- BIBLIOGRAFÍA COMPLEMENTARIA

### 4. **tabla** (Badge rojo)
- CONTENIDO DE LA ASIGNATURA
- BIBLIOGRAFÍA - FUENTES DE CONSULTA
- VISADO

## 🔍 Ejemplo de Salida

```
📋 Extractor de Títulos - Excel/Word

✅ Se detectaron 12 títulos únicos en 66 filas

Tipo: Excel
Archivo: programa_analitico_matematicas.xlsx
Títulos detectados: 12

Títulos detectados (sin duplicados):

#1  PROGRAMA ANALÍTICO DE ASIGNATURA          [cabecera]
    📍 Fila 1  |  📊 Columna A (1)
    Original: "PROGRAMA ANALÍTICO DE ASIGNATURA"

#2  PERIODO ACADÉMICO ORDINARIO(PAO)          [datos_generales]
    📍 Fila 2  |  📊 Columna G (7)
    Original: "PERIODO ACADÉMICO ORDINARIO(PAO)"

#3  NIVEL                                     [datos_generales]
    📍 Fila 3  |  📊 Columna G (7)
    Original: "NIVEL"

#4  CARACTERIZACIÓN                           [texto_largo]
    📍 Fila 4  |  📊 Columna A (1)
    Original: "CARACTERIZACIÓN"

#5  OBJETIVOS DE LA ASIGNATURA                [texto_largo]
    📍 Fila 11  |  📊 Columna A (1)
    Original: "OBJETIVOS DE LA ASIGNATURA"

#6  COMPETENCIAS                              [texto_largo]
    📍 Fila 17  |  📊 Columna A (1)
    Original: "COMPETENCIAS"

#7  RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA [texto_largo]
    📍 Fila 22  |  📊 Columna A (1)
    Original: "RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA"

#8  CONTENIDO DE LA ASIGNATURA                [tabla]
    📍 Fila 28  |  📊 Columna A (1)
    Original: "CONTENIDO DE LA ASIGNATURA"

#9  DESCRIPCIÓN                               [texto_largo]
    📍 Fila 28  |  📊 Columna H (8)
    Original: "DESCRIPCIÓN"

#10 METODOLOGÍA                               [texto_largo]
    📍 Fila 46  |  📊 Columna A (1)
    Original: "METODOLOGÍA"

#11 PROCEDIMIENTO DE EVALUACIÓN               [texto_largo]
    📍 Fila 51  |  📊 Columna A (1)
    Original: "PROCEDIMIENTO DE EVALUACIÓN"

#12 BIBLIOGRAFÍA - FUENTES DE CONSULTA        [tabla]
    📍 Fila 56  |  📊 Columna A (1)
    Original: "BIBLIOGRAFÍA - FUENTES DE CONSULTA"

#13 BIBLIOGRAFÍA BÁSICA                       [texto_largo]
    📍 Fila 56  |  📊 Columna C (3)
    Original: "BIBLIOGRAFÍA BÁSICA"

#14 BIBLIOGRAFÍA COMPLEMENTARIA               [texto_largo]
    📍 Fila 60  |  📊 Columna C (3)
    Original: "BIBLIOGRAFÍA COMPLEMENTARIA"

#15 VISADO                                    [tabla]
    📍 Fila 64  |  📊 Columna A (1)
    Original: "VISADO"

Resumen por tipo:
- cabecera: 1
- datos_generales: 2
- texto_largo: 9
- tabla: 3

💡 Nota: Cada título se extrae solo UNA VEZ aunque aparezca
   en múltiples celdas por celdas combinadas (merged cells)
```

## 🚀 Ventajas

1. **Validación previa:** Ver qué se detectará antes de guardar
2. **Depuración rápida:** Identificar problemas de formato
3. **Sin side effects:** No modifica la base de datos
4. **Rápido:** Solo procesa detección, no contenido completo
5. **Informativo:** Muestra detalles útiles (fila, texto original)

## ⚠️ Limitaciones

- Solo detecta títulos, **NO muestra el contenido** de cada sección
- No valida si el contenido está duplicado (usa `relimpiarDatos` para eso)
- No guarda nada en la base de datos
- Requiere que los títulos sigan el formato UNESUM estándar

## 🔗 Funciones Relacionadas

### 1. Subir Programa Completo
```
POST /api/programa-analitico/upload-excel
→ Sube Y guarda el programa completo
→ Aplica limpieza automática
```

### 2. Re-limpiar Datos
```
PUT /api/programa-analitico/:id/relimpiar
→ Limpia datos duplicados de un programa YA guardado
```

### 3. Extraer con IA
```
Ver: IAExtractorModal
→ Usa Google AI para extraer datos automáticamente
```

## ❓ Preguntas Frecuentes

### ¿Por qué solo muestra 12-15 títulos si veo muchos más en los logs?

**R:** El sistema ahora usa **filtrado inteligente** que:
- Elimina duplicados causados por celdas combinadas (merged cells)
- Prioriza patrones específicos sobre generales
- Guarda cada título **solo UNA VEZ**

**Antes (sin filtro):**
```
✅ Fila 1, Col A: "ASIGNATURA"
✅ Fila 1, Col B: "ASIGNATURA"  
✅ Fila 1, Col C: "ASIGNATURA"  <- DUPLICADOS
✅ Fila 1, Col D: "ASIGNATURA"
... (200+ detecciones del mismo título)
```

**Ahora (con filtro):**
```
✅ Fila 1, Col A: "PROGRAMA ANALÍTICO DE ASIGNATURA" <- SOLO UNA VEZ
```

### ¿Por qué no aparece "ASIGNATURA" si está en muchas celdas?

**R:** El sistema prioriza el **patrón más específico**. Si una celda contiene "PROGRAMA ANALÍTICO DE ASIGNATURA", solo guarda este título completo, no la palabra "ASIGNATURA" que está dentro.

**Ejemplo:**
```
Celda A1: "PROGRAMA ANALÍTICO DE ASIGNATURA"

Patrones que coinciden:
1. "PROGRAMA ANALÍTICO DE ASIGNATURA" (36 chars) ✅ SE GUARDA
2. "ASIGNATURA" (10 chars)                      ❌ SE DESCARTA (ya está en el título más largo)
```

### ¿Cómo sé si todos mis títulos están siendo detectados?

**R:** Usa el extractor y verifica que veas:
- Todos los títulos principales del formato UNESUM
- Al menos: PROGRAMA ANALÍTICO, CARACTERIZACIÓN, OBJETIVOS, COMPETENCIAS, RESULTADOS DE APRENDIZAJE, CONTENIDO, METODOLOGÍA, PROCEDIMIENTO DE EVALUACIÓN, BIBLIOGRAFÍA, VISADO

Si falta alguno, revisa el formato de tu Excel o contacta al equipo técnico.

## 📝 Archivos Modificados/Creados

### Backend
1. ✅ `my-node-backend/src/controllers/programaAnaliticoController.js`
   - Nueva función `exports.extraerTitulos`
   
2. ✅ `my-node-backend/src/routes/programaAnaliticoRoutes.js`
   - Nueva ruta `POST /extraer-titulos`

### Frontend
1. ✅ `components/programa-analitico/extractor-titulos-modal.tsx` (NUEVO)
   - Componente modal completo
   
2. ✅ `app/dashboard/admin/programa-analitico/page.tsx`
   - Importación del componente
   - Nueva tarjeta "Extraer Títulos"

### Documentación
1. ✅ `EXTRACTOR_TITULOS_EXCEL_WORD.md` (ESTE ARCHIVO)

---

**Creado:** 13 de diciembre de 2025  
**Última actualización:** 14 de diciembre de 2025  
**Estado:** ✅ Implementado con Filtrado Inteligente  
**Versión:** 2.0.0 (Con eliminación de duplicados)
