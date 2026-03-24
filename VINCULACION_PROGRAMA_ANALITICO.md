# 📋 Vinculación del Programa Analítico - Sistema UNESUM

## ✅ Estado de Implementación

### Frontend (Next.js)

#### 1. Panel de Administrador
**Ubicación:** `/app/dashboard/admin/page.tsx`

✅ **Módulo "Programa Analítico" agregado:**
- **Icono:** ClipboardList
- **Descripción:** Gestionar programas analíticos y plantillas
- **Ruta:** `/dashboard/admin/programa-analitico`
- **Color:** Cyan (bg-cyan-500)

✅ **Módulo "Editor de Tablas" agregado:**
- **Icono:** Edit3
- **Descripción:** Crear y editar programas analíticos con tablas
- **Ruta:** `/dashboard/admin/editor-tablas`
- **Color:** Verde (bg-green-500)

---

#### 2. Página Principal de Programa Analítico
**Ubicación:** `/app/dashboard/admin/programa-analitico/page.tsx`

**Funcionalidades:**
- ✅ Lista todos los programas analíticos guardados
- ✅ Permite crear nuevos programas desde formulario
- ✅ Permite importar programas desde Excel
- ✅ Acciones disponibles por programa:
  - 👁️ **Ver** programa
  - ✏️ **Editar** programa
  - 👤 **Asignar** a docente
  - 🗑️ **Eliminar** programa

**Tarjetas de Opciones:**
1. **Crear Nuevo** → `/dashboard/admin/programa-analitico/dinamico`
2. **Importar desde Excel** → `/dashboard/admin/programa-analitico/lista`

---

#### 3. Rutas Disponibles

```
/dashboard/admin/programa-analitico/
├── page.tsx                    # Página principal (lista)
├── crear/
│   └── page.tsx               # Crear programa (formulario estático)
├── dinamico/
│   └── page.tsx               # Crear programa (formulario dinámico con BD)
├── lista/
│   └── page.tsx               # Gestión de Excel
├── asignar/
│   └── [id]/
│       └── page.tsx           # Asignar programa a docente
└── README.md                   # Documentación del módulo
```

---

#### 4. Componente de Formulario Dinámico
**Ubicación:** `/components/programa-analitico/formulario-dinamico.tsx`

**Características:**
- ✅ Renderiza secciones de tipo texto largo
- ✅ Renderiza secciones de tipo tabla
- ✅ Gestión de filas dinámicas en tablas
- ✅ Validación de campos requeridos
- ✅ Guarda contenido en formato JSON
- ✅ Muestra/oculta secciones opcionales

**Props:**
```typescript
interface FormularioDinamicoProps {
  secciones: SeccionFormulario[]
  datosGenerales?: Record<string, any>
  contenidoInicial?: Record<string, any>
  onGuardar: (contenido: Record<string, any>) => Promise<void>
  onCancelar?: () => void
  guardando?: boolean
  error?: string | null
}
```

---

### Backend (Node.js/Express)

#### Rutas API
**Base:** `http://localhost:4000/api/programa-analitico`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/plantilla` | Descargar plantilla Excel | ❌ |
| GET | `/estructura-formulario` | Obtener estructura del formulario desde BD | ✅ |
| POST | `/upload` | Subir programa desde Excel | ✅ |
| GET | `/` | Obtener todos los programas | ✅ |
| GET | `/disponibles` | Programas disponibles con plantillas | ✅ |
| GET | `/mis-programas` | Programas del docente autenticado | ✅ |
| GET | `/docente/:profesorId` | Programas de un docente específico | ✅ |
| POST | `/asignar` | Asignar programa a docente | ✅ |
| GET | `/:id/plantilla` | Programa con estructura completa | ✅ |
| POST | `/:id/guardar-contenido` | Guardar contenido llenado | ✅ |
| GET | `/:id/contenido-docente` | Obtener contenido guardado | ✅ |
| PUT | `/:id/contenido` | Actualizar contenido | ✅ |

---

## 🎯 Flujo de Trabajo

### Para Administradores:

1. **Acceder al módulo:**
   - Dashboard Admin → Click en "Programa Analítico"

2. **Crear un nuevo programa:**
   - Opción A: Click en "Crear Nuevo Programa" (formulario dinámico)
   - Opción B: Click en "Gestionar Excel" → Subir archivo Excel

3. **Gestionar programas existentes:**
   - Ver lista de todos los programas
   - Ver detalles (ícono 👁️)
   - Editar programa (ícono ✏️)
   - Asignar a docente (ícono 👤)
   - Eliminar programa (ícono 🗑️)

### Para Docentes:

1. **Ver programas asignados:**
   - Dashboard Docente → "Mis Programas Analíticos"

2. **Llenar programa:**
   - Seleccionar programa asignado
   - Llenar formulario dinámico con secciones y tablas
   - Guardar progreso

3. **Descargar plantilla:**
   - Puede descargar la plantilla Excel base si lo requiere

---

## 📊 Estructura de Datos

### Programa Analítico (Base de Datos)

```typescript
interface ProgramaAnalitico {
  id: number
  nombre: string
  datos_tabla: {
    datos_generales?: {
      carrera?: string
      nivel?: string
      asignatura?: string
      periodo_academico?: string
      docente?: string
    }
    fecha_creacion?: string
    unidades_tematicas?: any[]
  }
  createdAt: string
  updatedAt: string
}
```

### Sección de Formulario

```typescript
interface SeccionFormulario {
  id?: number
  titulo: string
  descripcion?: string
  tipo: 'texto_largo' | 'tabla'
  orden?: number
  obligatoria?: boolean
  encabezados?: string[]     // Para tipo 'tabla'
  campos?: Campo[]           // Campos de la sección
  num_filas?: number        // Para tipo 'tabla'
}
```

---

## 🚀 Cómo Probar

### 1. Verificar que el backend esté corriendo:
```powershell
cd my-node-backend
npm run dev
```

### 2. Verificar que el frontend esté corriendo:
```powershell
npm run dev
```

### 3. Acceder al sistema:
1. Abrir navegador: `http://localhost:3000`
2. Iniciar sesión como administrador
3. Ir a Dashboard → "Programa Analítico"
4. Deberías ver la página principal con las opciones

### 4. Probar funcionalidades:
- ✅ Ver lista de programas
- ✅ Crear nuevo programa dinámico
- ✅ Importar desde Excel
- ✅ Ver detalles de un programa
- ✅ Editar programa
- ✅ Asignar a docente
- ✅ Eliminar programa

---

## 🔧 Configuración Adicional

### Variables de Entorno (.env)
```env
# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/unesum_db
JWT_SECRET=tu_secreto_aqui
PORT=4000

# Frontend (Next.js)
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 📝 Notas Importantes

1. **Autenticación:** Todas las rutas del frontend están protegidas con `<ProtectedRoute>`
2. **Roles:** Solo administradores pueden acceder a `/dashboard/admin/programa-analitico`
3. **Tokens:** El sistema usa JWT Bearer tokens para autenticación
4. **Excel:** La plantilla Excel debe seguir el formato específico
5. **Formulario Dinámico:** Las secciones se cargan desde la base de datos

---

## 🐛 Troubleshooting

### Error: "No se pueden cargar los programas"
- Verificar que el backend esté corriendo
- Verificar la URL del API en las peticiones fetch
- Revisar el token de autenticación

### Error: "No autorizado"
- Verificar que el usuario tenga rol de administrador
- Verificar que el token JWT sea válido

### No aparece el módulo en el dashboard
- Limpiar caché del navegador
- Verificar que el archivo `page.tsx` tenga los cambios guardados
- Reiniciar el servidor de desarrollo Next.js

---

## ✨ Características Implementadas

✅ Panel administrativo con tarjeta de acceso
✅ Lista de programas analíticos con filtros
✅ Creación de programas con formulario dinámico
✅ Importación desde Excel
✅ Visualización de detalles
✅ Edición de programas
✅ Asignación a docentes
✅ Eliminación de programas
✅ Componente de formulario dinámico reutilizable
✅ API REST completa en backend
✅ Autenticación y autorización
✅ Validación de datos
✅ Manejo de errores

---

## 📚 Documentación Adicional

- **README del módulo:** `/app/dashboard/admin/programa-analitico/README.md`
- **Diseño de BD:** `/my-node-backend/DISEÑO_BD_PROGRAMA_ANALITICO.md`
- **Implementación:** `/my-node-backend/IMPLEMENTACION_PROGRAMA_ANALITICO.md`
- **Flujo Excel:** `/my-node-backend/FLUJO_EXCEL_A_PLANTILLA.md`

---

## 🎨 Estilos y Componentes UI

El módulo usa los componentes de **shadcn/ui**:
- Card, CardHeader, CardContent
- Button
- Input, Label, Textarea
- Table
- Tabs
- Dialog
- Select
- Alert

**Paleta de colores:**
- Verde principal: `#00563F` (UNESUM)
- Emerald: Acciones principales
- Blue: Importar/Excel
- Purple: Asignar
- Red: Eliminar

---

## 🔄 Próximas Mejoras Sugeridas

- [ ] Exportar programas a PDF
- [ ] Duplicar programas existentes
- [ ] Histórico de versiones
- [ ] Notificaciones a docentes cuando se les asigna
- [ ] Búsqueda y filtros avanzados
- [ ] Estadísticas de uso
- [ ] Preview antes de guardar
- [ ] Validación de datos más robusta

---

**Última actualización:** 6 de diciembre de 2025
**Desarrollado para:** UNESUM - Sistema de Gestión Académica
