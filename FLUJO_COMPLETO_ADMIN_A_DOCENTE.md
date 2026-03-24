# 🔄 FLUJO COMPLETO: Desde el Administrador hasta el Docente

## 📋 Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Fase 1: Admin sube Excel](#fase-1-admin-sube-excel)
3. [Fase 2: Sistema crea Plantilla](#fase-2-sistema-crea-plantilla)
4. [Fase 3: Docente visualiza formularios](#fase-3-docente-visualiza-formularios)
5. [Fase 4: Docente llena formulario](#fase-4-docente-llena-formulario)
6. [Fase 5: Sistema guarda contenido](#fase-5-sistema-guarda-contenido)
7. [Verificación y Debugging](#verificación-y-debugging)

---

## 📌 Resumen Ejecutivo

### ¿Qué hace el sistema?
El sistema permite que el **administrador** suba un archivo Excel con la estructura de un programa analítico. El sistema **automáticamente**:
1. Detecta la estructura del Excel (secciones, campos, tablas)
2. Crea una **plantilla reutilizable** en la base de datos
3. Permite que los **docentes** llenen formularios dinámicos basados en esa plantilla
4. Guarda el contenido en tablas relacionales normalizadas

### Tablas principales involucradas:
```
📂 ESTRUCTURA DE PLANTILLAS:
├── plantillas_programa       (plantilla base)
├── secciones_plantilla        (secciones: Datos Generales, Unidades, etc.)
└── campos_seccion             (campos de cada sección: Carrera, Nivel, etc.)

📂 CONTENIDO LLENADO POR DOCENTES:
├── contenido_programa         (registro por sección llenada)
├── filas_tabla_programa       (filas de tablas)
└── valores_campo_programa     (valores de cada celda)

📂 ASIGNACIONES:
└── asignaciones_programa_docente (qué docente llena qué programa)
```

---

## 🎯 FASE 1: Admin sube Excel

### 1.1 Frontend - Página de Admin
**Archivo:** `app/dashboard/admin/editor-tablas/page.tsx`

```typescript
// El admin selecciona un archivo Excel
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  
  const formData = new FormData()
  formData.append('file', file)
  
  // Envía al backend
  const response = await fetch('http://localhost:4000/api/programa-analitico/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  })
}
```

### 1.2 Backend - Recepción del Excel
**Archivo:** `my-node-backend/src/controllers/programaAnaliticoController.js`
**Función:** `exports.uploadExcel` (líneas 96-400)

```javascript
exports.uploadExcel = async (req, res) => {
  const transaction = await sequelize.transaction()
  try {
    // 1. Recibe el archivo
    const file = req.file // multer procesa el upload
    const workbook = XLSX.read(file.buffer)
    
    // 2. Detecta la estructura
    const seccionesDetectadas = analizarEstructuraExcel(workbook)
    
    // 3. Crea la plantilla
    const plantilla = await crearPlantillaDesdeExcel(
      seccionesDetectadas,
      nombrePlantilla,
      usuarioId,
      transaction
    )
    
    // 4. Crea el programa y lo vincula con la plantilla
    const programa = await ProgramaAnalitico.create({
      nombre: nombrePrograma,
      datos_tabla: datosExcel,
      usuario_id: usuarioId,
      plantilla_id: plantilla.id // 👈 VINCULA CON PLANTILLA
    }, { transaction })
    
    await transaction.commit()
    return res.status(201).json({ success: true, data: programa })
  } catch (error) {
    await transaction.rollback()
    return res.status(500).json({ success: false, error: error.message })
  }
}
```

---

## 🏗️ FASE 2: Sistema crea Plantilla

### 2.1 Análisis de estructura del Excel
**Función:** `analizarEstructuraExcel()` (líneas 150-250)

```javascript
function analizarEstructuraExcel(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const secciones = []
  
  // Recorre las filas del Excel
  for (let fila = 1; fila <= ultimaFila; fila++) {
    const celda = sheet[`A${fila}`]
    
    // Detecta títulos de secciones (ej: "DATOS GENERALES")
    if (esTituloSeccion(celda)) {
      const seccion = {
        nombre: celda.v,
        tipo: 'tabla', // o 'texto_largo'
        orden: secciones.length + 1,
        campos: []
      }
      
      // Si es tabla, detecta encabezados
      if (esTabla) {
        const filaEncabezados = fila + 1
        for (let col = 1; col <= ultimaColumna; col++) {
          const encabezado = sheet[XLSX.utils.encode_cell({r: filaEncabezados, c: col})]
          seccion.campos.push({
            etiqueta: encabezado.v,
            tipo_campo: 'texto',
            orden: col
          })
        }
      }
      
      secciones.push(seccion)
    }
  }
  
  return secciones
}
```

### 2.2 Creación de la plantilla en BD
**Función:** `crearPlantillaDesdeExcel()` (líneas 21-93)

```javascript
async function crearPlantillaDesdeExcel(seccionesDetectadas, nombrePlantilla, usuarioId, transaction) {
  // 1. Busca o crea la plantilla base
  const [plantilla, created] = await PlantillaPrograma.findOrCreate({
    where: { nombre: nombrePlantilla },
    defaults: {
      nombre: nombrePlantilla,
      descripcion: `Plantilla generada desde Excel: ${nombrePlantilla}`,
      tipo: 'programa_analitico',
      usuario_creador_id: usuarioId
    },
    transaction
  })
  
  // 2. Si ya existe, elimina secciones anteriores
  if (!created) {
    await SeccionPlantilla.destroy({
      where: { plantilla_id: plantilla.id },
      transaction
    })
  }
  
  // 3. Crea las secciones
  for (const seccionData of seccionesDetectadas) {
    const seccion = await SeccionPlantilla.create({
      plantilla_id: plantilla.id,
      nombre: seccionData.nombre,
      descripcion: seccionData.descripcion || '',
      tipo: seccionData.tipo, // 'texto_largo' o 'tabla'
      orden: seccionData.orden,
      obligatoria: true
    }, { transaction })
    
    // 4. Si es tabla, crea los campos (columnas)
    if (seccionData.tipo === 'tabla' && seccionData.campos) {
      for (const campoData of seccionData.campos) {
        await CampoSeccion.create({
          seccion_id: seccion.id,
          etiqueta: campoData.etiqueta, // "Carrera", "Nivel", etc.
          tipo_campo: campoData.tipo_campo || 'texto',
          orden: campoData.orden,
          obligatorio: true
        }, { transaction })
      }
    }
  }
  
  return plantilla
}
```

### 2.3 Resultado en Base de Datos

```sql
-- TABLA: plantillas_programa
INSERT INTO plantillas_programa (nombre, descripcion, tipo, usuario_creador_id)
VALUES ('Programa Analítico - Ingeniería', 'Plantilla generada desde Excel...', 'programa_analitico', 1);

-- TABLA: secciones_plantilla (ID de plantilla: 1)
INSERT INTO secciones_plantilla (plantilla_id, nombre, tipo, orden)
VALUES 
  (1, 'Datos Generales', 'tabla', 1),
  (1, 'Unidades Temáticas', 'tabla', 2),
  (1, 'Metodología', 'texto_largo', 3);

-- TABLA: campos_seccion (Para "Datos Generales" - seccion_id: 1)
INSERT INTO campos_seccion (seccion_id, etiqueta, tipo_campo, orden)
VALUES 
  (1, 'Carrera', 'texto', 1),
  (1, 'Nivel', 'texto', 2),
  (1, 'Paralelo', 'texto', 3),
  (1, 'Asignatura', 'texto', 4),
  (1, 'Código', 'texto', 5);
```

---

## 👨‍🏫 FASE 3: Docente visualiza formularios

### 3.1 Frontend - Página del Docente
**Archivo:** `app/dashboard/docente/programa-analitico/page.tsx`

```typescript
const fetchProgramasAsignados = async () => {
  // 1. Solicita programas disponibles
  const response = await fetch(
    'http://localhost:4000/api/programa-analitico/disponibles',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  )
  
  const data = await response.json()
  
  // 2. Muestra lista de programas
  setProgramas(data.data || [])
}
```

### 3.2 Backend - Endpoint de programas disponibles
**Función:** `exports.getProgramasDisponibles` (líneas 1347-1392)

```javascript
exports.getProgramasDisponibles = async (req, res) => {
  const programas = await ProgramaAnalitico.findAll({
    where: {
      plantilla_id: {
        [Op.ne]: null // Solo programas con plantilla
      }
    },
    include: [
      {
        model: PlantillaPrograma,
        as: 'plantilla',
        attributes: ['id', 'nombre', 'descripcion']
      }
    ],
    order: [['created_at', 'DESC']]
  })
  
  return res.status(200).json({
    success: true,
    data: programas
  })
}
```

### 3.3 Renderizado en Frontend

```typescript
// Muestra tarjetas con programas disponibles
{programas.map((programa) => (
  <Card key={programa.id}>
    <CardHeader>
      <CardTitle>{programa.nombre}</CardTitle>
      <CardDescription>
        📋 Plantilla: {programa.plantilla?.nombre}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Button onClick={() => handleSeleccionarPrograma(programa)}>
        <Edit className="h-4 w-4 mr-2" />
        Completar Formulario
      </Button>
    </CardContent>
  </Card>
))}
```

---

## ✍️ FASE 4: Docente llena formulario

### 4.1 Selección del programa
**Función:** `handleSeleccionarPrograma()` (líneas 148-200)

```typescript
const handleSeleccionarPrograma = async (programa: ProgramaAnalitico) => {
  // 1. Obtiene estructura completa de la plantilla
  const response = await fetch(
    `http://localhost:4000/api/programa-analitico/${programa.id}/plantilla`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  )
  
  const data = await response.json()
  
  // 2. Obtiene contenido previamente guardado (si existe)
  const contenidoResponse = await fetch(
    `http://localhost:4000/api/programa-analitico/${programa.id}/contenido-docente?profesor_id=${profesorId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  )
  
  const contenidoData = await contenidoResponse.json()
  
  // 3. Prepara el programa completo con plantilla y contenido
  const programaCompleto = {
    ...programa,
    plantilla: data.data.plantilla,
    contenido_guardado: contenidoData.success ? contenidoData.data.contenido : {}
  }
  
  setSelectedPrograma(programaCompleto)
  setModoEdicion(true)
}
```

### 4.2 Backend - Endpoint de plantilla
**Función:** `exports.getProgramaConPlantilla` (líneas 950-1040)

```javascript
exports.getProgramaConPlantilla = async (req, res) => {
  const { id } = req.params
  
  const programa = await ProgramaAnalitico.findByPk(id, {
    include: [
      {
        model: PlantillaPrograma,
        as: 'plantilla',
        include: [
          {
            model: SeccionPlantilla,
            as: 'secciones',
            include: [
              {
                model: CampoSeccion,
                as: 'campos',
                order: [['orden', 'ASC']]
              }
            ],
            order: [['orden', 'ASC']]
          }
        ]
      }
    ]
  })
  
  return res.status(200).json({
    success: true,
    data: {
      programa_id: programa.id,
      nombre: programa.nombre,
      plantilla: {
        id: programa.plantilla.id,
        nombre: programa.plantilla.nombre,
        secciones: programa.plantilla.secciones.map(seccion => ({
          id: seccion.id,
          nombre: seccion.nombre,
          tipo: seccion.tipo,
          campos: seccion.campos.map(campo => ({
            id: campo.id,
            etiqueta: campo.etiqueta, // "Carrera", "Nivel", etc.
            tipo_campo: campo.tipo_campo
          }))
        }))
      }
    }
  })
}
```

### 4.3 Componente FormularioDinamico
**Archivo:** `components/programa-analitico/formulario-dinamico.tsx`

#### Renderizado de Datos Generales (líneas 312-350)

```typescript
// La PRIMERA sección tipo 'tabla' se renderiza como formulario simple
{secciones[0] && secciones[0].tipo === 'tabla' && secciones[0].campos && (
  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
    <h4 className="font-semibold text-emerald-900 mb-4">
      {secciones[0].titulo} {/* "Datos Generales" */}
    </h4>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {secciones[0].campos.map((campo: Campo) => {
        const seccionId = secciones[0].id
        const valor = contenido[seccionId]?.filas?.[0]?.valores?.[campo.id] || ''
        
        return (
          <div key={campo.id}>
            <Label>{campo.etiqueta}</Label> {/* "Carrera", "Nivel", etc. */}
            <Input
              value={valor}
              onChange={(e) => {
                handleTablaChange(seccionId, 0, campo.id, e.target.value)
              }}
              placeholder={campo.etiqueta}
            />
          </div>
        )
      })}
    </div>
  </div>
)}
```

**Resultado visual:**
```
┌─────────────────────────────────────────────────┐
│ ✅ Datos Generales                              │
├─────────────────────────────────────────────────┤
│ Carrera: [Input: Ingeniería en Sistemas]       │
│ Nivel: [Input: 3er Nivel]                      │
│ Paralelo: [Input: A]                           │
│ Asignatura: [Input: Programación Web]          │
│ Código: [Input: PROG-301]                      │
└─────────────────────────────────────────────────┘
```

#### Renderizado de otras secciones (líneas 350-440)

```typescript
// Las demás secciones se muestran en TABS
<Tabs>
  {seccionesParaTabs.map((seccion) => (
    <TabsContent value={seccion.titulo}>
      {seccion.tipo === 'texto_largo' 
        ? renderSeccionTextoLargo(seccion)
        : renderSeccionTabla(seccion)
      }
    </TabsContent>
  ))}
</Tabs>
```

---

## 💾 FASE 5: Sistema guarda contenido

### 5.1 Frontend - Envío del contenido
**Función:** `handleGuardarContenido()` (líneas 110-145)

```typescript
const handleGuardarContenido = async (programaId: number, contenido: Record<string, any>) => {
  setSaving(true)
  
  // Contenido tiene esta estructura:
  const contenidoEjemplo = {
    "1": { // Sección "Datos Generales"
      tipo: "tabla",
      filas: [
        {
          valores: {
            "1": "Ingeniería en Sistemas", // Campo ID 1: Carrera
            "2": "3er Nivel",               // Campo ID 2: Nivel
            "3": "A",                       // Campo ID 3: Paralelo
            "4": "Programación Web",        // Campo ID 4: Asignatura
            "5": "PROG-301"                 // Campo ID 5: Código
          }
        }
      ]
    },
    "2": { // Sección "Unidades Temáticas"
      tipo: "tabla",
      filas: [
        {
          valores: {
            "6": "Unidad 1",
            "7": "HTML y CSS",
            "8": "10"
          }
        },
        {
          valores: {
            "6": "Unidad 2",
            "7": "JavaScript",
            "8": "15"
          }
        }
      ]
    },
    "3": { // Sección "Metodología"
      tipo: "texto_largo",
      contenido: "La asignatura se desarrollará mediante..."
    }
  }
  
  const response = await fetch(
    `http://localhost:4000/api/programa-analitico/${programaId}/guardar-contenido`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        contenido,
        profesor_id: profesorId
      })
    }
  )
  
  setSaving(false)
  alert('✅ Contenido guardado exitosamente')
}
```

### 5.2 Backend - Guardado en BD
**Función:** `exports.guardarContenidoDocente` (líneas 1043-1220)

```javascript
exports.guardarContenidoDocente = async (req, res) => {
  const transaction = await db.sequelize.transaction()
  
  try {
    const { id } = req.params // ID del programa
    const { contenido } = req.body
    const profesorId = req.usuario?.profesor_id || req.body.profesor_id
    
    // Procesar cada sección del contenido
    for (const [seccionId, datos] of Object.entries(contenido)) {
      const seccionIdNum = parseInt(seccionId)
      
      if (datos.tipo === 'texto_largo') {
        // CASO 1: Sección de texto largo
        const [contenidoExistente] = await ContenidoPrograma.findOrCreate({
          where: {
            programa_id: id,
            seccion_id: seccionIdNum,
            profesor_id: profesorId
          },
          defaults: {
            contenido_texto: datos.contenido || ''
          },
          transaction
        })
        
        // Si ya existe, actualizar
        await contenidoExistente.update({
          contenido_texto: datos.contenido || ''
        }, { transaction })
        
      } else if (datos.tipo === 'tabla') {
        // CASO 2: Sección de tabla
        
        // Crear o obtener registro base en contenido_programa
        const [contenidoExistente] = await ContenidoPrograma.findOrCreate({
          where: {
            programa_id: id,
            seccion_id: seccionIdNum,
            profesor_id: profesorId
          },
          transaction
        })
        
        // Eliminar filas anteriores
        await FilaTablaPrograma.destroy({
          where: { contenido_id: contenidoExistente.id },
          transaction
        })
        
        // Guardar nuevas filas
        if (datos.filas && Array.isArray(datos.filas)) {
          for (let i = 0; i < datos.filas.length; i++) {
            const fila = datos.filas[i]
            
            // Crear fila
            const nuevaFila = await FilaTablaPrograma.create({
              contenido_id: contenidoExistente.id,
              orden: i + 1
            }, { transaction })
            
            // Guardar valores de cada campo
            if (fila.valores && typeof fila.valores === 'object') {
              for (const [campoId, valor] of Object.entries(fila.valores)) {
                await ValorCampoPrograma.create({
                  fila_id: nuevaFila.id,
                  campo_id: parseInt(campoId),
                  valor: valor || ''
                }, { transaction })
              }
            }
          }
        }
      }
    }
    
    await transaction.commit()
    
    return res.status(200).json({
      success: true,
      message: 'Contenido guardado exitosamente'
    })
    
  } catch (error) {
    await transaction.rollback()
    return res.status(500).json({
      success: false,
      message: 'Error al guardar contenido',
      error: error.message
    })
  }
}
```

### 5.3 Resultado en Base de Datos

```sql
-- 1. TABLA: contenido_programa
INSERT INTO contenido_programa (programa_id, seccion_id, profesor_id, contenido_texto)
VALUES 
  (5, 1, 10, NULL),                              -- Sección "Datos Generales" (tipo tabla)
  (5, 2, 10, NULL),                              -- Sección "Unidades Temáticas" (tipo tabla)
  (5, 3, 10, 'La asignatura se desarrollará...'); -- Sección "Metodología" (tipo texto)

-- 2. TABLA: filas_tabla_programa
INSERT INTO filas_tabla_programa (contenido_id, orden)
VALUES 
  (1, 1),  -- Fila 1 de "Datos Generales"
  (2, 1),  -- Fila 1 de "Unidades Temáticas"
  (2, 2);  -- Fila 2 de "Unidades Temáticas"

-- 3. TABLA: valores_campo_programa
INSERT INTO valores_campo_programa (fila_id, campo_id, valor)
VALUES 
  -- Fila 1 de "Datos Generales"
  (1, 1, 'Ingeniería en Sistemas'),  -- Carrera
  (1, 2, '3er Nivel'),                -- Nivel
  (1, 3, 'A'),                        -- Paralelo
  (1, 4, 'Programación Web'),         -- Asignatura
  (1, 5, 'PROG-301'),                 -- Código
  
  -- Fila 1 de "Unidades Temáticas"
  (2, 6, 'Unidad 1'),                 -- Unidad
  (2, 7, 'HTML y CSS'),               -- Tema
  (2, 8, '10'),                       -- Horas
  
  -- Fila 2 de "Unidades Temáticas"
  (3, 6, 'Unidad 2'),
  (3, 7, 'JavaScript'),
  (3, 8, '15');
```

---

## 🔍 Verificación y Debugging

### 6.1 Verificar si hay programas con plantillas

```sql
-- Consulta 1: Programas con plantillas
SELECT 
  pa.id,
  pa.nombre AS programa_nombre,
  pp.nombre AS plantilla_nombre,
  pa.created_at
FROM programas_analiticos pa
INNER JOIN plantillas_programa pp ON pa.plantilla_id = pp.id
ORDER BY pa.created_at DESC;
```

### 6.2 Verificar estructura de una plantilla

```sql
-- Consulta 2: Estructura completa de una plantilla
SELECT 
  pp.nombre AS plantilla,
  sp.orden,
  sp.nombre AS seccion,
  sp.tipo,
  cs.etiqueta AS campo,
  cs.tipo_campo
FROM plantillas_programa pp
INNER JOIN secciones_plantilla sp ON pp.id = sp.plantilla_id
LEFT JOIN campos_seccion cs ON sp.id = cs.seccion_id
WHERE pp.id = 1
ORDER BY sp.orden, cs.orden;
```

### 6.3 Verificar contenido guardado por un docente

```sql
-- Consulta 3: Contenido llenado por un docente
SELECT 
  pa.nombre AS programa,
  sp.nombre AS seccion,
  sp.tipo,
  cp.contenido_texto,
  cs.etiqueta AS campo,
  vcp.valor
FROM contenido_programa cp
INNER JOIN programas_analiticos pa ON cp.programa_id = pa.id
INNER JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
LEFT JOIN filas_tabla_programa ftp ON cp.id = ftp.contenido_id
LEFT JOIN valores_campo_programa vcp ON ftp.id = vcp.fila_id
LEFT JOIN campos_seccion cs ON vcp.campo_id = cs.id
WHERE cp.profesor_id = 10  -- ID del profesor
ORDER BY sp.orden, ftp.orden, cs.orden;
```

### 6.4 Logs de debugging en el código

#### Backend:
```javascript
// programaAnaliticoController.js

console.log('📤 UPLOAD EXCEL - Iniciando...');
console.log('📄 Archivo recibido:', file.originalname);
console.log('🔍 Secciones detectadas:', seccionesDetectadas.length);
console.log('✅ Plantilla creada:', plantilla.id);
console.log('💾 Guardando contenido para programa:', id);
console.log('✅ Contenido guardado exitosamente');
```

#### Frontend:
```typescript
// page.tsx

console.log('🔍 Obteniendo programas analíticos disponibles...');
console.log('📦 Data recibida:', data);
console.log('✅ Programas asignados cargados:', data.data?.length);
console.log('🔍 Cargando estructura de plantilla para programa:', programa.id);
console.log('📦 Datos de plantilla recibidos:', data);
console.log('💾 Guardando contenido:', contenido);
console.log('📡 Respuesta del servidor:', data);
```

### 6.5 Errores comunes y soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `plantilla_id is null` | No se creó plantilla al subir Excel | Verificar función `crearPlantillaDesdeExcel()` |
| `campos is undefined` | Sección no tiene campos en BD | Verificar que `CampoSeccion` se crea para secciones tipo tabla |
| `contenido_programa vacío` | No se guardó contenido | Verificar `guardarContenidoDocente()` con logs |
| `404 en /disponibles` | Ruta no registrada | Verificar `routes/index.js` y `programaAnaliticoRoutes.js` |
| `Op is not defined` | Falta import de Sequelize.Op | Agregar: `const { Op } = require('sequelize')` |

---

## 📊 Diagrama del Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                      ADMINISTRADOR                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ 1. Sube Excel
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND: uploadExcel()                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ analizarEstructuraExcel()                              │    │
│  │   ├─ Detecta secciones ("Datos Generales", etc.)      │    │
│  │   └─ Detecta campos ("Carrera", "Nivel", etc.)        │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ crearPlantillaDesdeExcel()                             │    │
│  │   ├─ Crea PlantillaPrograma                            │    │
│  │   ├─ Crea SeccionPlantilla (por cada sección)         │    │
│  │   └─ Crea CampoSeccion (por cada columna de tabla)    │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Crea ProgramaAnalitico con plantilla_id                │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BASE DE DATOS                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │plantillas_programa│─▶│secciones_plantilla│─▶│campos_seccion│ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│           │                                                      │
│           │ plantilla_id                                         │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │programas_analiticos│                                         │
│  └──────────────────┘                                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ 2. Docente consulta programas
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DOCENTE - Frontend                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ fetchProgramasAsignados()                              │    │
│  │   └─ GET /disponibles                                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Muestra lista de programas disponibles                 │    │
│  │   ├─ Programa 1: "Prog. Analítico - Ingeniería"       │    │
│  │   └─ Programa 2: "Prog. Analítico - Medicina"         │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            │ 3. Selecciona programa              │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ handleSeleccionarPrograma()                            │    │
│  │   ├─ GET /:id/plantilla → Obtiene estructura          │    │
│  │   └─ GET /:id/contenido-docente → Contenido guardado  │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ FormularioDinamico                                     │    │
│  │   ├─ Renderiza "Datos Generales" (campos simples)     │    │
│  │   ├─ Renderiza "Unidades Temáticas" (tabla)           │    │
│  │   └─ Renderiza "Metodología" (textarea)               │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            │ 4. Llena formulario                 │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ handleGuardarContenido()                               │    │
│  │   └─ POST /:id/guardar-contenido                      │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND: guardarContenidoDocente()                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Para cada sección:                                     │    │
│  │   ├─ Si tipo='texto_largo':                            │    │
│  │   │     └─ Guarda en contenido_programa.contenido_texto│    │
│  │   │                                                     │    │
│  │   └─ Si tipo='tabla':                                  │    │
│  │         ├─ Crea registro en contenido_programa         │    │
│  │         ├─ Crea filas en filas_tabla_programa          │    │
│  │         └─ Guarda valores en valores_campo_programa    │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BASE DE DATOS                                  │
│  ┌──────────────────┐  ┌──────────────────────┐                │
│  │contenido_programa│─▶│filas_tabla_programa  │                │
│  └──────────────────┘  └──────────┬───────────┘                │
│                                    │                             │
│                                    ▼                             │
│                        ┌──────────────────────┐                 │
│                        │valores_campo_programa│                 │
│                        └──────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Verificación

### Backend:
- [ ] Modelo `PlantillaPrograma` existe en `models/index.js`
- [ ] Modelo `SeccionPlantilla` existe en `models/index.js`
- [ ] Modelo `CampoSeccion` existe en `models/index.js`
- [ ] Asociaciones definidas correctamente
- [ ] Ruta `/programa-analitico` registrada en `routes/index.js`
- [ ] Endpoint `POST /upload` existe
- [ ] Endpoint `GET /disponibles` existe
- [ ] Endpoint `GET /:id/plantilla` existe
- [ ] Endpoint `POST /:id/guardar-contenido` existe
- [ ] Función `crearPlantillaDesdeExcel()` implementada
- [ ] Función `guardarContenidoDocente()` implementada
- [ ] Logs de debugging activos

### Frontend:
- [ ] Página `app/dashboard/docente/programa-analitico/page.tsx` existe
- [ ] Función `fetchProgramasAsignados()` llama a `/disponibles`
- [ ] Función `handleSeleccionarPrograma()` obtiene plantilla
- [ ] Componente `FormularioDinamico` renderiza secciones
- [ ] Primera sección se renderiza como campos simples
- [ ] Otras secciones se renderizan en tabs
- [ ] Función `handleGuardarContenido()` envía a backend
- [ ] Logs de debugging en consola

### Base de Datos:
- [ ] Tabla `plantillas_programa` existe
- [ ] Tabla `secciones_plantilla` existe
- [ ] Tabla `campos_seccion` existe
- [ ] Tabla `contenido_programa` existe
- [ ] Tabla `filas_tabla_programa` existe
- [ ] Tabla `valores_campo_programa` existe
- [ ] Migraciones ejecutadas

---

## 🚀 Próximos Pasos

1. **Verificar backend:** Asegurarse de que el servidor esté corriendo en puerto 4000
2. **Probar upload:** Subir un Excel como administrador
3. **Verificar BD:** Consultar si se creó la plantilla
4. **Probar docente:** Abrir página del docente y verificar que aparezcan programas
5. **Llenar formulario:** Completar un formulario como docente
6. **Verificar guardado:** Consultar tablas de contenido en BD

---

**Última actualización:** 6 de diciembre de 2025
**Autor:** Sistema de Gestión Académica UNESUM
