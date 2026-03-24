# Flujo Completo: Subir Excel → Crear Plantilla → Docentes Llenan Formulario

## 🎯 Objetivo

Cuando el administrador sube un archivo Excel de programa analítico, el sistema:
1. ✅ Detecta automáticamente la estructura (secciones y campos)
2. ✅ Crea una plantilla reutilizable en la base de datos
3. ✅ Vincula el programa con esa plantilla
4. ✅ Los docentes pueden ver y llenar esa estructura dinámica

---

## 📋 Flujo Paso a Paso

### 1️⃣ Administrador Sube Excel

**Endpoint:** `POST /api/programa-analitico/upload`

**Archivo:** El admin sube el Excel con la estructura del programa analítico

**Ejemplo de estructura del Excel:**
```
PROGRAMA ANALÍTICO DE ASIGNATURA

ASIGNATURA          | Programación Avanzada
NIVEL              | 3
PERIODO ACADÉMICO  | 2024-2025

CARACTERIZACIÓN
[Texto largo describiendo la asignatura...]

OBJETIVOS DE LA ASIGNATURA
[Texto largo con los objetivos...]

COMPETENCIAS
[Lista de competencias...]

CONTENIDOS DE LA ASIGNATURA
┌──────────┬─────────────┬──────────────┬──────────────┬──────────────┐
│ UNIDADES │ CONTENIDOS  │ HORAS CLASE  │ HORAS PRÁC.  │ HORAS AUTÓN. │
│ TEMÁTICAS│             │              │              │              │
├──────────┼─────────────┼──────────────┼──────────────┼──────────────┤
│ Unidad 1 │ Intro POO   │ 8            │ 12           │ 20           │
│ Unidad 2 │ Herencia    │ 10           │ 15           │ 25           │
└──────────┴─────────────┴──────────────┴──────────────┴──────────────┘

METODOLOGÍA
[Texto largo con metodologías...]

BIBLIOGRAFÍA - FUENTES
┌──────────┬─────────┬───────┬─────────┬──────────┐
│ AUTOR    │ TÍTULO  │ AÑO   │ EDICIÓN │ TIPO     │
├──────────┼─────────┼───────┼─────────┼──────────┤
│ Deitel   │ Java... │ 2020  │ 10ma    │ Básica   │
└──────────┴─────────┴───────┴─────────┴──────────┘
```

---

### 2️⃣ Sistema Detecta la Estructura

**Función:** `detectarSecciones()`

El sistema analiza el Excel y detecta:

**Secciones Tipo Texto Largo:**
- CARACTERIZACIÓN
- OBJETIVOS DE LA ASIGNATURA
- COMPETENCIAS
- RESULTADOS DE APRENDIZAJE
- METODOLOGÍA
- PROCEDIMIENTOS DE EVALUACIÓN
- BIBLIOGRAFÍA BÁSICA
- BIBLIOGRAFÍA COMPLEMENTARIA

**Secciones Tipo Tabla:**
- CONTENIDOS DE LA ASIGNATURA
  - Campos: UNIDADES TEMÁTICAS, DESCRIPCIÓN, HORAS CLASE, etc.
- BIBLIOGRAFÍA - FUENTES
  - Campos: AUTOR, TÍTULO, AÑO, EDICIÓN, TIPO

**Resultado:**
```javascript
seccionesDetectadas = [
  {
    titulo: "CARACTERIZACIÓN",
    tipo: "texto_largo",
    encabezados: [],
    datos: [...]
  },
  {
    titulo: "CONTENIDOS DE LA ASIGNATURA",
    tipo: "tabla",
    encabezados: ["UNIDADES TEMÁTICAS", "DESCRIPCIÓN", "HORAS CLASE", "HORAS PRÁCTICAS", "HORAS AUTÓNOMAS"],
    datos: [
      ["Unidad 1", "Intro POO", "8", "12", "20"],
      ["Unidad 2", "Herencia", "10", "15", "25"]
    ]
  },
  ...
]
```

---

### 3️⃣ Sistema Crea Plantilla Automáticamente

**Función:** `crearPlantillaDesdeExcel()`

**¿Qué hace?**

1. **Busca si ya existe una plantilla** con el mismo nombre
   - Si existe: Elimina las secciones viejas y las reemplaza
   - Si NO existe: Crea una nueva plantilla

2. **Crea la plantilla:**
```sql
INSERT INTO plantillas_programa (nombre, descripcion, tipo, activa, usuario_creador_id)
VALUES ('Plantilla Programación Avanzada', 'Generada automáticamente desde Excel', 'excel_import', true, 1);
-- Resultado: plantilla_id = 5
```

3. **Crea las secciones:**
```sql
-- Sección 1: Texto Largo
INSERT INTO secciones_plantilla (plantilla_id, nombre, descripcion, tipo, orden, obligatoria)
VALUES (5, 'CARACTERIZACIÓN', 'Sección tipo texto largo', 'texto_largo', 1, true);
-- Resultado: seccion_id = 10

-- Sección 2: Tabla
INSERT INTO secciones_plantilla (plantilla_id, nombre, descripcion, tipo, orden, obligatoria)
VALUES (5, 'CONTENIDOS DE LA ASIGNATURA', 'Sección tipo tabla', 'tabla', 2, true);
-- Resultado: seccion_id = 11
```

4. **Crea los campos de las tablas:**
```sql
-- Para la sección "CONTENIDOS DE LA ASIGNATURA"
INSERT INTO campos_seccion (seccion_id, etiqueta, tipo_campo, orden, obligatorio)
VALUES 
  (11, 'UNIDADES TEMÁTICAS', 'texto', 1, false),
  (11, 'DESCRIPCIÓN', 'texto', 2, false),
  (11, 'HORAS CLASE', 'texto', 3, false),
  (11, 'HORAS PRÁCTICAS', 'texto', 4, false),
  (11, 'HORAS AUTÓNOMAS', 'texto', 5, false);
```

**Console logs durante el proceso:**
```
🚀 Creando plantilla desde estructura del Excel...
✅ Plantilla creada: Plantilla Programación Avanzada (ID: 5)
  📝 Sección creada: CARACTERIZACIÓN (texto_largo)
  📝 Sección creada: OBJETIVOS DE LA ASIGNATURA (texto_largo)
  📝 Sección creada: COMPETENCIAS (texto_largo)
  📝 Sección creada: CONTENIDOS DE LA ASIGNATURA (tabla)
    🔹 Campo creado: UNIDADES TEMÁTICAS
    🔹 Campo creado: DESCRIPCIÓN
    🔹 Campo creado: HORAS CLASE
    🔹 Campo creado: HORAS PRÁCTICAS
    🔹 Campo creado: HORAS AUTÓNOMAS
  📝 Sección creada: METODOLOGÍA (texto_largo)
  📝 Sección creada: BIBLIOGRAFÍA - FUENTES (tabla)
    🔹 Campo creado: AUTOR
    🔹 Campo creado: TÍTULO
    🔹 Campo creado: AÑO
    🔹 Campo creado: EDICIÓN
    🔹 Campo creado: TIPO
✅ Plantilla procesada exitosamente (ID: 5)
```

---

### 4️⃣ Sistema Crea el Programa y lo Vincula con la Plantilla

**Datos guardados en `programas_analiticos`:**
```javascript
{
  id: 123,
  nombre: "Programación Avanzada",
  plantilla_id: 5,  // 🔗 VINCULADO CON LA PLANTILLA
  carrera: "Ingeniería en Software",
  nivel: "3",
  asignatura: "Programación Avanzada",
  periodo_academico: "2024-2025",
  datos_tabla: {
    // Datos originales del Excel
    archivo_excel: "programa_123456_template.xlsx",
    secciones_completas: [...],
    secciones_formulario: [
      {
        titulo: "CARACTERIZACIÓN",
        tipo: "texto_largo",
        campos: []
      },
      {
        titulo: "CONTENIDOS DE LA ASIGNATURA",
        tipo: "tabla",
        campos: ["UNIDADES TEMÁTICAS", "DESCRIPCIÓN", ...]
      }
    ]
  }
}
```

**Respuesta del API:**
```json
{
  "success": true,
  "message": "Programa analítico cargado exitosamente con plantilla dinámica",
  "data": {
    "id": 123,
    "plantilla_id": 5,
    "plantilla_nombre": "Plantilla Programación Avanzada",
    "archivo_excel": "programa_123456_template.xlsx",
    "secciones_detectadas": 8,
    "secciones": [
      {
        "nombre": "CARACTERIZACIÓN",
        "tipo": "texto_largo",
        "num_campos": 0
      },
      {
        "nombre": "CONTENIDOS DE LA ASIGNATURA",
        "tipo": "tabla",
        "num_campos": 5
      },
      ...
    ]
  }
}
```

---

### 5️⃣ Administrador Asigna Programa a Docente

El admin asigna el programa creado a un docente específico:

```sql
INSERT INTO asignaciones_programa_docente (
  programa_id, 
  profesor_id, 
  asignatura_id, 
  nivel_id, 
  paralelo_id, 
  periodo_id, 
  estado, 
  fecha_asignacion
) VALUES (
  123,  -- El programa creado
  45,   -- ID del docente
  12,   -- ID de la asignatura
  3,    -- ID del nivel
  1,    -- ID del paralelo
  5,    -- ID del periodo
  'pendiente',
  NOW()
);
```

---

### 6️⃣ Docente Accede al Programa

**Ruta:** `/dashboard/docente/programa-analitico`

1. **Docente ve programas asignados:**
   - El sistema llama a `GET /api/programa-analitico/mis-programas`
   - Muestra lista de programas asignados

2. **Docente selecciona un programa:**
   - Click en "Completar"
   - Sistema llama a `GET /api/programa-analitico/:id/plantilla`

3. **Sistema carga estructura de la plantilla:**

**Request:**
```
GET /api/programa-analitico/123/plantilla
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "nombre": "Programación Avanzada",
    "carrera": "Ingeniería en Software",
    "nivel": "3",
    "asignatura": "Programación Avanzada",
    "periodo_academico": "2024-2025",
    "plantilla": {
      "id": 5,
      "nombre": "Plantilla Programación Avanzada",
      "descripcion": "Generada automáticamente desde Excel",
      "tipo": "excel_import",
      "secciones": [
        {
          "id": 10,
          "nombre": "CARACTERIZACIÓN",
          "descripcion": "Sección tipo texto largo",
          "tipo": "texto_largo",
          "orden": 1,
          "obligatoria": true,
          "campos": []
        },
        {
          "id": 11,
          "nombre": "CONTENIDOS DE LA ASIGNATURA",
          "descripcion": "Sección tipo tabla",
          "tipo": "tabla",
          "orden": 2,
          "obligatoria": true,
          "campos": [
            {
              "id": 50,
              "etiqueta": "UNIDADES TEMÁTICAS",
              "tipo_campo": "texto",
              "orden": 1,
              "obligatorio": false
            },
            {
              "id": 51,
              "etiqueta": "DESCRIPCIÓN",
              "tipo_campo": "texto",
              "orden": 2,
              "obligatorio": false
            },
            {
              "id": 52,
              "etiqueta": "HORAS CLASE",
              "tipo_campo": "texto",
              "orden": 3,
              "obligatorio": false
            }
          ]
        }
      ]
    }
  }
}
```

4. **Sistema también carga contenido previo (si existe):**

**Request:**
```
GET /api/programa-analitico/123/contenido-docente?profesor_id=45
```

**Response:**
```json
{
  "success": true,
  "data": {
    "programa_id": 123,
    "profesor_id": 45,
    "contenido": {
      "10": {  // seccion_id
        "tipo": "texto_largo",
        "nombre": "CARACTERIZACIÓN",
        "contenido": "Esta asignatura tiene como objetivo..."
      },
      "11": {  // seccion_id
        "tipo": "tabla",
        "nombre": "CONTENIDOS DE LA ASIGNATURA",
        "filas": [
          {
            "orden": 1,
            "valores": {
              "50": "Unidad 1",  // campo_id: valor
              "51": "Introducción a POO",
              "52": "8"
            }
          }
        ]
      }
    }
  }
}
```

---

### 7️⃣ Docente Ve el Formulario Dinámico

**Componente:** `FormularioDinamico`

El componente renderiza automáticamente:

**Para Secciones Tipo Texto Largo:**
```jsx
<div>
  <h4>CARACTERIZACIÓN *</h4>
  <Textarea 
    value={contenido[10]?.contenido || ''}
    onChange={(e) => handleChange(10, 'contenido', e.target.value)}
    rows={8}
  />
</div>
```

**Para Secciones Tipo Tabla:**
```jsx
<div>
  <h4>CONTENIDOS DE LA ASIGNATURA *</h4>
  <Button onClick={() => agregarFila(11)}>Agregar Fila</Button>
  
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>#</TableHead>
        <TableHead>UNIDADES TEMÁTICAS</TableHead>
        <TableHead>DESCRIPCIÓN</TableHead>
        <TableHead>HORAS CLASE</TableHead>
        <TableHead>Acciones</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {filas.map((fila, idx) => (
        <TableRow key={idx}>
          <TableCell>{idx + 1}</TableCell>
          <TableCell>
            <Input 
              value={fila.valores[50] || ''} 
              onChange={(e) => handleChange(11, idx, 50, e.target.value)}
            />
          </TableCell>
          <TableCell>
            <Input 
              value={fila.valores[51] || ''} 
              onChange={(e) => handleChange(11, idx, 51, e.target.value)}
            />
          </TableCell>
          <TableCell>
            <Input 
              value={fila.valores[52] || ''} 
              onChange={(e) => handleChange(11, idx, 52, e.target.value)}
            />
          </TableCell>
          <TableCell>
            <Button onClick={() => eliminarFila(11, idx)}>
              <Trash2 />
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

---

### 8️⃣ Docente Llena y Guarda el Formulario

**Estado del formulario en el frontend:**
```javascript
{
  "10": {  // seccion_id de CARACTERIZACIÓN
    "tipo": "texto_largo",
    "contenido": "Esta asignatura permite al estudiante..."
  },
  "11": {  // seccion_id de CONTENIDOS
    "tipo": "tabla",
    "filas": [
      {
        "valores": {
          "50": "Unidad 1",  // campo_id: UNIDADES TEMÁTICAS
          "51": "Introducción a POO",  // campo_id: DESCRIPCIÓN
          "52": "8",  // campo_id: HORAS CLASE
          "53": "12",  // campo_id: HORAS PRÁCTICAS
          "54": "20"  // campo_id: HORAS AUTÓNOMAS
        }
      },
      {
        "valores": {
          "50": "Unidad 2",
          "51": "Herencia y Polimorfismo",
          "52": "10",
          "53": "15",
          "54": "25"
        }
      }
    ]
  }
}
```

**Request de guardado:**
```
POST /api/programa-analitico/123/guardar-contenido
Authorization: Bearer <token>
Content-Type: application/json

{
  "profesor_id": 45,
  "contenido": {
    "10": {
      "tipo": "texto_largo",
      "contenido": "Esta asignatura permite..."
    },
    "11": {
      "tipo": "tabla",
      "filas": [...]
    }
  }
}
```

---

### 9️⃣ Sistema Guarda en Base de Datos

**Tabla: `contenido_programa`**
```sql
INSERT INTO contenido_programa (programa_id, seccion_id, profesor_id, contenido_texto)
VALUES 
  (123, 10, 45, 'Esta asignatura permite al estudiante...'),
  (123, 11, 45, NULL);  -- Para tablas, contenido_texto es NULL
```

**Tabla: `filas_tabla_programa`**
```sql
INSERT INTO filas_tabla_programa (contenido_id, orden)
VALUES 
  (1001, 1),  -- Fila 1 de la tabla CONTENIDOS
  (1001, 2);  -- Fila 2 de la tabla CONTENIDOS
```

**Tabla: `valores_campo_programa`**
```sql
INSERT INTO valores_campo_programa (fila_id, campo_id, valor)
VALUES 
  -- Fila 1
  (5001, 50, 'Unidad 1'),
  (5001, 51, 'Introducción a POO'),
  (5001, 52, '8'),
  (5001, 53, '12'),
  (5001, 54, '20'),
  -- Fila 2
  (5002, 50, 'Unidad 2'),
  (5002, 51, 'Herencia y Polimorfismo'),
  (5002, 52, '10'),
  (5002, 53, '15'),
  (5002, 54, '25');
```

**Actualización de estado:**
```sql
UPDATE asignaciones_programa_docente 
SET 
  estado = 'en_progreso',
  fecha_ultima_modificacion = NOW()
WHERE programa_id = 123 AND profesor_id = 45;
```

---

## 🔄 Diagrama del Flujo Completo

```
┌─────────────────┐
│ ADMIN SUBE      │
│ EXCEL           │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ SISTEMA DETECTA ESTRUCTURA          │
│                                     │
│ ✓ Secciones (texto_largo/tabla)    │
│ ✓ Encabezados de tablas             │
│ ✓ Datos de cada sección             │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ CREAR/ACTUALIZAR PLANTILLA          │
│                                     │
│ 1. plantillas_programa              │
│ 2. secciones_plantilla              │
│ 3. campos_seccion                   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ CREAR PROGRAMA Y VINCULARLO         │
│                                     │
│ programas_analiticos {              │
│   plantilla_id: 5 ← VINCULADO      │
│ }                                   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ ADMIN ASIGNA A DOCENTE              │
│                                     │
│ asignaciones_programa_docente       │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ DOCENTE ACCEDE AL PROGRAMA          │
│                                     │
│ GET /plantilla                      │
│ GET /contenido-docente              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ FORMULARIO DINÁMICO SE RENDERIZA    │
│                                     │
│ ✓ Secciones de texto → Textarea     │
│ ✓ Secciones de tabla → Table        │
│ ✓ Campos según plantilla            │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ DOCENTE LLENA Y GUARDA              │
│                                     │
│ POST /guardar-contenido             │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ DATOS GUARDADOS EN BD               │
│                                     │
│ ✓ contenido_programa                │
│ ✓ filas_tabla_programa              │
│ ✓ valores_campo_programa            │
└─────────────────────────────────────┘
```

---

## 🧪 Cómo Probar

### 1. Preparar un Excel de Prueba

Usa el ejemplo proporcionado al inicio de este documento o el archivo adjunto `syllabus-prueba.xlsx`

### 2. Subir el Excel

```bash
# Con curl
curl -X POST http://localhost:4000/api/programa-analitico/upload \
  -H "Authorization: Bearer <tu-token>" \
  -F "excel=@ruta/al/archivo.xlsx"

# O usar Postman/Insomnia/Thunder Client
# O usar la interfaz web
```

### 3. Verificar en la Base de Datos

```sql
-- Ver plantilla creada
SELECT * FROM plantillas_programa ORDER BY id DESC LIMIT 1;

-- Ver secciones de la plantilla
SELECT * FROM secciones_plantilla WHERE plantilla_id = <id_plantilla>;

-- Ver campos de las secciones tipo tabla
SELECT 
  sp.nombre as seccion,
  cs.etiqueta as campo,
  cs.tipo_campo,
  cs.orden
FROM campos_seccion cs
JOIN secciones_plantilla sp ON cs.seccion_id = sp.id
WHERE sp.plantilla_id = <id_plantilla>
ORDER BY sp.orden, cs.orden;

-- Ver programa creado con plantilla vinculada
SELECT 
  pa.id,
  pa.nombre,
  pa.plantilla_id,
  pp.nombre as plantilla_nombre
FROM programas_analiticos pa
LEFT JOIN plantillas_programa pp ON pa.plantilla_id = pp.id
ORDER BY pa.id DESC LIMIT 1;
```

### 4. Asignar a un Docente

```sql
INSERT INTO asignaciones_programa_docente (
  programa_id, profesor_id, asignatura_id, nivel_id, 
  paralelo_id, periodo_id, estado, fecha_asignacion
) VALUES (
  <id_programa>, <id_profesor>, <id_asignatura>, <id_nivel>,
  <id_paralelo>, <id_periodo>, 'pendiente', NOW()
);
```

### 5. Probar como Docente

1. Login como docente
2. Ir a `/dashboard/docente/programa-analitico`
3. Seleccionar el programa
4. Verificar que se cargan las secciones y campos correctos
5. Llenar algunos datos
6. Guardar
7. Verificar en la BD que se guardaron correctamente

```sql
-- Ver contenido guardado
SELECT * FROM contenido_programa WHERE programa_id = <id_programa>;

-- Ver filas de tablas
SELECT * FROM filas_tabla_programa WHERE contenido_id IN (
  SELECT id FROM contenido_programa WHERE programa_id = <id_programa>
);

-- Ver valores de campos
SELECT 
  vcp.valor,
  cs.etiqueta as campo
FROM valores_campo_programa vcp
JOIN campos_seccion cs ON vcp.campo_id = cs.id
WHERE vcp.fila_id IN (
  SELECT id FROM filas_tabla_programa WHERE contenido_id IN (
    SELECT id FROM contenido_programa WHERE programa_id = <id_programa>
  )
);
```

---

## ✅ Resumen de Cambios

### Archivos Modificados:

1. **`my-node-backend/src/controllers/programaAnaliticoController.js`**
   - ✅ Agregados imports de modelos: `PlantillaPrograma`, `SeccionPlantilla`, `CampoSeccion`
   - ✅ Nueva función: `crearPlantillaDesdeExcel()`
   - ✅ Modificado `uploadExcel()` para crear plantilla automáticamente
   - ✅ Vincula programa con plantilla (`plantilla_id`)
   - ✅ Usa transacciones para garantizar consistencia

### Funcionalidad Nueva:

- ✅ Detección automática de estructura del Excel
- ✅ Creación automática de plantillas reutilizables
- ✅ Vinculación de programas con plantillas
- ✅ Docentes ven la estructura real del Excel subido
- ✅ Formularios completamente dinámicos basados en BD

### Estado: 🚀 LISTO PARA PROBAR

---

## 🎉 Beneficios

1. **Cero Configuración Manual:** El admin solo sube el Excel y todo se configura automáticamente
2. **Reutilización:** Si suben varios programas con la misma estructura, se actualiza la plantilla
3. **Consistencia:** Todos los docentes ven exactamente la misma estructura
4. **Flexibilidad:** Cada Excel puede tener estructura diferente
5. **Trazabilidad:** Se guarda quién creó cada plantilla y cuándo

---

## 📝 Próximos Pasos Opcionales

1. **Mejorar detección de tipos de campo:** En vez de siempre usar `tipo_campo: 'texto'`, detectar si es número, fecha, etc.
2. **Validaciones automáticas:** Detectar campos obligatorios basándose en el Excel
3. **Plantillas predefinidas:** Permitir al admin elegir entre plantillas existentes o crear nueva
4. **Versiones de plantillas:** Mantener historial de cambios en plantillas
5. **Importar datos del Excel:** Precargar datos de ejemplo del Excel en el formulario del docente
