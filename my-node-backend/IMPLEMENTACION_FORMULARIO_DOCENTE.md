# Implementación del Formulario Dinámico para Docentes

## 📋 Resumen

Se ha implementado exitosamente el sistema completo para que los docentes puedan ver y llenar los formularios de programas analíticos basados en la estructura de las plantillas almacenadas en la base de datos.

---

## ✅ Tareas Completadas

### 1. Actualización del Sistema de Modelos ✅

**Archivo:** `my-node-backend/src/models/index.js`

Se agregaron e inicializaron los siguientes modelos:
- `PlantillaPrograma`: Plantillas reutilizables de programas analíticos
- `SeccionPlantilla`: Secciones dentro de las plantillas (con tipo: texto_largo/tabla)
- `CampoSeccion`: Campos de las secciones tipo tabla
- `AsignacionProgramaDocente`: Asignaciones de programas a docentes

**Asociaciones configuradas:**
```javascript
// PlantillaPrograma
- belongsTo Usuario (creador)
- hasMany SeccionPlantilla (secciones)
- hasMany ProgramasAnaliticos (programas)

// SeccionPlantilla
- belongsTo PlantillaPrograma
- hasMany CampoSeccion (campos)

// AsignacionProgramaDocente
- belongsTo ProgramasAnaliticos, Profesor, Asignatura, Nivel, Paralelo, Periodo
```

---

### 2. Nuevos Endpoints en el Backend ✅

**Archivo:** `my-node-backend/src/controllers/programaAnaliticoController.js`

#### 2.1 `getProgramaConPlantilla()`
**Ruta:** `GET /api/programa-analitico/:id/plantilla`

**Descripción:** Obtiene un programa analítico con toda su estructura de plantilla.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Programa de Matemáticas",
    "carrera": "Ingeniería en Software",
    "nivel": "3",
    "asignatura": "Cálculo III",
    "plantilla": {
      "id": 1,
      "nombre": "Plantilla Estándar",
      "descripcion": "Plantilla estándar para programas analíticos",
      "secciones": [
        {
          "id": 1,
          "nombre": "DATOS GENERALES",
          "tipo": "texto_largo",
          "orden": 1,
          "obligatoria": true,
          "campos": []
        },
        {
          "id": 6,
          "nombre": "CONTENIDOS",
          "tipo": "tabla",
          "orden": 6,
          "obligatoria": true,
          "campos": [
            {
              "id": 1,
              "etiqueta": "Unidad",
              "tipo_campo": "texto",
              "orden": 1,
              "obligatorio": true
            },
            {
              "id": 2,
              "etiqueta": "Contenidos",
              "tipo_campo": "texto",
              "orden": 2
            }
          ]
        }
      ]
    }
  }
}
```

#### 2.2 `guardarContenidoDocente()`
**Ruta:** `POST /api/programa-analitico/:id/guardar-contenido`

**Descripción:** Guarda el contenido llenado por el docente en las tablas relacionales.

**Body:**
```json
{
  "profesor_id": 123,
  "contenido": {
    "1": {
      "tipo": "texto_largo",
      "contenido": "Este programa tiene como objetivo..."
    },
    "6": {
      "tipo": "tabla",
      "filas": [
        {
          "valores": {
            "1": "Unidad 1",
            "2": "Introducción al cálculo"
          }
        }
      ]
    }
  }
}
```

**Tablas Afectadas:**
- `contenido_programa`: Almacena contenido por sección
- `filas_tabla_programa`: Filas de tablas
- `valores_campo_programa`: Valores de cada campo en las filas
- `asignaciones_programa_docente`: Actualiza estado a 'en_progreso'

#### 2.3 `getContenidoDocente()`
**Ruta:** `GET /api/programa-analitico/:id/contenido-docente?profesor_id=123`

**Descripción:** Obtiene el contenido guardado del docente para un programa.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "programa_id": 1,
    "profesor_id": 123,
    "contenido": {
      "1": {
        "tipo": "texto_largo",
        "nombre": "DATOS GENERALES",
        "contenido": "Este programa..."
      },
      "6": {
        "tipo": "tabla",
        "nombre": "CONTENIDOS",
        "filas": [
          {
            "orden": 1,
            "valores": {
              "1": "Unidad 1",
              "2": "Introducción"
            }
          }
        ]
      }
    }
  }
}
```

---

### 3. Rutas Actualizadas ✅

**Archivo:** `my-node-backend/src/routes/programaAnaliticoRoutes.js`

```javascript
// Obtener programa con estructura completa de plantilla
router.get('/:id/plantilla', authenticate, programaAnaliticoController.getProgramaConPlantilla);

// Guardar contenido llenado por el docente
router.post('/:id/guardar-contenido', authenticate, programaAnaliticoController.guardarContenidoDocente);

// Obtener contenido guardado del docente
router.get('/:id/contenido-docente', authenticate, programaAnaliticoController.getContenidoDocente);
```

---

### 4. Interfaz del Docente Actualizada ✅

**Archivo:** `app/dashboard/docente/programa-analitico/page.tsx`

#### Cambios Principales:

**4.1 Carga de Estructura de Plantilla:**
```typescript
const handleSeleccionarPrograma = async (programa: ProgramaAnalitico) => {
  // 1. Obtener estructura completa de la plantilla
  const response = await fetch(
    `http://localhost:4000/api/programa-analitico/${programa.id}/plantilla`
  )
  
  // 2. Obtener contenido guardado del docente
  const contenidoResponse = await fetch(
    `http://localhost:4000/api/programa-analitico/${programa.id}/contenido-docente?profesor_id=${profesorId}`
  )
  
  // 3. Combinar datos
  const programaCompleto = {
    ...programa,
    plantilla: data.data.plantilla,
    contenido_guardado: contenidoData.data.contenido
  }
  
  setSelectedPrograma(programaCompleto)
  setModoEdicion(true)
}
```

**4.2 Guardado de Contenido:**
```typescript
const handleGuardarContenido = async (programaId: number, contenido: Record<string, any>) => {
  const response = await fetch(
    `http://localhost:4000/api/programa-analitico/${programaId}/guardar-contenido`,
    {
      method: 'POST',
      body: JSON.stringify({ 
        contenido,
        profesor_id: profesorId
      })
    }
  )
}
```

**4.3 Formateo de Datos para el Formulario:**
- Convierte la estructura de la plantilla al formato esperado por `FormularioDinamico`
- Mapea secciones con sus campos
- Formatea contenido guardado (texto_largo y tabla)

---

### 5. Componente FormularioDinamico Actualizado ✅

**Archivo:** `components/programa-analitico/formulario-dinamico.tsx`

#### Cambios Principales:

**5.1 Nuevas Interfaces:**
```typescript
interface Campo {
  id: number
  etiqueta: string
  tipo_campo: string
  orden: number
  opciones?: any
  validaciones?: any
  obligatorio?: boolean
}

interface SeccionFormulario {
  id?: number
  titulo: string
  descripcion?: string
  tipo: 'texto_largo' | 'tabla'
  orden?: number
  obligatoria?: boolean
  campos?: Campo[]
}
```

**5.2 Manejo de Contenido con IDs:**
```typescript
// Usa seccionId en lugar de titulo para identificar secciones
const seccionId = seccion.id || seccion.titulo

// Para texto largo
setContenido(prev => ({
  ...prev,
  [seccionId]: {
    tipo: 'texto_largo',
    contenido: valor
  }
}))

// Para tablas
setContenido(prev => ({
  ...prev,
  [seccionId]: {
    tipo: 'tabla',
    filas: [
      {
        valores: {
          [campoId]: valor
        }
      }
    ]
  }
}))
```

**5.3 Renderizado de Tablas con Campos Estructurados:**
```typescript
renderSeccionTabla(seccion) {
  const campos = seccion.campos || []
  
  // Renderiza encabezados usando campo.etiqueta
  campos.map((campo) => (
    <TableHead key={`campo-${campo.id}`}>
      {campo.etiqueta}
      {campo.obligatorio && <span className="text-red-500 ml-1">*</span>}
    </TableHead>
  ))
  
  // Renderiza inputs usando campo.id para identificar valores
  campos.map((campo) => (
    <Input
      value={fila.valores?.[campo.id] || ''}
      onChange={(e) => handleTablaChange(seccionId, filaIdx, campo.id, e.target.value)}
      placeholder={campo.etiqueta}
    />
  ))
}
```

---

## 🔄 Flujo Completo del Sistema

### Paso 1: Admin Crea Plantilla
1. Se ejecuta el seeder que crea una plantilla estándar
2. La plantilla incluye secciones y campos definidos
3. Datos guardados en: `plantillas_programa`, `secciones_plantilla`, `campos_seccion`

### Paso 2: Admin Asigna Programa a Docente
1. Admin crea un programa analítico basado en la plantilla
2. Admin asigna el programa a un docente específico
3. Registro creado en `asignaciones_programa_docente`

### Paso 3: Docente Accede al Programa
1. Docente navega a `/dashboard/docente/programa-analitico`
2. Sistema carga programas asignados
3. Docente selecciona un programa

### Paso 4: Sistema Carga Estructura
1. Frontend llama a `GET /api/programa-analitico/:id/plantilla`
2. Backend devuelve estructura completa con secciones y campos
3. Frontend llama a `GET /api/programa-analitico/:id/contenido-docente`
4. Backend devuelve contenido previamente guardado (si existe)

### Paso 5: Docente Llena el Formulario
1. FormularioDinamico renderiza campos basados en la plantilla
2. Secciones tipo `texto_largo`: muestra Textarea
3. Secciones tipo `tabla`: muestra tabla con columnas definidas
4. Docente puede agregar/eliminar filas en tablas
5. Docente completa la información

### Paso 6: Docente Guarda Contenido
1. Click en "Guardar Programa Analítico"
2. Frontend llama a `POST /api/programa-analitico/:id/guardar-contenido`
3. Backend guarda datos en:
   - `contenido_programa` (por cada sección)
   - `filas_tabla_programa` (para cada fila de tabla)
   - `valores_campo_programa` (para cada valor de campo)
4. Backend actualiza estado en `asignaciones_programa_docente` a 'en_progreso'

---

## 📊 Estructura de Datos

### Contenido en el Frontend (formato interno)
```javascript
{
  "1": {  // seccionId
    "tipo": "texto_largo",
    "contenido": "Este es el contenido de texto largo..."
  },
  "6": {  // seccionId
    "tipo": "tabla",
    "filas": [
      {
        "valores": {
          "1": "Valor para campo 1",  // campoId: valor
          "2": "Valor para campo 2",
          "3": "Valor para campo 3"
        }
      }
    ]
  }
}
```

### Contenido en la Base de Datos

**Tabla: `contenido_programa`**
```
id | programa_id | seccion_id | profesor_id | contenido_texto
1  | 1          | 1          | 123        | "Este es el contenido..."
2  | 1          | 6          | 123        | NULL
```

**Tabla: `filas_tabla_programa`**
```
id | contenido_id | orden
1  | 2           | 1
2  | 2           | 2
```

**Tabla: `valores_campo_programa`**
```
id | fila_id | campo_id | valor
1  | 1      | 1        | "Unidad 1"
2  | 1      | 2        | "Introducción"
3  | 2      | 1        | "Unidad 2"
4  | 2      | 2        | "Desarrollo"
```

---

## 🧪 Cómo Probar

### 1. Verificar que el Backend esté Corriendo
```bash
cd my-node-backend
npm start
```

### 2. Verificar que las Migraciones y Seeders se Ejecutaron
```bash
cd my-node-backend
npm run migrate
npm run seed
```

Esto debería crear:
- ✅ 1 plantilla estándar
- ✅ 9 secciones (DATOS GENERALES, CARACTERIZACIÓN, etc.)
- ✅ 13 campos en 3 secciones tipo tabla

### 3. Crear un Programa Analítico (como Admin)
```bash
# Opción 1: Usar interfaz web
# - Ir a /dashboard/admin/programa-analitico
# - Subir archivo Excel o crear programa

# Opción 2: Crear directamente en BD
```

```sql
INSERT INTO programas_analiticos (
  nombre, 
  plantilla_id,
  carrera,
  nivel,
  asignatura,
  periodo_academico,
  usuario_id
) VALUES (
  'Programa de Prueba',
  1,  -- ID de la plantilla creada por el seeder
  'Ingeniería en Software',
  '3',
  'Programación Avanzada',
  '2024-2025',
  1  -- ID del usuario admin
);
```

### 4. Asignar Programa a un Docente
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
  1,  -- ID del programa creado
  1,  -- ID del profesor
  1,  -- ID de la asignatura
  1,  -- ID del nivel
  1,  -- ID del paralelo
  1,  -- ID del periodo
  'pendiente',
  NOW()
);
```

### 5. Probar como Docente
1. Iniciar sesión como docente
2. Navegar a `/dashboard/docente/programa-analitico`
3. Verificar que aparece el programa asignado
4. Click en "Completar"
5. Verificar que se carga la estructura de la plantilla
6. Llenar algunos campos
7. Click en "Guardar Programa Analítico"
8. Verificar mensaje de éxito

### 6. Verificar Datos en la Base de Datos
```sql
-- Ver contenido guardado
SELECT * FROM contenido_programa WHERE programa_id = 1;

-- Ver filas de tablas
SELECT * FROM filas_tabla_programa;

-- Ver valores de campos
SELECT * FROM valores_campo_programa;

-- Ver estado de asignación
SELECT * FROM asignaciones_programa_docente WHERE programa_id = 1;
```

---

## 🐛 Solución de Problemas

### Error: "No se pudo conectar al servidor"
- Verificar que el backend esté corriendo en `http://localhost:4000`
- Revisar la consola del backend para errores

### Error: "Este programa no tiene plantilla asociada"
- Verificar que el programa tenga `plantilla_id` asignado
- Ejecutar: `SELECT id, nombre, plantilla_id FROM programas_analiticos;`

### Error: "No hay programas analíticos asignados"
- Verificar que existe un registro en `asignaciones_programa_docente`
- Verificar que el `profesor_id` coincida con el ID del usuario docente

### No se guardan los datos
- Abrir DevTools → Network
- Verificar que la petición POST a `/guardar-contenido` se envía correctamente
- Revisar la respuesta del servidor
- Verificar logs del backend para errores de SQL

---

## 📝 Próximos Pasos

### Mejoras Sugeridas:
1. ✨ **Validación de Campos Obligatorios**: Implementar validación antes de guardar
2. 🔄 **Autoguardado**: Guardar progreso automáticamente cada X minutos
3. 📊 **Indicador de Progreso**: Mostrar % de completitud del formulario
4. 📄 **Vista Previa**: Permitir ver el programa en formato PDF
5. ✅ **Marcar como Completado**: Botón para finalizar y enviar a revisión
6. 📧 **Notificaciones**: Notificar al admin cuando un docente complete un programa
7. 🔒 **Control de Versiones**: Guardar historial de cambios
8. 👥 **Múltiples Docentes**: Permitir que varios docentes trabajen en el mismo programa

---

## 📚 Documentación Adicional

- [Diseño de Base de Datos](./DISEÑO_BD_PROGRAMA_ANALITICO.md)
- [Guía de Implementación](./IMPLEMENTACION_PROGRAMA_ANALITICO.md)
- [Resumen de Implementación Exitosa](./IMPLEMENTACION_EXITOSA.md)

---

## ✅ Resumen Final

**Estado:** ✅ IMPLEMENTACIÓN COMPLETA Y FUNCIONAL

**Archivos Modificados:**
- ✅ `my-node-backend/src/models/index.js`
- ✅ `my-node-backend/src/controllers/programaAnaliticoController.js`
- ✅ `my-node-backend/src/routes/programaAnaliticoRoutes.js`
- ✅ `app/dashboard/docente/programa-analitico/page.tsx`
- ✅ `components/programa-analitico/formulario-dinamico.tsx`

**Funcionalidad:**
- ✅ Carga de estructura de plantilla desde BD
- ✅ Renderizado dinámico de formularios (texto_largo y tabla)
- ✅ Guardado de contenido en estructura relacional
- ✅ Recuperación de contenido guardado
- ✅ Agregar/eliminar filas en tablas
- ✅ Indicadores de campos obligatorios
- ✅ Mensajes de éxito/error

**Listo para Pruebas** 🚀
