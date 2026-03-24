Columns
Add column
id
SERIAL
PRIMARY KEY
nombre
VARCHAR(255)
UNIQUE
NOT NULL
facultad_id
INTEGER
NOT NULL
Constraints
Add constraint
CONSTRAINT
carreras_facultad_id_fkey
FOREIGN KEY
(facultad_id)
REFERENCES
public.facultades
(id)
ON UPDATECASCADE
ON DELETECASCADE
CONSTRAINT
carreras_nombre_key
UNIQUE
(nombre)
CONSTRAINT
carreras_pkey
PRIMARY KEY
(id)
Indexes
Add index
UNIQUE
INDEX
carreras_nombre_key
…
USING
BTREE
(nombre)
UNIQUE
INDEX
carreras_pkey
…
USING
BTREE
(id)
INDEX
idx_carreras_facultad_id
…
USING
BTREE
(facultad_id)
Policies
Add policy# 🏫 SISTEMA DE GESTIÓN DE ASIGNATURAS - COMISIÓN ACADÉMICA

## 📋 Resumen Ejecutivo

Se ha implementado un sistema completo que permite a la **Comisión Académica** gestionar todas las asignaturas de su facultad, con la capacidad de crear y administrar Syllabus y Programas Analíticos para cada materia.

---

## 🎯 Funcionalidades Implementadas

### 1. **Backend - Nuevos Endpoints**

#### 📡 Rutas Implementadas

**Base URL:** `/api/comision-academica`

##### A. Obtener Estructura de Facultad
```http
GET /api/comision-academica/estructura-facultad
Authorization: Bearer <token>
Roles: administrador, comision_academica, comision
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "facultad": {
      "id": 1,
      "nombre": "Facultad de Ciencias de la Salud"
    },
    "carreras": [
      {
        "id": 1,
        "nombre": "Enfermería",
        "mallas": [...],
        "asignaturas": [
          {
            "id": 1,
            "nombre": "Anatomía I",
            "codigo": "ENF-101",
            "nivel": "Primer Nivel",
            "estado": "activo",
            "tiene_syllabus": false,
            "tiene_programa": false
          }
        ]
      }
    ]
  }
}
```

##### B. Obtener Asignaturas de una Carrera
```http
GET /api/comision-academica/carreras/:carrera_id/asignaturas
Authorization: Bearer <token>
Roles: administrador, comision_academica, comision
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "carrera": {
      "id": 1,
      "nombre": "Enfermería",
      "facultad": "Facultad de Ciencias de la Salud"
    },
    "asignaturas": [
      {
        "id": 1,
        "nombre": "Anatomía I",
        "codigo": "ENF-101",
        "estado": "activo",
        "nivel": "Primer Nivel",
        "organizacion": "Organización Curricular 1",
        "tiene_syllabus": true,
        "syllabus_id": 5,
        "tiene_programa": false,
        "programa_id": null
      }
    ]
  }
}
```

---

### 2. **Filtrado Automático por Facultad**

#### 🔒 Seguridad Implementada

Todos los endpoints filtran automáticamente por la facultad del usuario:

**Carreras:**
- `GET /api/carreras` - Solo muestra carreras de su facultad
- `POST /api/carreras` - Solo puede crear en su facultad
- `PUT /api/carreras/:id` - Solo puede editar de su facultad
- `DELETE /api/carreras/:id` - Solo puede eliminar de su facultad

**Mallas:**
- `GET /api/mallas` - Solo muestra mallas de su facultad
- `POST /api/mallas` - Solo puede crear en su facultad
- `PUT /api/mallas/:id` - Solo puede editar de su facultad
- `DELETE /api/mallas/:id` - Solo puede eliminar de su facultad

**Asignaturas:**
- `GET /api/asignaturas` - Solo muestra asignaturas de carreras de su facultad
- `POST /api/asignaturas` - Solo puede crear en carreras de su facultad
- `PUT /api/asignaturas/:id` - Solo puede editar de su facultad
- `DELETE /api/asignaturas/:id` - Solo puede eliminar de su facultad

**Facultades:**
- `GET /api/facultades` - Acceso completo para todos

---

### 3. **Frontend - Nueva Interfaz**

#### 📱 Página: `/dashboard/comision/asignaturas`

**Características:**

1. **Vista de Facultad**
   - Muestra el nombre de la facultad del usuario
   - Estadísticas generales

2. **Selección de Carrera**
   - Botones para cada carrera de la facultad
   - Badge con número de asignaturas por carrera

3. **Estadísticas en Tiempo Real**
   - Total de asignaturas
   - Asignaturas con Syllabus
   - Asignaturas con Programa Analítico
   - Asignaturas completas (ambos documentos)
   - Asignaturas pendientes

4. **Lista de Asignaturas**
   - Nombre y código de la asignatura
   - Nivel académico
   - Indicadores visuales de estado (✓/✗)
   - Botones de acción contextuales

5. **Acciones por Asignatura**

   **Si NO tiene Syllabus:**
   - ✨ **Crear Syllabus** → Redirige al editor con parámetros para nueva creación

   **Si tiene Syllabus:**
   - 📖 **Ver Syllabus** → Abre el editor con el syllabus existente

   **Si NO tiene Programa Analítico:**
   - ✨ **Crear Programa** → Redirige al editor para nueva creación

   **Si tiene Programa Analítico:**
   - 📄 **Ver Programa** → Abre el editor con el programa existente

---

## 🎨 Interfaz de Usuario

### Panel Principal

```
┌─────────────────────────────────────────────────────────────┐
│ 🏫 Gestión de Asignaturas                                   │
│ Facultad: Facultad de Ciencias de la Salud                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Seleccionar Carrera:                                        │
│ [Enfermería (25)] [Medicina (30)] [Laboratorio (15)]       │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Estadísticas:                                               │
│ ┌────────┬────────┬────────┬────────┬────────┐            │
│ │ Total  │Syllabus│Programa│Completo│Pendiente│            │
│ │   25   │   15   │   10   │    8   │   17   │            │
│ └────────┴────────┴────────┴────────┴────────┘            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Asignaturas de Enfermería:                                  │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Anatomía I  [ENF-101] [Primer Nivel]                    ││
│ │ ✓ Syllabus  ✗ Programa                                  ││
│ │ [Ver Syllabus] [Crear Programa]                         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Fisiología I  [ENF-102] [Primer Nivel]                  ││
│ │ ✗ Syllabus  ✗ Programa                                  ││
│ │ [Crear Syllabus] [Crear Programa]                       ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Archivos Modificados/Creados

### Backend

1. **`my-node-backend/src/controllers/comisionAcademicaController.js`**
   - ✅ `obtenerEstructuraFacultad()` - Nuevo método
   - ✅ `obtenerAsignaturasCarrera()` - Nuevo método

2. **`my-node-backend/src/routes/comisionAcademica.routes.js`**
   - ✅ `GET /estructura-facultad`
   - ✅ `GET /carreras/:carrera_id/asignaturas`

3. **`my-node-backend/src/routes/carrera.routes.js`** (NUEVO)
   - ✅ Rutas CRUD para carreras con filtrado por facultad

4. **`my-node-backend/src/routes/facultad.routes.js`** (NUEVO)
   - ✅ Rutas para gestión de facultades

5. **`my-node-backend/src/routes/index.js`**
   - ✅ Agregadas rutas `/carreras` y `/facultades`

6. **`my-node-backend/src/controllers/carrera.controller.js`**
   - ✅ Filtrado por facultad en `getAll()`
   - ✅ Validación de permisos en `create()`
   - ✅ Validación de permisos en `update()`
   - ✅ Validación de permisos en `delete()`

7. **`my-node-backend/src/controllers/mallaController.js`**
   - ✅ Filtrado por facultad en `getAllMallas()`
   - ✅ Validación de permisos en `createMalla()`
   - ✅ Validación de permisos en `updateMalla()`
   - ✅ Validación de permisos en `deleteMalla()`

8. **`my-node-backend/src/controllers/asignatura.Controller.js`**
   - ✅ Filtrado por facultad en `getAll()`
   - ✅ Validación de permisos en operaciones CRUD

9. **`my-node-backend/src/routes/malla.routes.js`**
   - ✅ Agregados permisos `comision_academica` y `comision`

10. **`my-node-backend/src/routes/asignaturaRoutes.js`**
    - ✅ Agregados permisos `comision_academica` y `comision`

### Frontend

1. **`app/dashboard/comision/asignaturas/page.tsx`** (NUEVO)
   - ✅ Página completa de gestión de asignaturas
   - ✅ Selección de carrera
   - ✅ Estadísticas en tiempo real
   - ✅ Lista interactiva de asignaturas
   - ✅ Botones de acción contextuales

2. **`app/dashboard/comision/page.tsx`**
   - ✅ Agregado módulo "Gestión de Asignaturas" destacado
   - ✅ Reorganizada la interfaz con 3 herramientas principales

---

## 🚀 Flujo de Trabajo

### Para Comisión Académica

1. **Login** → Ingresa al sistema con rol `comision_academica`

2. **Dashboard** → Ve el panel principal con las opciones:
   - 🏫 **Gestión de Asignaturas** (NUEVO - Destacado)
   - 📝 Editor de Syllabus
   - 📄 Editor de Programa Analítico

3. **Gestión de Asignaturas** → Clic en el módulo destacado

4. **Seleccionar Carrera** → Elige una carrera de su facultad

5. **Ver Asignaturas** → Lista completa con estado de cada materia

6. **Crear/Editar Documentos:**
   - Si falta Syllabus → Clic en "Crear Syllabus"
   - Si falta Programa → Clic en "Crear Programa"
   - Si ya existen → Clic en "Ver Syllabus" o "Ver Programa"

7. **Editor** → Se abre el editor correspondiente con:
   - Datos de la asignatura precargados
   - Interfaz de tablas y pestañas
   - Opciones de guardar e imprimir

---

## 📊 Base de Datos

### Relaciones Clave

```
facultades (id, nombre)
    ↓ 1:N
carreras (id, nombre, facultad_id)
    ↓ 1:N
asignaturas (id, nombre, codigo, carrera_id, nivel_id, organizacion_id)
    ↓ 1:1
syllabi (id, asignatura_id, ...)
    ↓ 1:1
programas_analiticos (id, asignatura_id, ...)
```

### Tabla: usuarios

```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombres VARCHAR(100),
  apellidos VARCHAR(100),
  cedula_identidad VARCHAR(20) UNIQUE,
  correo_electronico VARCHAR(255) UNIQUE,
  rol VARCHAR(50), -- 'comision_academica', 'comision', 'administrador', etc.
  facultad VARCHAR(100), -- Nombre de la facultad asignada
  carrera VARCHAR(100),
  contraseña VARCHAR(255),
  estado BOOLEAN DEFAULT true
);
```

---

## ✅ Verificación de Permisos

### Matriz de Permisos

| Acción                    | Admin | Comisión Acad. | Comisión | Profesor |
|---------------------------|-------|----------------|----------|----------|
| Ver facultades            | ✅    | ✅             | ✅       | ❌       |
| Crear/editar facultades   | ✅    | ❌             | ❌       | ❌       |
| Ver carreras (su fac.)    | ✅    | ✅             | ✅       | ❌       |
| Crear carreras (su fac.)  | ✅    | ✅             | ❌       | ❌       |
| Ver mallas (su fac.)      | ✅    | ✅             | ✅       | ❌       |
| Crear mallas (su fac.)    | ✅    | ✅             | ❌       | ❌       |
| Ver asignaturas (su fac.) | ✅    | ✅             | ✅       | ✅       |
| Crear asignaturas         | ✅    | ✅             | ❌       | ❌       |
| Crear syllabus            | ✅    | ✅             | ❌       | ✅       |
| Crear programa analítico  | ✅    | ✅             | ❌       | ✅       |

---

## 🎯 Ejemplo de Uso

### Caso: Crear Syllabus para "Anatomía I"

1. **Login como Comisión Académica**
   ```
   Usuario: comision@unesum.edu.ec
   Facultad: Facultad de Ciencias de la Salud
   ```

2. **Ir a Gestión de Asignaturas**
   ```
   /dashboard/comision/asignaturas
   ```

3. **Seleccionar Carrera: Enfermería**

4. **Buscar "Anatomía I"**
   - Estado: ✗ Syllabus | ✗ Programa
   - Ver botón: [Crear Syllabus]

5. **Clic en "Crear Syllabus"**
   - Redirige a: `/dashboard/admin/editor-syllabus?asignatura=1&nueva=true`

6. **Editor se Abre**
   - Datos de asignatura precargados
   - Pestañas personalizables
   - Tablas editables

7. **Completar y Guardar**
   - Se guarda en BD
   - Ahora aparece: ✅ Syllabus | ✗ Programa

---

## 🐛 Validaciones Implementadas

### En el Backend

1. **Validación de Facultad:**
   ```javascript
   if (user.rol === 'comision_academica' || user.rol === 'comision') {
     if (carrera.facultad.nombre !== user.facultad) {
       return res.status(403).json({ 
         message: 'No tienes permisos para acceder a esta carrera' 
       });
     }
   }
   ```

2. **Validación de Carrera-Facultad:**
   ```javascript
   const carrera = await Carrera.findOne({
     where: { 
       id: carrera_id,
       facultad_id: facultad_id
     }
   });
   ```

3. **Validación de Existencia:**
   - Verifica que la facultad exista
   - Verifica que la carrera exista
   - Verifica que la asignatura exista

---

## 📝 Próximos Pasos Recomendados

1. ✅ **Implementado:** Backend con filtrado por facultad
2. ✅ **Implementado:** Endpoints de estructura jerárquica
3. ✅ **Implementado:** Interfaz de gestión de asignaturas
4. ⏳ **Pendiente:** Sincronización entre editores y lista de asignaturas
5. ⏳ **Pendiente:** Sistema de notificaciones cuando se completa un documento
6. ⏳ **Pendiente:** Reportes de progreso por facultad
7. ⏳ **Pendiente:** Exportación masiva de documentos

---

## 🔍 Testing

### Probar la Funcionalidad

**1. Probar Backend:**
```bash
# Terminal 1
cd my-node-backend
npm run dev

# Terminal 2 - Probar endpoint
curl -X GET "http://localhost:4000/api/comision-academica/estructura-facultad" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**2. Probar Frontend:**
```bash
# Terminal
npm run dev

# Browser
http://localhost:3000/dashboard/comision/asignaturas
```

---

## 📞 Soporte

Si tienes preguntas o encuentras problemas:

1. Revisa los logs del servidor backend
2. Verifica que el usuario tenga `facultad` asignada
3. Confirma que existan carreras en esa facultad
4. Verifica que las asignaturas estén relacionadas con las carreras

---

## ✨ Resumen

✅ **Sistema Completo de Gestión**
- Comisión Académica puede ver todas las asignaturas de su facultad
- Filtrado automático por facultad en todos los endpoints
- Interfaz visual intuitiva con estadísticas
- Creación directa de Syllabus y Programas Analíticos
- Validaciones de seguridad en todos los niveles

🎯 **Resultado:** La comisión académica ahora tiene control total sobre las asignaturas de su facultad y puede gestionar eficientemente la creación de documentos académicos.
