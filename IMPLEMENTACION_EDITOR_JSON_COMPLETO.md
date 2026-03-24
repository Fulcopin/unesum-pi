# 📊 Sistema de Importación y Edición JSON para Programa Analítico y Syllabus

## 🎯 Objetivo
Permitir que los usuarios importen archivos **Excel o Word** de Programa Analítico y Syllabus, que se almacenen en formato **JSON** en la base de datos, y se visualicen en **secciones y tablas editables** en el frontend.

## 🏗️ Arquitectura Completa

### 1. Backend - Extracción y Almacenamiento (YA IMPLEMENTADO ✅)

#### **Controlador: `programaAnaliticoController.js`**
```javascript
exports.uploadExcel = async (req, res) => {
  // 1. Recibe archivo Excel/Word
  // 2. Extrae todas las tablas y secciones
  // 3. Detecta tipos: tabla, texto_largo, datos_generales
  // 4. Guarda en formato JSON en campo `datos_tabla`
  // 5. Crea/actualiza plantilla con secciones y campos
}
```

**Estructura JSON guardada en DB:**
```json
{
  "secciones": [
    {
      "titulo": "DATOS GENERALES",
      "tipo": "texto_corto",
      "datos": [["Carrera", "Ingeniería"]]
    },
    {
      "titulo": "UNIDADES TEMÁTICAS",
      "tipo": "tabla",
      "encabezados": ["Unidad", "Contenido", "Horas"],
      "datos": [
        ["Unidad 1", "Introducción", "10"],
        ["Unidad 2", "Desarrollo", "20"]
      ]
    }
  ]
}
```

#### **Modelos de Base de Datos:**
```
PlantillaPrograma
  ├─ SeccionPlantilla (nombre, tipo, orden)
  │   └─ CampoSeccion (nombre, tipo_campo, orden)
  │
ContenidoPrograma (programa_id, seccion_id, contenido_texto)
  └─ FilaTablaPrograma (contenido_id, orden)
      └─ ValorCampoPrograma (fila_id, campo_id, valor)
```

### 2. Frontend - Visualización Editable (NUEVO COMPONENTE)

#### **Componente: `EditorSeccionesJSON`**

**Ubicación:** `components/programa-analitico/editor-secciones-json.tsx`

**Características:**
- ✅ Parsea JSON de múltiples formatos
- ✅ Muestra secciones colapsables
- ✅ Tablas editables celda por celda
- ✅ Campos de texto con textarea
- ✅ Agregar/eliminar filas
- ✅ Exportar JSON
- ✅ Guardar cambios en DB

**Props:**
```typescript
interface EditorSeccionesJSONProps {
  datosIniciales: any          // JSON del backend
  onGuardar: (datos: Seccion[]) => Promise<void>
  titulo?: string
  modo?: 'programa-analitico' | 'syllabus'
}
```

### 3. Integración en Páginas

#### **A. Página de Programa Analítico Admin**

**Archivo:** `app/dashboard/admin/programa-analitico/page.tsx`

**Modificación necesaria:**
```tsx
import { EditorSeccionesJSON } from "@/components/programa-analitico/editor-secciones-json"

// Dentro del componente
const [programaSeleccionado, setProgramaSeleccionado] = useState<ProgramaAnalitico | null>(null)

// Función para guardar cambios
const handleGuardarPrograma = async (secciones: any[]) => {
  const response = await fetch(`http://localhost:4000/api/programas-analiticos/${programaSeleccionado.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      datos_tabla: { secciones }
    })
  })
  
  if (!response.ok) throw new Error('Error al guardar')
  await fetchProgramas()
}

// En el JSX
{programaSeleccionado && (
  <EditorSeccionesJSON
    datosIniciales={programaSeleccionado.datos_tabla}
    onGuardar={handleGuardarPrograma}
    titulo={`Editar: ${programaSeleccionado.nombre}`}
    modo="programa-analitico"
  />
)}
```

#### **B. Página de Syllabus**

**Similar integración en:** 
- `app/dashboard/admin/syllabus/page.tsx`
- `app/dashboard/comision/syllabus/page.tsx`
- `app/dashboard/docente/syllabus/page.tsx`

```tsx
<EditorSeccionesJSON
  datosIniciales={syllabusSeleccionado.datos_syllabus}
  onGuardar={handleGuardarSyllabus}
  titulo={`Syllabus: ${syllabusSeleccionado.nombre}`}
  modo="syllabus"
/>
```

## 📋 Formatos de JSON Soportados

### Formato 1: Con Secciones Estructuradas
```json
{
  "secciones": [
    {
      "titulo": "OBJETIVOS",
      "tipo": "texto_largo",
      "datos": ["Objetivo general...", "Objetivos específicos..."]
    },
    {
      "titulo": "CONTENIDOS",
      "tipo": "tabla",
      "encabezados": ["Semana", "Tema", "Actividad"],
      "datos": [
        ["1", "Introducción", "Lectura"],
        ["2", "Fundamentos", "Taller"]
      ]
    }
  ]
}
```

### Formato 2: Campos Planos (Syllabus Legacy)
```json
{
  "titulos": ["Carrera", "Nivel", "Asignatura"],
  "contenido": {
    "Carrera": "Ingeniería en Sistemas",
    "Nivel": "Tercer Nivel",
    "Asignatura": "Programación Web"
  }
}
```

### Formato 3: Genérico (Auto-detectado)
```json
{
  "datos_generales": {
    "carrera": "Ingeniería",
    "periodo": "2025-I"
  },
  "unidades": [
    ["Unidad 1", "Introducción", "10 horas"],
    ["Unidad 2", "Desarrollo", "20 horas"]
  ]
}
```

## 🔧 Endpoints del Backend

### Programa Analítico

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/programas-analiticos/upload` | Subir Excel/Word |
| GET | `/api/programas-analiticos` | Listar todos |
| GET | `/api/programas-analiticos/:id` | Ver uno específico |
| PUT | `/api/programas-analiticos/:id` | Actualizar (incluyendo JSON) |
| DELETE | `/api/programas-analiticos/:id` | Eliminar |

### Syllabus

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/syllabus/upload` | Subir documento Word |
| GET | `/api/syllabus` | Listar todos |
| GET | `/api/syllabus/:id` | Ver uno específico |
| PUT | `/api/syllabus/:id` | Actualizar (incluyendo JSON) |
| DELETE | `/api/syllabus/:id` | Eliminar |

## 🎨 Funcionalidades del Editor

### ✅ Vista de Secciones
- Secciones colapsables con iconos
- Badges de tipo (tabla, texto)
- Contador de filas/contenido

### ✅ Edición de Tablas
- Clic en celda para editar inline
- Enter para guardar, Escape para cancelar
- Agregar filas con botón `+`
- Eliminar filas con icono de papelera
- Scroll horizontal automático

### ✅ Edición de Texto
- Textarea para textos largos
- Input simple para textos cortos
- Autoguardado al cambiar de sección (opcional)

### ✅ Acciones Globales
- **Guardar Cambios**: Envía JSON actualizado al backend
- **Exportar JSON**: Descarga archivo .json local
- **Vista de JSON Raw**: Modal con JSON formateado (opcional)

## 📦 Estructura de Datos en Componente

```typescript
interface Seccion {
  id: string                    // Identificador único
  nombre: string                // Título de la sección
  tipo: 'tabla' | 'texto_largo' | 'texto_corto'
  orden: number                 // Para ordenar secciones
  collapsed?: boolean           // Estado de colapso
  
  // Para tipo tabla
  encabezados?: string[]
  filas?: FilaTabla[]
  
  // Para tipo texto
  contenido?: string
}

interface FilaTabla {
  id: string
  orden: number
  campos: Campo[]
}

interface Campo {
  id: string
  nombre: string
  etiqueta: string
  tipo: 'texto' | 'numero' | 'fecha' | 'textarea'
  valor: string
}
```

## 🚀 Flujo Completo de Uso

### 1. Importación
```
Usuario → Sube Excel/Word → Backend extrae secciones → 
Guarda JSON en DB → Crea plantilla con campos
```

### 2. Visualización
```
Frontend solicita datos → Backend devuelve JSON → 
EditorSeccionesJSON parsea → Renderiza secciones y tablas
```

### 3. Edición
```
Usuario edita celda/texto → Estado local se actualiza → 
Usuario hace clic en "Guardar" → PUT al backend → 
JSON actualizado en DB
```

### 4. Exportación (Opcional)
```
Usuario hace clic en "Exportar JSON" → 
Descarga archivo .json con estructura completa
```

## 🎯 Ejemplo de Uso Completo

### En página de Admin:

```tsx
"use client"

import { useState } from "react"
import { EditorSeccionesJSON } from "@/components/programa-analitico/editor-secciones-json"
import { useAuth } from "@/contexts/auth-context"

export default function EditarProgramaPage({ params }: { params: { id: string } }) {
  const { token } = useAuth()
  const [programa, setPrograma] = useState(null)

  // Cargar programa
  useEffect(() => {
    fetch(`http://localhost:4000/api/programas-analiticos/${params.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setPrograma(data.data))
  }, [])

  // Guardar cambios
  const handleGuardar = async (secciones) => {
    await fetch(`http://localhost:4000/api/programas-analiticos/${params.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre: programa.nombre,
        datos_tabla: { secciones }
      })
    })
  }

  if (!programa) return <div>Cargando...</div>

  return (
    <div className="container mx-auto py-8">
      <EditorSeccionesJSON
        datosIniciales={programa.datos_tabla}
        onGuardar={handleGuardar}
        titulo={`Editar: ${programa.nombre}`}
        modo="programa-analitico"
      />
    </div>
  )
}
```

## ✨ Mejoras Futuras

- [ ] Autoguardado cada X segundos
- [ ] Historial de versiones (undo/redo)
- [ ] Validaciones por tipo de campo
- [ ] Drag & drop para reordenar secciones
- [ ] Agregar/eliminar columnas en tablas
- [ ] Vista previa en formato PDF
- [ ] Colaboración en tiempo real
- [ ] Comentarios por sección

## 🐛 Solución de Problemas

### Problema: JSON no se parsea correctamente
**Solución:** Verifica que el backend esté enviando la estructura correcta en `datos_tabla` o `datos_syllabus`

### Problema: Cambios no se guardan
**Solución:** Revisa la consola del navegador, verifica que el token esté presente y que el endpoint responda con status 200

### Problema: Tabla no muestra columnas
**Solución:** Asegúrate de que `encabezados` esté definido en la sección de tipo tabla

## 📞 Soporte

Para más información revisa:
- `programaAnaliticoController.js` - Lógica de extracción
- `syllabusController.js` - Lógica de Syllabus
- `editor-secciones-json.tsx` - Componente de edición
