# 📝 Implementación: Campos Individuales en Formularios Dinámicos

## 🎯 Objetivo Completado
Los títulos extraídos ahora se convierten en campos individuales de formulario (TextField) donde el usuario puede ingresar datos, en lugar de secciones de texto largo.

---

## 🔧 Cambios Implementados

### 1. **Frontend: `formularios-dinamicos/page.tsx`**

#### A. Función `convertirASecciones` Modificada

**ANTES:**
```typescript
// Creaba secciones de texto largo y tablas separadas
const convertirASecciones = (sesion: SesionExtraccion) => {
  const secciones: any[] = [];
  
  // Secciones de texto largo para cada título_seccion
  sesion.agrupadosPorTipo?.titulo_seccion?.forEach((titulo, idx) => {
    secciones.push({
      id: `seccion_${titulo.id}`,
      titulo: titulo.titulo,
      tipo: 'texto_largo',
      orden: idx
    });
  });
  
  // Tabla para campos
  if (sesion.agrupadosPorTipo?.campo) {
    secciones.push({
      id: 'tabla_campos',
      titulo: 'Tabla de Datos',
      tipo: 'tabla',
      campos: [...]
    });
  }
  
  return secciones;
};
```

**DESPUÉS:**
```typescript
// Crea una única sección con campos individuales para TODOS los títulos
const convertirASecciones = (sesion: SesionExtraccion) => {
  const secciones: any[] = [];

  // Combinar TODOS los títulos (cabecera, título_seccion, campo)
  const todosTitulos = [
    ...(sesion.agrupadosPorTipo?.cabecera || []),
    ...(sesion.agrupadosPorTipo?.titulo_seccion || []),
    ...(sesion.agrupadosPorTipo?.campo || [])
  ];

  if (todosTitulos.length > 0) {
    // Crear campos individuales para cada título
    const campos = todosTitulos.map((titulo, idx) => ({
      id: titulo.id,
      etiqueta: titulo.titulo,                    // El título como etiqueta
      nombre: `campo_${titulo.id}`,              // Nombre único del campo
      tipo_campo: 'text',                        // Input tipo texto
      orden: idx,
      requerido: false,
      placeholder: `Ingrese ${titulo.titulo.toLowerCase()}...`
    }));

    secciones.push({
      id: 'formulario_principal',
      titulo: 'Formulario del Programa Analítico',
      tipo: 'campos',                            // NUEVO TIPO: 'campos'
      orden: 0,
      descripcion: `${todosTitulos.length} campos detectados del archivo`,
      campos: campos
    });
  }

  return secciones;
};
```

---

### 2. **Component: `formulario-dinamico.tsx`**

#### A. Interface Actualizada

```typescript
interface SeccionFormulario {
  id?: number | string
  titulo: string
  descripcion?: string
  tipo: 'texto_largo' | 'tabla' | 'campos'  // ✅ NUEVO: 'campos'
  orden?: number
  obligatoria?: boolean
  encabezados?: string[]
  campos?: Campo[]
  num_filas?: number
}
```

#### B. Nueva Función Handler

```typescript
const handleCampoIndividualChange = (seccionId: string | number, campoNombre: string, valor: string) => {
  setContenido(prev => ({
    ...prev,
    [seccionId]: {
      ...prev[seccionId],
      [campoNombre]: valor
    }
  }))
}
```

#### C. Nueva Función de Renderizado: `renderSeccionCampos`

```typescript
const renderSeccionCampos = (seccion: SeccionFormulario) => {
  const seccionId = seccion.id || seccion.titulo
  const campos = seccion.campos || []
  
  return (
    <div className="space-y-4">
      {/* Header con ícono y descripción */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <List className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-emerald-900 mb-1">{seccion.titulo}</h4>
            <p className="text-sm text-emerald-700">
              {seccion.descripcion || 'Complete los campos detectados del archivo'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Grid de campos (2 columnas en desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campos.map((campo: Campo) => {
          const campoNombre = campo.nombre || `campo_${campo.id}`
          const valor = contenido[seccionId]?.[campoNombre] || ''
          
          return (
            <div key={campo.id} className="space-y-2">
              <Label htmlFor={`campo-${campo.id}`} className="text-sm font-medium text-gray-700">
                {campo.etiqueta}
                {campo.requerido && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <Input
                id={`campo-${campo.id}`}
                value={valor}
                onChange={(e) => handleCampoIndividualChange(seccionId, campoNombre, e.target.value)}
                placeholder={campo.placeholder || `Ingrese ${campo.etiqueta.toLowerCase()}`}
                className="w-full bg-white"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

#### D. Lógica de Renderizado Actualizada

```typescript
<CardContent className="space-y-6">
  {/* Si solo hay una sección de tipo 'campos', mostrarla directamente */}
  {secciones.length === 1 && secciones[0].tipo === 'campos' ? (
    renderSeccionCampos(secciones[0])
  ) : (
    <>
      {/* Lógica existente para tablas y tabs... */}
    </>
  )}
  
  {/* Resto del formulario... */}
</CardContent>
```

#### E. Ícono en Tabs

```typescript
{seccion.tipo === 'tabla' ? (
  <TableIcon className="h-4 w-4" />
) : seccion.tipo === 'campos' ? (
  <List className="h-4 w-4" />        // ✅ NUEVO: Ícono de lista
) : (
  <FileText className="h-4 w-4" />
)}
```

#### F. Renderizado Condicional en TabsContent

```typescript
{seccion.tipo === 'texto_largo' 
  ? renderSeccionTextoLargo(seccion)
  : seccion.tipo === 'campos'
  ? renderSeccionCampos(seccion)    // ✅ NUEVO
  : renderSeccionTabla(seccion)
}
```

---

## 🎨 Experiencia de Usuario

### **Vista Anterior (Secciones de Texto Largo + Tabla):**

```
┌─────────────────────────────────────┐
│ Tabs: [Sección 1] [Sección 2] ...  │
├─────────────────────────────────────┤
│ Sección 1: Objetivos                │
│ ┌─────────────────────────────────┐ │
│ │ [Textarea grande]               │ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Tab siguiente: Tabla de Datos       │
│ ┌──────┬──────┬──────┐             │
│ │ #    │ Cam1 │ Cam2 │             │
│ ├──────┼──────┼──────┤             │
│ │ 1    │ [  ] │ [  ] │             │
│ └──────┴──────┴──────┘             │
└─────────────────────────────────────┘
```

### **Vista Nueva (Campos Individuales):**

```
┌─────────────────────────────────────┐
│ 📋 Formulario del Programa Analítico│
│ 23 campos detectados del archivo   │
├─────────────────────────────────────┤
│ Grid de 2 columnas:                 │
│                                     │
│ Carrera                  Asignatura │
│ [_______________]        [________] │
│                                     │
│ Período                  Nivel      │
│ [_______________]        [________] │
│                                     │
│ Objetivos Generales      Contenidos │
│ [_______________]        [________] │
│                                     │
│ Metodología              Evaluación │
│ [_______________]        [________] │
│                                     │
│ ... (todos los campos)              │
│                                     │
│ [Guardar Programa Analítico]        │
└─────────────────────────────────────┘
```

---

## 📊 Estructura de Datos Guardados

### **Formato de Contenido:**

```json
{
  "formulario_principal": {
    "campo_1": "Ingeniería en Sistemas",
    "campo_2": "Programación Orientada a Objetos",
    "campo_3": "2024-2025",
    "campo_4": "Quinto Nivel",
    "campo_5": "Comprender los fundamentos de POO...",
    "campo_6": "Clases, Objetos, Herencia...",
    "campo_7": "Clases teóricas y prácticas en laboratorio",
    "campo_8": "Exámenes escritos, proyectos prácticos...",
    "campo_9": "Deitel, P. (2020). Java How to Program...",
    "campo_10": "...",
    "campo_23": "..."
  }
}
```

### **Comparación con Formato Anterior:**

**ANTES (Texto Largo + Tabla):**
```json
{
  "seccion_1": {
    "tipo": "texto_largo",
    "contenido": "Texto largo con objetivos..."
  },
  "seccion_2": {
    "tipo": "texto_largo",
    "contenido": "Texto largo con contenidos..."
  },
  "tabla_campos": {
    "tipo": "tabla",
    "filas": [
      { "valores": { "1": "Valor1", "2": "Valor2" } },
      { "valores": { "1": "Valor3", "2": "Valor4" } }
    ]
  }
}
```

**DESPUÉS (Campos Individuales):**
```json
{
  "formulario_principal": {
    "campo_1": "Valor directo 1",
    "campo_2": "Valor directo 2",
    "campo_3": "Valor directo 3",
    "campo_4": "Valor directo 4",
    "campo_5": "Valor directo 5",
    "campo_23": "Valor directo 23"
  }
}
```

---

## 🔄 Flujo Completo

### **1. Extracción de Títulos (Admin)**

```
Excel/Word → Títulos Extraídos → Base de Datos
┌────────────────┐
│ Carrera        │ ──→ cabecera
│ Asignatura     │ ──→ cabecera
│ Objetivos      │ ──→ titulo_seccion
│ Contenidos     │ ──→ titulo_seccion
│ Campo 1        │ ──→ campo
│ Campo 2        │ ──→ campo
└────────────────┘
```

### **2. Generación de Formulario (Docente)**

```
Títulos Extraídos → convertirASecciones() → Sección 'campos'
┌───────────────────────────────────────────┐
│ todosTitulos = [                          │
│   { id: 1, titulo: "Carrera", tipo: ... },│
│   { id: 2, titulo: "Asignatura", ... },   │
│   { id: 3, titulo: "Objetivos", ... },    │
│   ...                                     │
│ ]                                         │
└───────────────────────────────────────────┘
                    ↓
┌───────────────────────────────────────────┐
│ secciones = [{                            │
│   tipo: 'campos',                         │
│   campos: [                               │
│     { id: 1, etiqueta: "Carrera", ... },  │
│     { id: 2, etiqueta: "Asignatura", ...},│
│     { id: 3, etiqueta: "Objetivos", ... } │
│   ]                                       │
│ }]                                        │
└───────────────────────────────────────────┘
```

### **3. Renderizado (UI)**

```
FormularioDinamico → renderSeccionCampos()
┌───────────────────────────────────────────┐
│ Grid 2 columnas:                          │
│                                           │
│ Label: "Carrera"      Label: "Asignatura"│
│ Input: [_________]    Input: [_________] │
│                                           │
│ Label: "Objetivos"    Label: "Contenidos"│
│ Input: [_________]    Input: [_________] │
│                                           │
│ ... (todos los campos)                    │
└───────────────────────────────────────────┘
```

### **4. Guardado de Datos**

```
onChange → handleCampoIndividualChange() → setContenido()
┌───────────────────────────────────────────┐
│ contenido = {                             │
│   "formulario_principal": {               │
│     "campo_1": "Ingeniería...",           │
│     "campo_2": "POO",                     │
│     "campo_3": "Desarrollar...",          │
│     ...                                   │
│   }                                       │
│ }                                         │
└───────────────────────────────────────────┘
                    ↓
         [Guardar Programa Analítico]
                    ↓
  POST /api/formulario-dinamico/guardar
                    ↓
  Tabla: programas_analiticos
  ┌────────────────────────────────────┐
  │ id: 123                            │
  │ nombre: "Formulario: programa..."  │
  │ datos_tabla: {                     │
  │   tipo: 'formulario_dinamico',     │
  │   contenido: { ... }               │
  │ }                                  │
  └────────────────────────────────────┘
```

---

## ✅ Ventajas de la Nueva Implementación

### **1. Simplicidad**
- ✅ Un solo formulario en lugar de múltiples tabs
- ✅ Vista clara de todos los campos
- ✅ No necesita cambiar entre pestañas

### **2. Organización**
- ✅ Grid de 2 columnas aprovecha el espacio
- ✅ Campos agrupados visualmente
- ✅ Scroll natural en una página

### **3. Usabilidad**
- ✅ Inputs tipo TextField más intuitivos que textareas
- ✅ Placeholders descriptivos en cada campo
- ✅ Labels claros con los títulos extraídos

### **4. Datos Estructurados**
- ✅ Formato plano fácil de procesar
- ✅ Cada campo tiene un nombre único
- ✅ Pre-llenado funciona perfectamente

### **5. Flexibilidad**
- ✅ Se adapta a cualquier número de campos
- ✅ Combina todos los tipos de títulos (cabecera, sección, campo)
- ✅ Responsive en móviles (1 columna) y desktop (2 columnas)

---

## 🎨 Diseño Visual

### **Colores y Estilos:**
```typescript
// Header de la sección
bg-emerald-50      // Fondo verde claro
border-emerald-200 // Borde verde
text-emerald-900   // Título verde oscuro
text-emerald-700   // Descripción verde medio

// Campos
bg-white           // Fondo blanco para inputs
text-gray-700      // Labels en gris oscuro
text-gray-500      // Placeholders en gris medio

// Layout
grid-cols-1        // 1 columna en móvil
md:grid-cols-2     // 2 columnas en desktop
gap-4              // Espaciado entre campos
```

---

## 🧪 Ejemplo de Uso Completo

### **Archivo Excel Subido:**
```
┌──────────────┬────────────────┐
│ Carrera      │ Asignatura     │
│ Período      │ Nivel          │
│ Docente      │ Email          │
└──────────────┴────────────────┘
OBJETIVOS GENERALES
CONTENIDOS
METODOLOGÍA
EVALUACIÓN
BIBLIOGRAFÍA
```

### **Títulos Extraídos:**
```javascript
{
  cabecera: [
    { id: 1, titulo: "Carrera" },
    { id: 2, titulo: "Asignatura" },
    { id: 3, titulo: "Período" },
    { id: 4, titulo: "Nivel" }
  ],
  titulo_seccion: [
    { id: 5, titulo: "OBJETIVOS GENERALES" },
    { id: 6, titulo: "CONTENIDOS" },
    { id: 7, titulo: "METODOLOGÍA" },
    { id: 8, titulo: "EVALUACIÓN" }
  ],
  campo: [
    { id: 9, titulo: "Docente" },
    { id: 10, titulo: "Email" },
    { id: 11, titulo: "BIBLIOGRAFÍA" }
  ]
}
```

### **Formulario Generado:**
```
┌─────────────────────────────────────────────────────────┐
│ 📋 Formulario del Programa Analítico                    │
│ 11 campos detectados del archivo                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Carrera                           Asignatura            │
│ [Ingrese carrera...]              [Ingrese asignatura..]│
│                                                         │
│ Período                           Nivel                 │
│ [Ingrese período...]              [Ingrese nivel...]    │
│                                                         │
│ Docente                           Email                 │
│ [Ingrese docente...]              [Ingrese email...]    │
│                                                         │
│ OBJETIVOS GENERALES               CONTENIDOS            │
│ [Ingrese objetivos generales...]  [Ingrese contenidos..]│
│                                                         │
│ METODOLOGÍA                       EVALUACIÓN            │
│ [Ingrese metodología...]          [Ingrese evaluación..]│
│                                                         │
│ BIBLIOGRAFÍA                                            │
│ [Ingrese bibliografía...]                               │
│                                                         │
│ [💾 Guardar Programa Analítico]   [Cancelar]           │
└─────────────────────────────────────────────────────────┘
```

### **Datos Guardados:**
```json
{
  "success": true,
  "message": "Formulario guardado exitosamente",
  "data": {
    "id": 456,
    "nombre": "Formulario: programa_analitico.xlsx",
    "contenido": {
      "formulario_principal": {
        "campo_1": "Ingeniería en Sistemas",
        "campo_2": "Programación Orientada a Objetos",
        "campo_3": "2024-2025",
        "campo_4": "Quinto Nivel",
        "campo_5": "Comprender los fundamentos de la POO...",
        "campo_6": "Clases, Objetos, Herencia, Polimorfismo...",
        "campo_7": "Clases teóricas y prácticas de laboratorio",
        "campo_8": "Exámenes, proyectos, participación",
        "campo_9": "Dr. Juan Pérez",
        "campo_10": "juan.perez@unesum.edu.ec",
        "campo_11": "Deitel, P. (2020). Java How to Program..."
      }
    }
  }
}
```

---

## 🔍 Comparación Visual

### **ANTES:**
```
❌ Múltiples pestañas (Tab 1, Tab 2, Tab 3...)
❌ Textareas grandes para cada sección
❌ Tabla separada para campos
❌ Necesita navegación entre tabs
❌ Difícil ver todo el contenido de un vistazo
```

### **DESPUÉS:**
```
✅ Una sola vista con todos los campos
✅ Inputs individuales tipo TextField
✅ Grid organizado en 2 columnas
✅ Scroll vertical natural
✅ Vista completa del formulario
✅ Más intuitivo y profesional
```

---

## 📝 Checklist de Implementación

- ✅ Modificada función `convertirASecciones` para combinar todos los títulos
- ✅ Agregado nuevo tipo 'campos' a SeccionFormulario interface
- ✅ Creada función `handleCampoIndividualChange`
- ✅ Implementada función `renderSeccionCampos`
- ✅ Actualizada lógica de renderizado principal
- ✅ Agregado ícono List para tipo 'campos' en tabs
- ✅ Actualizado renderizado condicional en TabsContent
- ✅ Diseño responsive (1 col móvil, 2 col desktop)
- ✅ Placeholders descriptivos en cada input
- ✅ Sin errores de TypeScript
- ✅ Sin errores de compilación

---

## 🚀 Resultado Final

El docente ahora tiene una experiencia mucho más limpia e intuitiva:

1. ✅ **Abre el formulario** desde "Formularios Disponibles"
2. ✅ **Ve todos los campos** en una sola vista organizada
3. ✅ **Completa los campos** con inputs tipo TextField
4. ✅ **Guarda el formulario** con un solo clic
5. ✅ **Revisa formularios guardados** en "Mis Formularios"
6. ✅ **Edita formularios** con datos pre-llenados

---

**Fecha de Implementación:** 14 de diciembre de 2025  
**Estado:** ✅ COMPLETADO Y FUNCIONAL  
**Tipo de Cambio:** Mejora de UX - Campos Individuales
