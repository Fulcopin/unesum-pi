# 🎯 SISTEMA COMISIÓN ACADÉMICA - RESUMEN VISUAL

## 📊 Vista General del Sistema

```mermaid
graph TD
    A[Usuario Comisión Académica] --> B[Login]
    B --> C[Dashboard Principal]
    C --> D[Gestión de Asignaturas]
    C --> E[Editor de Syllabus]
    C --> F[Editor Programa Analítico]
    
    D --> G[Seleccionar Carrera]
    G --> H[Ver Asignaturas]
    H --> I{¿Tiene Syllabus?}
    I -->|No| J[Crear Syllabus]
    I -->|Sí| K[Ver/Editar Syllabus]
    
    H --> L{¿Tiene Programa?}
    L -->|No| M[Crear Programa]
    L -->|Sí| N[Ver/Editar Programa]
    
    J --> E
    K --> E
    M --> F
    N --> F
```

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  /dashboard/comision/asignaturas                        │
│  ├── Selección de Carrera                               │
│  ├── Estadísticas en Tiempo Real                        │
│  └── Lista de Asignaturas con Acciones                  │
│                                                          │
│  /dashboard/admin/editor-syllabus                       │
│  ├── Editor de Pestañas                                 │
│  ├── Tablas Interactivas                                │
│  └── Guardar/Imprimir                                   │
│                                                          │
│  /dashboard/comision/editor-programa-analitico          │
│  ├── Editor de Pestañas                                 │
│  ├── Editor JSON                                        │
│  └── Guardar/Exportar                                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────┐
│               BACKEND (Node.js + Express)                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  /api/comision-academica/estructura-facultad            │
│  └── GET: Retorna facultad, carreras y asignaturas      │
│                                                          │
│  /api/comision-academica/carreras/:id/asignaturas       │
│  └── GET: Retorna asignaturas con estado de docs        │
│                                                          │
│  /api/carreras                                           │
│  ├── GET: Lista carreras (filtrado por facultad)        │
│  ├── POST: Crear carrera (validación de facultad)       │
│  ├── PUT: Actualizar carrera (solo su facultad)         │
│  └── DELETE: Eliminar carrera (solo su facultad)        │
│                                                          │
│  /api/mallas                                             │
│  ├── GET: Lista mallas (filtrado por facultad)          │
│  ├── POST: Crear malla (validación de facultad)         │
│  ├── PUT: Actualizar malla (solo su facultad)           │
│  └── DELETE: Eliminar malla (solo su facultad)          │
│                                                          │
│  /api/asignaturas                                        │
│  ├── GET: Lista asignaturas (filtrado por facultad)     │
│  ├── POST: Crear asignatura (validación de facultad)    │
│  ├── PUT: Actualizar asignatura (solo su facultad)      │
│  └── DELETE: Eliminar asignatura (solo su facultad)     │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          ↕ SQL
┌─────────────────────────────────────────────────────────┐
│              BASE DE DATOS (PostgreSQL)                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  usuarios                                                │
│  ├── id, nombres, apellidos                             │
│  ├── rol (comision_academica, ...)                      │
│  └── facultad (nombre de la facultad)                   │
│                                                          │
│  facultades                                              │
│  └── id, nombre                                          │
│      ↓ 1:N                                               │
│  carreras                                                │
│  └── id, nombre, facultad_id                             │
│      ↓ 1:N                                               │
│  mallas                                                  │
│  └── id, codigo_malla, facultad_id, carrera_id          │
│                                                          │
│  carreras → asignaturas (1:N)                            │
│  └── id, nombre, codigo, carrera_id, nivel_id           │
│      ↓ 1:1                                               │
│  syllabi                                                 │
│  └── id, asignatura_id, contenido_json                  │
│      ↓ 1:1                                               │
│  programas_analiticos                                    │
│  └── id, asignatura_id, contenido_json                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🔐 Sistema de Permisos

```
┌────────────────────────────────────────────────────┐
│                 ROLES Y PERMISOS                    │
├────────────────────────────────────────────────────┤
│                                                     │
│  ADMINISTRADOR                                      │
│  ✅ Acceso total a todas las facultades            │
│  ✅ Crear/editar/eliminar todo                     │
│  ✅ Gestionar usuarios                             │
│                                                     │
│  COMISION_ACADEMICA                                 │
│  ✅ Ver SOLO su facultad                           │
│  ✅ Crear carreras en SU facultad                  │
│  ✅ Crear mallas en SU facultad                    │
│  ✅ Crear asignaturas en SU facultad               │
│  ✅ Crear/editar Syllabus de SU facultad           │
│  ✅ Crear/editar Programas de SU facultad          │
│  ❌ NO puede ver otras facultades                  │
│  ❌ NO puede cambiar carreras de facultad          │
│                                                     │
│  COMISION                                           │
│  ✅ Ver SOLO su facultad (solo lectura)            │
│  ❌ NO puede crear ni editar                       │
│                                                     │
│  PROFESOR / DOCENTE                                 │
│  ✅ Ver sus asignaturas asignadas                  │
│  ✅ Crear/editar Syllabus de sus materias          │
│  ✅ Crear/editar Programas de sus materias         │
│                                                     │
└────────────────────────────────────────────────────┘
```

## 📱 Flujo de Pantallas

### 1. Dashboard Principal

```
┌──────────────────────────────────────────────┐
│ UNESUM                    [Comisión][Logout] │
├──────────────────────────────────────────────┤
│                                               │
│  Panel de Comisión Académica                 │
│  Facultad de Ciencias de la Salud            │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │  HERRAMIENTAS PRINCIPALES               │ │
│  │                                         │ │
│  │  [🏫 Gestión de Asignaturas]           │ │
│  │   Administre asignaturas y cree docs   │ │
│  │                                         │ │
│  │  [📝 Editor de Syllabus]               │ │
│  │   Crear y editar syllabus              │ │
│  │                                         │ │
│  │  [📄 Editor de Programa Analítico]     │ │
│  │   Crear y editar programas             │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  OTRAS HERRAMIENTAS                          │
│  [Upload PA] [Upload Syll] [Comparar]       │
│                                               │
└──────────────────────────────────────────────┘
```

### 2. Gestión de Asignaturas

```
┌──────────────────────────────────────────────┐
│ 🏫 Gestión de Asignaturas                    │
│ Facultad: Facultad de Ciencias de la Salud   │
├──────────────────────────────────────────────┤
│                                               │
│  Seleccionar Carrera:                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │Enfermería│ │Medicina │ │Lab Clín.│        │
│  │   (25)  │ │   (30)  │ │   (15)  │        │
│  └─────────┘ └─────────┘ └─────────┘        │
│                                               │
├──────────────────────────────────────────────┤
│  ESTADÍSTICAS:                               │
│  ┌────┬────┬────┬────┬────┐                 │
│  │ 25 │ 15 │ 10 │  8 │ 17 │                 │
│  │Tot │Syll│Prog│Comp│Pend│                 │
│  └────┴────┴────┴────┴────┘                 │
├──────────────────────────────────────────────┤
│                                               │
│  Asignaturas de Enfermería:                  │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ Anatomía I  [ENF-101]  [Nivel 1]       │ │
│  │ ✅ Syllabus  ✗ Programa                │ │
│  │ [Ver Syllabus] [Crear Programa]        │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ Fisiología I  [ENF-102]  [Nivel 1]     │ │
│  │ ✗ Syllabus  ✗ Programa                 │ │
│  │ [Crear Syllabus] [Crear Programa]      │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ...más asignaturas...                       │
│                                               │
└──────────────────────────────────────────────┘
```

### 3. Editor de Syllabus

```
┌──────────────────────────────────────────────┐
│ Editor de Syllabus - Anatomía I              │
├──────────────────────────────────────────────┤
│ [+Nuevo] [💾Guardar] [🖨️Imprimir]           │
├──────────────────────────────────────────────┤
│                                               │
│  Pestaña 1  Pestaña 2  Pestaña 3  [+ Añadir]│
│  ─────────                                    │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ Campo 1: [___________________]          │ │
│  │ Campo 2: [___________________]          │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ TABLA 1                  [+Row][+Col]   │ │
│  ├────────┬────────┬────────┬──────────────┤ │
│  │ Header │ Header │ Header │    Acciones  │ │
│  ├────────┼────────┼────────┼──────────────┤ │
│  │ Dato   │ Dato   │ Dato   │  [✏️][🗑️]   │ │
│  │ Dato   │ Dato   │ Dato   │  [✏️][🗑️]   │ │
│  └────────┴────────┴────────┴──────────────┘ │
│                                               │
│              [💾 Guardar Cambios]            │
│                                               │
└──────────────────────────────────────────────┘
```

## 📊 Ejemplo de Datos

### Request: Obtener Estructura de Facultad

```http
GET /api/comision-academica/estructura-facultad
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response: 200 OK
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
        "mallas": [
          {
            "id": 1,
            "codigo_malla": "ENF-2024"
          }
        ],
        "asignaturas": [
          {
            "id": 1,
            "nombre": "Anatomía I",
            "codigo": "ENF-101",
            "nivel": "Primer Nivel",
            "estado": "activo",
            "tiene_syllabus": false,
            "tiene_programa": false
          },
          {
            "id": 2,
            "nombre": "Fisiología I",
            "codigo": "ENF-102",
            "nivel": "Primer Nivel",
            "estado": "activo",
            "tiene_syllabus": true,
            "tiene_programa": false
          }
        ]
      }
    ]
  }
}
```

## 🎯 Casos de Uso

### Caso 1: Usuario se loguea por primera vez

```
1. Login → POST /api/auth/login
   └── Recibe token JWT con:
       - rol: comision_academica
       - facultad: "Facultad de Ciencias de la Salud"

2. Dashboard carga → Muestra herramientas disponibles

3. Usuario clic en "Gestión de Asignaturas"

4. GET /api/comision-academica/estructura-facultad
   └── Backend filtra automáticamente por facultad del usuario
   └── Retorna SOLO carreras y asignaturas de su facultad

5. Interfaz muestra:
   - 3 Carreras de su facultad
   - Estadísticas por carrera
   - Lista de asignaturas
```

### Caso 2: Crear Syllabus para nueva materia

```
1. En Gestión de Asignaturas
   └── Usuario ve: "Anatomía I" [✗ Syllabus] [✗ Programa]

2. Clic en [Crear Syllabus]
   └── Redirige a: /editor-syllabus?asignatura=1&nueva=true

3. Editor carga con:
   - Datos de asignatura precargados
   - Pestañas vacías listas para editar

4. Usuario completa el syllabus

5. Clic en [Guardar]
   └── POST /api/syllabi
   └── Validación: asignatura pertenece a su facultad
   └── Guarda en BD

6. Usuario regresa a Gestión de Asignaturas
   └── Ahora ve: [✅ Syllabus] [✗ Programa]
```

### Caso 3: Intentar editar asignatura de otra facultad

```
1. Usuario intenta: PUT /api/asignaturas/999
   └── asignatura.facultad = "Otra Facultad"
   └── user.facultad = "Facultad de Ciencias de la Salud"

2. Backend valida:
   if (asignatura.facultad !== user.facultad) {
     return 403 Forbidden
   }

3. Usuario recibe error:
   "No tienes permisos para modificar asignaturas de otra facultad"
```

## 📈 Métricas y Estadísticas

### Dashboard muestra en tiempo real:

```
╔═══════════════════════════════════════════════════╗
║  FACULTAD: CIENCIAS DE LA SALUD                   ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║  CARRERA: ENFERMERÍA                              ║
║  ┌──────────────────────────────────────────────┐║
║  │ Total Asignaturas:        25                 │║
║  │ Con Syllabus:             15 (60%)           │║
║  │ Con Programa Analítico:   10 (40%)           │║
║  │ Completas (ambos):         8 (32%)           │║
║  │ Pendientes:               17 (68%)           │║
║  └──────────────────────────────────────────────┘║
║                                                   ║
║  PROGRESO: [████████░░░░░░░░] 32%                ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
```

## ✅ Checklist de Implementación

- [x] Backend: Controlador comisionAcademicaController
- [x] Backend: Endpoints estructura-facultad
- [x] Backend: Endpoints carreras/:id/asignaturas
- [x] Backend: Filtrado por facultad en carreras
- [x] Backend: Filtrado por facultad en mallas
- [x] Backend: Filtrado por facultad en asignaturas
- [x] Backend: Validación de permisos CRUD
- [x] Backend: Rutas /api/carreras
- [x] Backend: Rutas /api/facultades
- [x] Frontend: Página /asignaturas
- [x] Frontend: Componente de selección de carrera
- [x] Frontend: Estadísticas en tiempo real
- [x] Frontend: Lista de asignaturas con acciones
- [x] Frontend: Integración con editores
- [x] Frontend: Actualización del dashboard
- [x] Documentación: Guía técnica completa
- [x] Documentación: Guía de usuario
- [ ] Testing: Pruebas unitarias backend
- [ ] Testing: Pruebas E2E frontend
- [ ] Deployment: Configuración producción

## 🚀 Próximos Pasos

1. **Testing Completo**
   - Probar con usuarios reales
   - Verificar permisos en todos los endpoints
   - Validar flujos completos

2. **Mejoras Planificadas**
   - Notificaciones cuando se completa un documento
   - Exportación masiva de documentos
   - Reportes de progreso por facultad
   - Dashboard de métricas para administradores

3. **Optimizaciones**
   - Cache de consultas frecuentes
   - Paginación de asignaturas
   - Búsqueda y filtrado avanzado

---

**Estado:** ✅ IMPLEMENTADO Y FUNCIONAL
**Versión:** 1.0.0
**Fecha:** Enero 2026
