# 🔄 Carga de Programas Analíticos Existentes desde JSON

## 📅 Fecha: 3 de febrero de 2026

---

## ❓ Pregunta: "¿Actualmente estás extrayendo del JSON programa analítico para ese periodo?"

### ✅ **Respuesta: SÍ, ahora el sistema carga programas existentes del periodo actual**

---

## 🎯 Comportamiento Actual

### **Escenario 1: Crear Nuevo Programa (`nueva=true`)**
```
URL: /crear-programa-analitico?asignatura=31&nueva=true

Flujo:
1. Carga información de asignatura
2. Carga periodos disponibles
3. ✅ INICIALIZA secciones vacías predefinidas
4. Usuario completa campos manualmente o sube Word
5. Guarda como NUEVO programa (POST)
```

### **Escenario 2: Editar Programa Existente (`nueva=false` o sin parámetro)**
```
URL: /crear-programa-analitico?asignatura=31

Flujo:
1. Carga información de asignatura
2. Carga periodos disponibles
3. 🔍 BUSCA programa analítico existente para esa asignatura en periodo actual
4. ✅ Si encuentra: CARGA secciones desde datos_tabla JSON
5. ❌ Si NO encuentra: Inicializa secciones vacías
6. Usuario modifica campos
7. Guarda como ACTUALIZACIÓN (PUT) si existe, o CREAR (POST) si no
```

---

## 📊 Estructura del Flujo de Carga

```
┌─────────────────────────────────────────┐
│  Usuario → Click "Ver Programa"         │
│  (desde Gestión de Asignaturas)        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  cargarDatosIniciales()                 │
├─────────────────────────────────────────┤
│  1. Cargar info asignatura (ID 31)     │
│  2. Cargar periodos académicos         │
│  3. Seleccionar periodo actual         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
         ┌────────┴────────┐
         │  ¿es Nuevo?     │
         └────────┬────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
    [nueva=true]      [nueva=false]
        │                   │
        ▼                   ▼
┌────────────────┐  ┌──────────────────────┐
│ Secciones      │  │ BUSCAR en Backend:   │
│ Vacías         │  │ /api/programa-analitico│
│ (Predefinidas) │  │ ?asignatura_id=31    │
└────────────────┘  └──────────┬───────────┘
                               │
                    ┌──────────┴──────────┐
                    │  ¿Existe programa?  │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                [SÍ EXISTE]          [NO EXISTE]
                    │                     │
                    ▼                     ▼
         ┌─────────────────────┐  ┌────────────────┐
         │ CARGAR JSON:        │  │ Secciones      │
         │ datos_tabla →       │  │ Vacías         │
         │ secciones[]         │  └────────────────┘
         │ ✅ EDITAR MODO      │
         └─────────────────────┘
```

---

## 🔍 Código de Búsqueda de Programa Existente

### **Frontend: cargarDatosIniciales()**

```typescript
// 🔍 SI NO ES NUEVO, BUSCAR PROGRAMA ANALÍTICO EXISTENTE
if (!esNuevo && asignaturaId) {
  console.log('🔍 Buscando programa analítico existente para asignatura:', asignaturaId)
  
  const resProgramas = await fetch(
    `${API_URL}/api/programa-analitico?asignatura_id=${asignaturaId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  )

  if (resProgramas.ok) {
    const dataProgramas = await resProgramas.json()
    const programasArray = dataProgramas?.data || []
    
    // Buscar programa del periodo actual
    const periodoActual = periodosArray.find(p => p.es_actual)
    const programaDelPeriodo = programasArray.find(p => 
      p.asignatura_id == asignaturaId && 
      p.periodo === periodoActual?.nombre
    )

    if (programaDelPeriodo) {
      console.log('✅ Programa encontrado:', programaDelPeriodo)
      
      // Guardar referencia del programa existente
      setProgramaExistente(programaDelPeriodo)
      setNombrePrograma(programaDelPeriodo.nombre)
      
      // 📋 CARGAR SECCIONES DEL JSON
      if (programaDelPeriodo.datos_tabla) {
        const datosTabla = typeof programaDelPeriodo.datos_tabla === 'string' 
          ? JSON.parse(programaDelPeriodo.datos_tabla) 
          : programaDelPeriodo.datos_tabla

        if (datosTabla.secciones && Array.isArray(datosTabla.secciones)) {
          console.log('📋 Cargando secciones existentes:', datosTabla.secciones.length)
          setSecciones(datosTabla.secciones)
          return // ✅ SALIR - Ya cargamos el programa
        }
      }
    }
  }
}

// Si llegamos aquí, crear secciones vacías
setSecciones(seccionesPredefinidas.map(nombre => ({
  nombre,
  campos: [{ titulo: "", valor: "" }]
})))
```

---

## 📊 Formato del JSON Cargado

### **Estructura en Base de Datos**
```sql
SELECT id, nombre, periodo, asignatura_id, datos_tabla
FROM programas_analiticos
WHERE asignatura_id = 31 
  AND periodo = '2025-2026'
  AND es_eliminado = false
```

### **Resultado:**
```json
{
  "id": 123,
  "nombre": "Programa Analítico de Programación I",
  "periodo": "2025-2026",
  "asignatura_id": 31,
  "datos_tabla": {
    "version": "3.0",
    "tipo": "programa_analitico_acordeon",
    "secciones": [
      {
        "nombre": "ASIGNATURA",
        "campos": [
          {
            "titulo": "Nombre",
            "valor": "Programación I"
          },
          {
            "titulo": "Código",
            "valor": "INFO-101"
          }
        ]
      },
      {
        "nombre": "CARACTERIZACIÓN",
        "campos": [
          {
            "titulo": "",
            "valor": "Esta asignatura introduce los fundamentos..."
          }
        ]
      }
    ],
    "metadata": {
      "asignatura": "Programación I",
      "periodo": "2025-2026",
      "nivel": "I",
      "createdAt": "2026-02-02T10:00:00Z",
      "updatedAt": "2026-02-03T15:30:00Z"
    }
  }
}
```

### **Conversión a Estado de React:**
```typescript
// datos_tabla.secciones → setSecciones()
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

---

## 🎨 Renderizado de Acordeones con Datos Cargados

```tsx
<Accordion type="multiple">
  {secciones.map((seccion, idx) => (
    <AccordionItem key={idx} value={`section-${idx}`}>
      <AccordionTrigger>{seccion.nombre}</AccordionTrigger>
      <AccordionContent>
        {seccion.campos.map((campo, campoIdx) => (
          <div key={campoIdx}>
            <Input 
              value={campo.titulo} 
              onChange={(e) => actualizarCampo(idx, campoIdx, 'titulo', e.target.value)}
              placeholder="Título del campo"
            />
            <Textarea 
              value={campo.valor}
              onChange={(e) => actualizarCampo(idx, campoIdx, 'valor', e.target.value)}
              placeholder="Contenido"
            />
          </div>
        ))}
        <Button onClick={() => agregarCampo(idx)}>
          + Agregar campo
        </Button>
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

---

## 💾 Guardado: POST vs PUT

### **Función handleGuardar()**

```typescript
const handleGuardar = async () => {
  // Determinar si es CREAR o ACTUALIZAR
  const esActualizacion = programaExistente && programaExistente.id
  const metodo = esActualizacion ? "PUT" : "POST"
  const url = esActualizacion 
    ? `/api/programa-analitico/${programaExistente.id}`
    : `/api/programa-analitico`

  const payload = {
    nombre: nombrePrograma,
    periodo: periodoSeleccionado,
    materias: asignatura?.nombre,
    asignatura_id: asignaturaId,
    datos_tabla: {
      version: "3.0",
      tipo: "programa_analitico_acordeon",
      secciones: secciones,
      metadata: {
        asignatura: asignatura?.nombre,
        periodo: periodoSeleccionado,
        nivel: asignatura?.nivel?.nombre,
        createdAt: programaExistente?.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  }

  const response = await fetch(url, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })

  if (response.ok) {
    alert(`✅ Programa ${esActualizacion ? 'actualizado' : 'creado'} exitosamente`)
    router.push("/dashboard/comision/asignaturas")
  }
}
```

### **Backend: Endpoints**

#### **POST /api/programa-analitico** (Crear Nuevo)
```javascript
exports.create = async (req, res) => {
  const { nombre, periodo, materias, asignatura_id, datos_tabla } = req.body
  
  // Validar duplicados
  if (asignatura_id) {
    const existente = await ProgramaAnalitico.findOne({
      where: { usuario_id, periodo, asignatura_id, es_eliminado: false }
    })
    
    if (existente) {
      return res.status(409).json({ 
        message: 'Ya existe un programa para esta asignatura en este periodo' 
      })
    }
  }
  
  // Crear
  const nuevo = await ProgramaAnalitico.create({
    nombre, periodo, materias, asignatura_id, datos_tabla, usuario_id
  })
  
  return res.status(201).json({ success: true, data: nuevo })
}
```

#### **PUT /api/programa-analitico/:id** (Actualizar Existente)
```javascript
exports.update = async (req, res) => {
  const { id } = req.params
  const programa = await ProgramaAnalitico.findByPk(id)
  
  if (!programa) {
    return res.status(404).json({ message: 'Programa no encontrado' })
  }
  
  // Verificar permisos
  if (programa.usuario_id !== userId && userRol !== 'administrador') {
    return res.status(403).json({ message: 'Sin permisos' })
  }
  
  // Actualizar
  await programa.update(req.body)
  
  return res.status(200).json({ success: true, data: programa })
}
```

---

## 🔄 Casos de Uso Completos

### **Caso 1: Primera Vez - Crear Programa**
```
1. Usuario: Click "Crear Programa" en asignatura Programación I
2. URL: /crear-programa-analitico?asignatura=31&nueva=true
3. Sistema: 
   - Carga asignatura ID 31
   - Carga periodos (actual: 2025-2026)
   - Inicializa secciones vacías
4. Usuario: Completa campos o sube Word
5. Usuario: Click "Guardar"
6. Sistema: POST /api/programa-analitico
7. BD: Crea nuevo registro con datos_tabla JSON
```

### **Caso 2: Editar Programa Existente**
```
1. Usuario: Click "Ver Programa" en asignatura Programación I
2. URL: /crear-programa-analitico?asignatura=31
3. Sistema:
   - Carga asignatura ID 31
   - Carga periodos (actual: 2025-2026)
   - 🔍 Busca programa para asignatura 31 y periodo 2025-2026
   - ✅ Encuentra programa ID 123
   - 📋 Extrae datos_tabla.secciones[]
   - 🎨 Renderiza acordeones con datos existentes
4. Usuario: Modifica campos
5. Usuario: Click "Guardar"
6. Sistema: PUT /api/programa-analitico/123
7. BD: Actualiza registro existente
```

### **Caso 3: Cambio de Periodo**
```
1. Usuario: Está editando programa de periodo 2025-2026
2. Usuario: Cambia selector a periodo 2024-2025
3. Sistema: (Actualmente NO recarga automáticamente)
4. Solución Futura: Agregar useEffect que detecte cambio y recargue
```

---

## 🎯 Ventajas del Sistema Actual

✅ **Carga Automática:** Detecta programas existentes sin intervención del usuario  
✅ **Edición Transparente:** Usuario no nota diferencia entre crear y editar  
✅ **Preserva Datos:** No sobrescribe accidentalmente programas existentes  
✅ **Validación:** Backend previene duplicados por periodo  
✅ **Versionado:** Metadata guarda createdAt y updatedAt  

---

## 📝 Mejoras Futuras

### **1. Recarga al Cambiar Periodo**
```typescript
useEffect(() => {
  if (periodoSeleccionado && asignaturaId) {
    recargarProgramaDelPeriodo(periodoSeleccionado)
  }
}, [periodoSeleccionado])
```

### **2. Historial de Versiones**
```typescript
// Guardar versiones anteriores al actualizar
const versionAnterior = { ...programaExistente }
await guardarHistorial(versionAnterior)
```

### **3. Comparación Visual**
```tsx
// Modal mostrando diferencias entre versión actual y guardada
<DiffViewer 
  original={programaGuardado} 
  modificado={programaActual} 
/>
```

---

## ✅ Resumen

| Pregunta | Respuesta |
|----------|-----------|
| **¿Extrae del JSON?** | ✅ SÍ - Carga `datos_tabla.secciones[]` |
| **¿Del periodo actual?** | ✅ SÍ - Filtra por `periodo` actual |
| **¿Cuándo carga?** | Al abrir sin `nueva=true` |
| **¿Qué formato?** | JSON con estructura acordeón |
| **¿Actualiza o crea?** | Detecta automáticamente (POST vs PUT) |

---

**Conclusión:** El sistema **SÍ extrae** el programa analítico existente del periodo actual desde el JSON almacenado en `datos_tabla`, convierte las secciones a acordeones editables, y permite actualizar los datos con un solo click en "Guardar". 🎯
