# 📋 Implementación de Formulario con Acordeones para Programa Analítico

## 📅 Fecha de Implementación
**2 de febrero de 2026**

## 🎯 Objetivo
Crear una interfaz con acordeones verticales para que la comisión académica pueda crear programas analíticos de manera estructurada, con campos organizados por secciones desplegables.

---

## 🏗️ Arquitectura Implementada

### 1. **Nueva Página: Crear Programa Analítico**
**Ruta:** `/dashboard/comision/crear-programa-analitico`
**Archivo:** `app/dashboard/comision/crear-programa-analitico/page.tsx`

### 2. **Funcionalidades Principales**

#### ✅ **Carga de Datos Iniciales**
- Obtiene información de la asignatura seleccionada
- Carga periodos académicos disponibles
- Selecciona automáticamente el periodo actual
- Inicializa secciones predefinidas del programa analítico

#### ✅ **Secciones Predefinidas**
Las siguientes secciones están configuradas como acordeones:

1. **ASIGNATURA**
2. **PERIODO ACADÉMICO ORDINARIO (PAO)**
3. **NIVEL**
4. **CARACTERIZACIÓN**
5. **OBJETIVOS DE LA ASIGNATURA**
6. **COMPETENCIAS**
7. **RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA**
8. **UNIDADES TEMÁTICAS**
9. **DESCRIPCIÓN**
10. **CONTENIDOS DE LA ASIGNATURA**
11. **METODOLOGÍA**
12. **PROCEDIMIENTOS DE EVALUACIÓN**
13. **BIBLIOGRAFÍA BÁSICA**
14. **BIBLIOGRAFÍA - FUENTES DE CONSULTA**
15. **BIBLIOGRAFÍA COMPLEMENTARIA**

#### ✅ **Funciones de Edición**
- **Agregar Campos:** Cada sección permite agregar múltiples campos
- **Editar Campos:** Cada campo tiene:
  - Título del campo (opcional)
  - Contenido (textarea)
- **Eliminar Campos:** Permite eliminar campos individuales (mínimo 1 por sección)

#### ✅ **Carga desde Word**
- Botón "Subir Word" para cargar documentos `.docx` o `.doc`
- Extracción automática de texto usando `mammoth`
- Detección automática de secciones
- Parsing inteligente de formato "Título: Valor"

#### ✅ **Guardado en Backend**
- Formato JSON estructurado:
```json
{
  "version": "3.0",
  "tipo": "programa_analitico_acordeon",
  "secciones": [
    {
      "nombre": "ASIGNATURA",
      "campos": [
        {
          "titulo": "Nombre",
          "valor": "Programación I"
        }
      ]
    }
  ],
  "metadata": {
    "asignatura": "Programación I",
    "periodo": "2025-2026",
    "nivel": "I",
    "createdAt": "2026-02-02T...",
    "updatedAt": "2026-02-02T..."
  }
}
```

---

## 🔗 Integración con Backend

### **Endpoints Utilizados**

#### 1. **GET** `/api/asignaturas/:id`
- Obtiene información de la asignatura
- Incluye: nombre, nivel, código

#### 2. **GET** `/api/datos-academicos/periodos`
- Obtiene lista de periodos académicos
- Identifica periodo actual con `es_actual`

#### 3. **POST** `/api/programa-analitico`
- Guarda el programa analítico creado
- Payload:
```json
{
  "nombre": "Programa Analítico de [Asignatura]",
  "periodo": "2025-2026",
  "materias": "Nombre de la asignatura",
  "asignatura_id": 31,
  "datos_tabla": {
    "version": "3.0",
    "tipo": "programa_analitico_acordeon",
    "secciones": [...]
  }
}
```

#### 4. **Validación de Duplicados**
- El backend valida que no exista otro programa para la misma asignatura en el mismo periodo
- Retorna error **409 Conflict** si ya existe
- Mensaje: "Ya existe un programa para esta materia en este periodo"

---

## 🎨 Componentes UI Utilizados

### **Shadcn/UI Components**
- ✅ `Accordion` - Acordeones desplegables
- ✅ `AccordionItem` - Items individuales del acordeón
- ✅ `AccordionTrigger` - Encabezado clickeable
- ✅ `AccordionContent` - Contenido desplegable
- ✅ `Card` - Tarjetas contenedoras
- ✅ `Button` - Botones de acción
- ✅ `Input` - Campos de texto simples
- ✅ `Textarea` - Campos de texto multilínea
- ✅ `Select` - Selectores dropdown
- ✅ `Label` - Etiquetas de formulario

### **Iconos Lucide React**
- `FileText` - Icono de documento
- `Upload` - Subir archivo
- `Save` - Guardar
- `ArrowLeft` - Volver
- `Loader2` - Cargando (animado)

---

## 🔄 Flujo de Trabajo

### **Paso 1: Navegación desde Gestión de Asignaturas**
```
/dashboard/comision/asignaturas
  ↓ Click en "Crear Programa"
/dashboard/comision/crear-programa-analitico?asignatura=31&nueva=true
```

### **Paso 2: Carga de Datos**
1. Se obtiene información de la asignatura (ID 31)
2. Se cargan periodos académicos
3. Se inicializan secciones vacías

### **Paso 3: Llenado de Contenido**
**Opción A: Manual**
- Usuario expande cada acordeón
- Completa campos uno por uno
- Agrega campos adicionales según necesidad

**Opción B: Desde Word**
- Usuario hace click en "Subir Word"
- Selecciona archivo `.docx`
- Sistema extrae y organiza contenido automáticamente

### **Paso 4: Guardado**
1. Usuario selecciona periodo académico
2. Verifica nombre del programa
3. Click en "Guardar"
4. Sistema valida y envía al backend
5. Redirección a `/dashboard/comision/asignaturas`

---

## 🛠️ Modificaciones en Archivos Existentes

### **1. Backend: `programaAnaliticoController.js`**
**Métodos Agregados:**
```javascript
exports.create = async (req, res) => {
  // Crear nuevo programa analítico
  // Validación de duplicados por asignatura_id y periodo
}

exports.update = async (req, res) => {
  // Actualizar programa analítico existente
  // Verificación de permisos (solo creador o admin)
}
```

### **2. Backend: `programaAnaliticoRoutes.js`**
**Rutas Agregadas:**
```javascript
// POST /api/programa-analitico
router.post('/', authenticate, authorize(['profesor', 'administrador', 'comision_academica']), programaAnaliticoController.create);

// PUT /api/programa-analitico/:id
router.put('/:id', authenticate, authorize(['profesor', 'administrador', 'comision_academica']), programaAnaliticoController.update);
```

### **3. Frontend: `asignaturas/page.tsx`**
**Enlaces Modificados:**
```tsx
// ANTES:
href={`/dashboard/comision/editor-programa-analitico?asignatura=${asignatura.id}&nueva=true`}

// DESPUÉS:
href={`/dashboard/comision/crear-programa-analitico?asignatura=${asignatura.id}&nueva=true`}
```

---

## 📊 Estructura de Datos JSON Guardada

### **Formato de Sección**
```typescript
interface Campo {
  titulo: string    // Título del campo (opcional)
  valor: string     // Contenido del campo
}

interface Seccion {
  nombre: string    // Nombre de la sección
  campos: Campo[]   // Array de campos
}
```

### **Ejemplo Completo**
```json
{
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
          "valor": "Esta asignatura introduce los fundamentos de la programación..."
        }
      ]
    }
  ],
  "metadata": {
    "asignatura": "Programación I",
    "periodo": "2025-2026",
    "nivel": "I",
    "createdAt": "2026-02-02T10:30:00.000Z",
    "updatedAt": "2026-02-02T10:30:00.000Z"
  }
}
```

---

## ✅ Validaciones Implementadas

### **Frontend**
1. ✅ Periodo académico obligatorio
2. ✅ Nombre del programa obligatorio
3. ✅ Verificación de archivo Word válido (.docx, .doc)
4. ✅ Mínimo 1 campo por sección

### **Backend**
1. ✅ Autenticación JWT obligatoria
2. ✅ Roles permitidos: `comision_academica`, `administrador`, `profesor`
3. ✅ Validación de duplicados por `asignatura_id + periodo`
4. ✅ Campos obligatorios: `nombre`, `periodo`, `datos_tabla`

---

## 🎨 Diseño Visual

### **Colores y Estilos**
- **Header General:** Gradiente azul (`from-blue-500 to-blue-600`)
- **Card Contenido:** Gradiente verde (`from-green-500 to-green-600`)
- **Acordeones:** Fondo gris claro (`bg-gray-100`)
- **Campos:** Fondo gris muy claro (`bg-gray-50`)
- **Botón Guardar:** Verde (`bg-green-600`)

### **Responsive Design**
- Grid de 2 columnas en desktop (`md:grid-cols-2`)
- Columna única en móviles
- Acordeones apilados verticalmente
- Botones adaptables al tamaño de pantalla

---

## 🚀 Próximos Pasos Sugeridos

### **Funcionalidades Adicionales**
1. 🔄 **Edición de programas existentes**
   - Cargar programa guardado en acordeones
   - Permitir modificación de campos
   - Actualizar con PUT endpoint

2. 📄 **Exportación a PDF**
   - Generar PDF estructurado por secciones
   - Incluir formato oficial UNESUM
   - Agregar logos y encabezados

3. 📋 **Plantillas Predefinidas**
   - Guardar configuraciones de campos por carrera
   - Cargar plantillas automáticamente
   - Personalización de secciones

4. 🔍 **Búsqueda y Filtros**
   - Filtrar programas por periodo
   - Búsqueda por asignatura
   - Ordenamiento por fecha de creación

5. 👁️ **Vista Previa**
   - Modal con preview del programa
   - Vista de impresión
   - Comparación con versiones anteriores

---

## 📝 Notas Técnicas

### **Dependencias NPM**
- `mammoth` - Parsing de archivos Word
- `@radix-ui/react-accordion` - Base del componente Accordion
- `lucide-react` - Iconos
- `next/navigation` - Routing de Next.js

### **Optimizaciones Implementadas**
- Carga asíncrona de datos con `Promise.all`
- Estado local para edición de campos (evita re-renders innecesarios)
- Lazy loading de archivo Word con `useRef`
- Validaciones en frontend antes de enviar al backend

---

## 🐛 Problemas Conocidos y Soluciones

### **Problema 1: Error 404 en `/api/programa-analitico`**
**Causa:** Rutas no existían en el backend  
**Solución:** ✅ Agregados endpoints `POST` y `PUT` con autenticación

### **Problema 2: Duplicados no se validaban**
**Causa:** Método `create` no existía en controlador  
**Solución:** ✅ Implementada validación condicional por `asignatura_id`

### **Problema 3: Acordeones no se desplegaban**
**Causa:** Componente Accordion requiere `type="multiple"` para múltiples abiertos  
**Solución:** ✅ Configurado con `type="multiple"` en props

---

## 📞 Soporte y Mantenimiento

**Archivos Clave para Modificar:**
1. `app/dashboard/comision/crear-programa-analitico/page.tsx` - UI principal
2. `my-node-backend/src/controllers/programaAnaliticoController.js` - Lógica de negocio
3. `my-node-backend/src/routes/programaAnaliticoRoutes.js` - Endpoints

**Testing:**
1. Iniciar backend: `cd my-node-backend && npm run dev`
2. Iniciar frontend: `npm run dev`
3. Navegar a: http://localhost:3000/dashboard/comision/asignaturas
4. Seleccionar una asignatura y click en "Crear Programa"

---

## ✨ Características Destacadas

✅ **Interfaz Intuitiva:** Acordeones fáciles de usar  
✅ **Carga Automática:** Upload de Word con parsing inteligente  
✅ **Validación Robusta:** Previene duplicados y errores  
✅ **Diseño Responsive:** Funciona en desktop y móvil  
✅ **Estructura Flexible:** Campos dinámicos agregables  
✅ **Integración Completa:** Backend y frontend sincronizados  

---

**Implementado por:** GitHub Copilot  
**Fecha:** 2 de febrero de 2026  
**Versión:** 3.0 (Formato Acordeón)
