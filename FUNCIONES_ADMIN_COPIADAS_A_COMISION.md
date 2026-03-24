# ✅ Funciones de Syllabus y Programa Analítico para Comisión

## 📋 Resumen

Se han copiado y adaptado **TODAS las funcionalidades del Admin** para el rol **Comisión Académica**, manteniendo las mismas características pero con colores y rutas propias.

---

## 🎯 Páginas Creadas

### 1️⃣ **Dashboard Comisión** (Actualizado)
**Archivo:** `app/dashboard/comision/page.tsx`

**Cambios:**
- ✅ Botones renombrados:
  - ~~"Extraer Programa Analítico"~~ → **"Programa Analítico"**
  - ~~"Extraer Syllabus"~~ → **"Syllabus"**
- ✅ Enlaces actualizados:
  - Programa Analítico → `/dashboard/comision/programa-analitico`
  - Syllabus → `/dashboard/comision/syllabus`

**Módulos disponibles:**
1. 🔵 **Programa Analítico** (Blue)
2. 🟣 **Syllabus** (Purple)
3. 🟠 **Comparar Documentos** (Orange)
4. 🟣 **Syllabus Extraídos** (Violet)

---

### 2️⃣ **Programa Analítico - Comisión** (NUEVO)
**Archivo:** `app/dashboard/comision/programa-analitico/page.tsx`

**Características:**
- ✅ Copia completa de `/dashboard/admin/programa-analitico/page.tsx`
- ✅ Protected con roles: `['comision', 'comision_academica']`
- ✅ Colores azules (theme comisión)
- ✅ Botón "Volver al Dashboard" → `/dashboard/comision`

**Opciones Disponibles:**
1. **Extraer con IA** 🟣
   - Modal: IAExtractorModal
   - Extrae datos automáticamente con Google AI
   - Soporta Excel y Word

2. **Extraer Títulos** 🟡
   - Modal: ExtractorTitulosModal
   - Visualiza títulos detectados
   - Preview antes de subir

3. **Organizar en Pestañas** 🔵
   - Link: `/dashboard/comision/programa-analitico/organizar-pestanas`
   - Organiza títulos en pestañas

**Lista de Programas:**
- Tabla con programas guardados
- Botones: Ver, Editar, Eliminar, Re-limpiar
- Muestra: Carrera, Nivel, Asignatura, Periodo, Docente, Unidades
- Fecha de creación

**Sesiones Extraídas:**
- Componente: `SesionesExtraidasList`
- Historial de extracciones

---

### 3️⃣ **Syllabus - Comisión** (NUEVO)
**Archivo:** `app/dashboard/comision/syllabus/page.tsx`

**Características:**
- ✅ Copia completa de `/dashboard/admin/syllabus/page.tsx`
- ✅ Protected con roles: `['comision', 'comision_academica']`
- ✅ Colores morados (theme syllabus)
- ✅ Botón "Volver al Dashboard" → `/dashboard/comision`

**Pestañas:**

#### **Pestaña 1: Lista de Syllabus** 📄
- Búsqueda por: asignatura, código, profesor
- Botón: "Extraer Títulos de Syllabus" → `/dashboard/comision/syllabus/extraer-titulos`
- Tarjetas de Syllabus con:
  - Asignatura
  - Código
  - Carrera
  - Periodo
  - Nivel
  - Profesor
  - Estado (badge morado)
  - Botones: Ver, Editar, Eliminar

#### **Pestaña 2: Subir Documento** 📤
- Instrucciones de uso
- Botón grande: "Ir a Subir Documento" → `/dashboard/comision/syllabus/extraer-titulos`
- Características:
  - ✅ Extracción automática de títulos
  - ✅ Compatible con Word (.docx)
  - ✅ Guarda contenido estructurado
  - ✅ Asocia con periodo y materias

---

## 🎨 Diferencias con Admin

| Característica | Admin | Comisión |
|----------------|-------|----------|
| **Color Programa Analítico** | Emerald/Green | Blue |
| **Color Syllabus** | Emerald/Green | Purple |
| **Ruta Base** | `/dashboard/admin/` | `/dashboard/comision/` |
| **Roles Permitidos** | `['administrador']` | `['comision', 'comision_academica']` |
| **Header** | MainHeader | MainHeader (igual) |
| **Funcionalidades** | TODAS ✅ | TODAS ✅ |

---

## 🔗 Rutas Completas

### Dashboard Principal
```
/dashboard/comision
```

### Programa Analítico
```
/dashboard/comision/programa-analitico                    # Página principal (NUEVA)
/dashboard/comision/programa-analitico/extraer-titulos    # Ya existía
/dashboard/comision/programa-analitico/organizar-pestanas # Pendiente
```

### Syllabus
```
/dashboard/comision/syllabus                    # Página principal (NUEVA)
/dashboard/comision/syllabus/extraer-titulos    # Ya existía
/dashboard/comision/syllabus/organizar-pestanas # Pendiente
```

### Comparación
```
/dashboard/comision/comparar-documentos  # Ya existe
```

---

## ✅ Funcionalidades Implementadas

### En Programa Analítico:

#### **Extraer con IA** 🤖
- [x] Modal IAExtractorModal
- [x] Sube archivo Excel/Word
- [x] Google AI extrae automáticamente
- [x] Guarda en base de datos
- [x] Preview de datos extraídos

#### **Extraer Títulos** 📝
- [x] Modal ExtractorTitulosModal
- [x] Preview de títulos detectados
- [x] Valida antes de guardar
- [x] Muestra estructura del documento

#### **Organizar Pestañas** 🗂️
- [x] Botón creado
- [ ] Página pendiente de crear
- [ ] Organizará títulos en tabs

#### **Lista de Programas** 📋
- [x] Fetch desde API
- [x] Muestra todos los campos
- [x] Botones de acción
- [x] Loading state
- [x] Error handling

#### **Acciones sobre Programas** ⚙️
- [x] Ver detalles (Eye)
- [x] Editar (Edit)
- [x] Eliminar (Trash2)
- [x] Re-limpiar duplicados (Eraser)

#### **Sesiones Extraídas** 📊
- [x] Componente SesionesExtraidasList
- [x] Historial de extracciones
- [x] Filtros disponibles

---

### En Syllabus:

#### **Lista de Syllabus** 📄
- [x] Búsqueda en tiempo real
- [x] Filtro por: asignatura, código, profesor
- [x] Tarjetas con información completa
- [x] Badges de estado
- [x] Botones de acción

#### **Extraer Títulos** 📤
- [x] Página ya existía
- [x] Sube Excel/Word
- [x] Selector de periodo
- [x] Manejo de errores 401
- [x] No cierra sesión si falla periodo

#### **Información Mostrada** ℹ️
- [x] Código de asignatura
- [x] Nombre de asignatura
- [x] Carrera
- [x] Periodo académico
- [x] Nivel
- [x] Profesor
- [x] Estado (badge)
- [x] Fecha de creación

#### **Acciones disponibles** 🎯
- [x] Ver detalles (Eye icon)
- [x] Editar (Edit icon)
- [x] Eliminar (Trash2 icon)

---

## 🔧 Componentes Compartidos

Estos componentes son usados tanto por **Admin** como por **Comisión**:

### Programa Analítico:
- ✅ `IAExtractorModal` - Modal de extracción con IA
- ✅ `ExtractorTitulosModal` - Modal de preview de títulos
- ✅ `SesionesExtraidasList` - Lista de sesiones guardadas

### UI Components:
- ✅ `ProtectedRoute` - Protección de rutas por rol
- ✅ `MainHeader` - Header con usuario y logout
- ✅ `Card`, `Button`, `Input` - shadcn/ui components
- ✅ `Tabs` - Pestañas de navegación

---

## 🚀 Cómo Usar

### 1. Acceder al Dashboard
```
http://localhost:3000/login
Usuario: comision@unesum.edu.ec
Password: comision123
```

### 2. Navegar a Programa Analítico
- Clic en tarjeta **"Programa Analítico"** (azul)
- Verás 3 opciones:
  - **Extraer con IA**: Usa Google AI
  - **Extraer Títulos**: Preview de títulos
  - **Organizar Pestañas**: Organiza estructura

### 3. Navegar a Syllabus
- Clic en tarjeta **"Syllabus"** (morado)
- Verás 2 pestañas:
  - **Lista de Syllabus**: Ver todos los syllabus
  - **Subir Documento**: Ir a extracción

### 4. Extraer Títulos (Programa Analítico)
1. Clic en **"Extractor de Títulos"**
2. Selecciona archivo Excel/Word
3. Clic "Extraer Títulos"
4. Revisa preview
5. Guarda si es correcto

### 5. Extraer Títulos (Syllabus)
1. Clic en **"Extraer Títulos de Syllabus"**
2. Selecciona periodo (opcional)
3. Sube archivo
4. Clic "Extraer Títulos"
5. Organiza en pestañas (si quieres)

---

## 📊 Estado de Implementación

| Funcionalidad | Admin | Comisión | Estado |
|---------------|-------|----------|--------|
| Dashboard | ✅ | ✅ | Completo |
| Programa Analítico - Página Principal | ✅ | ✅ | Completo |
| Syllabus - Página Principal | ✅ | ✅ | Completo |
| Extraer con IA | ✅ | ✅ | Completo |
| Extraer Títulos PA | ✅ | ✅ | Completo |
| Extraer Títulos Syllabus | ✅ | ✅ | Completo |
| Organizar Pestañas PA | ✅ | ⚠️ | Pendiente página |
| Organizar Pestañas Syllabus | ✅ | ⚠️ | Pendiente página |
| Lista de Programas | ✅ | ✅ | Completo |
| Lista de Syllabus | ✅ | ✅ | Completo |
| Sesiones Extraídas | ✅ | ✅ | Completo |
| Ver detalles | ✅ | ✅ | Completo |
| Editar | ✅ | ✅ | Completo |
| Eliminar | ✅ | ✅ | Completo |
| Re-limpiar | ✅ | ✅ | Completo |
| Comparar Documentos | ✅ | ✅ | Ya existía |

---

## 📝 Tareas Pendientes

### Alta Prioridad:
- [ ] Crear página: `/dashboard/comision/programa-analitico/organizar-pestanas`
- [ ] Crear página: `/dashboard/comision/syllabus/organizar-pestanas`
- [ ] Probar flujo completo de extracción

### Media Prioridad:
- [ ] Agregar más campos a los filtros de búsqueda
- [ ] Implementar paginación si hay muchos registros
- [ ] Agregar export a PDF/Excel

### Baja Prioridad:
- [ ] Animaciones de transición
- [ ] Toast notifications en lugar de alerts
- [ ] Dark mode

---

## 🐛 Problemas Conocidos

### ✅ Resueltos:
- ✅ Error 401 en `/api/periodo` ya NO cierra sesión
- ✅ Hydration error solucionado
- ✅ Session breaking solucionado

### ⚠️ Por Resolver:
- ⚠️ Backend `/api/periodo` necesita agregar roles comisión a authorize
- ⚠️ Páginas "organizar-pestanas" no existen aún

---

## 🎯 Próximos Pasos

1. **Probar todo el flujo:**
   ```bash
   # 1. Iniciar backend
   cd my-node-backend
   npm run dev

   # 2. Iniciar frontend (otra terminal)
   cd ..
   npm run dev

   # 3. Login como comisión
   http://localhost:3000/login
   ```

2. **Verificar cada módulo:**
   - [ ] Dashboard carga correctamente
   - [ ] Programa Analítico muestra 3 opciones
   - [ ] Syllabus muestra 2 pestañas
   - [ ] Modals funcionan
   - [ ] Fetch de datos funciona
   - [ ] No hay errores 500

3. **Crear páginas faltantes:**
   - Organizar Pestañas (Programa Analítico)
   - Organizar Pestañas (Syllabus)

4. **Ajustar permisos backend:**
   - Agregar `comision` y `comision_academica` a rutas necesarias
   - Verificar `/api/periodo`
   - Verificar `/api/programa-analitico`
   - Verificar `/api/syllabus-extraction`

---

## 📖 Documentación de Referencia

### Archivos Creados:
1. `app/dashboard/comision/programa-analitico/page.tsx` (NUEVO - 458 líneas)
2. `app/dashboard/comision/syllabus/page.tsx` (NUEVO - 292 líneas)
3. `app/dashboard/comision/page.tsx` (ACTUALIZADO - titles y hrefs)

### Archivos ya existentes:
- `app/dashboard/comision/programa-analitico/extraer-titulos/page.tsx` ✅
- `app/dashboard/comision/syllabus/extraer-titulos/page.tsx` ✅
- `app/dashboard/comision/comparar-documentos/page.tsx` ✅

### Componentes compartidos:
- `components/programa-analitico/ia-extractor-modal.tsx`
- `components/programa-analitico/extractor-titulos-modal.tsx`
- `components/programa-analitico/sesiones-extraidas-list.tsx`
- `components/auth/protected-route.tsx`
- `components/layout/main-header.tsx`

---

**Última actualización:** Enero 7, 2026  
**Estado:** ✅ Páginas principales creadas - Funcionalidades completas - Listo para probar
