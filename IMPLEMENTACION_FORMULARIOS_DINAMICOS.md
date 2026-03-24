# Implementación de Formularios Dinámicos Basados en Programas Analíticos

## Resumen de Cambios

Se ha implementado exitosamente un sistema donde los formularios que completan los docentes se generan dinámicamente basándose en la estructura del programa analítico que sube el administrador.

## Cambios Realizados

### 1. Backend - Controlador de Programas Analíticos

**Archivo**: `my-node-backend/src/controllers/programaAnaliticoController.js`

#### Mejoras en `getEstructuraFormulario`:
- Ahora acepta un parámetro opcional `id` para obtener la estructura de un programa específico
- Retorna información más completa incluyendo:
  - `secciones_formulario`: Estructura simplificada para renderizar formularios
  - `secciones_completas`: Todas las secciones detectadas del Excel con sus datos
  - `metadata`: Información adicional sobre el programa
  - `programa_id` y `nombre_programa`: Para identificación

#### Nuevos Endpoints Creados:

**`POST /api/programa-analitico/asignar`**
- Permite al administrador asignar un programa analítico a un docente
- Parámetros:
  - `programaAnaliticoId`: ID del programa
  - `profesorId`: ID del profesor
  - `asignaturaId`, `nivelId`, `paraleloId`, `periodoId`: Opcional
- Guarda la asignación en `datos_tabla.asignaciones_docentes` del programa

**`GET /api/programa-analitico/mis-programas`**
- Retorna los programas analíticos asignados al docente autenticado
- Filtra automáticamente por el `profesor_id` del usuario

**`GET /api/programa-analitico/docente/:profesorId`**
- Para que el admin consulte programas asignados a un docente específico

**`PUT /api/programa-analitico/:id/contenido`**
- Permite al docente guardar el contenido completado del programa
- Guarda el contenido en `datos_tabla.contenidos_docentes[profesorId]`
- Mantiene un historial por sección con fechas de actualización

### 2. Frontend - Componente de Formulario Dinámico

**Archivo Nuevo**: `components/programa-analitico/formulario-dinamico.tsx`

Características:
- Renderiza formularios dinámicamente basados en la estructura del programa analítico
- Soporta dos tipos de secciones:
  - **Texto largo**: Para secciones como "Caracterización", "Objetivos", "Metodología"
  - **Tablas**: Para secciones como "Contenido de la Asignatura", "Bibliografía"
- Funcionalidades de tablas:
  - Agregar/eliminar filas dinámicamente
  - Campos basados en los encabezados del Excel
  - Validación y contador de filas
- Muestra datos generales del programa (carrera, nivel, asignatura, etc.)
- Organiza las secciones en tabs para mejor UX
- Guardado asíncrono con indicadores de estado

### 3. Página del Docente - Programas Analíticos

**Archivo Modificado**: `app/dashboard/docente/programa-analitico/page.tsx`

Cambios principales:
- Ahora usa el endpoint `/mis-programas` en lugar de obtener todos los programas
- Muestra solo los programas asignados al docente
- Indica el estado de cada programa (pendiente, en progreso, completado)
- Al seleccionar un programa, muestra el formulario dinámico
- Implementa dos vistas:
  1. **Vista de lista**: Muestra programas asignados con su estado
  2. **Vista de edición**: Formulario dinámico para completar el programa

### 4. Página del Admin - Asignar Programa

**Archivo Nuevo**: `app/dashboard/admin/programa-analitico/asignar/[id]/page.tsx`

Funcionalidades:
- Interfaz para asignar programas analíticos a docentes
- Buscador de profesores por nombre o email
- Selectores para:
  - Profesor (obligatorio)
  - Asignatura
  - Nivel
  - Paralelo
  - Periodo académico
- Notificaciones de éxito/error
- Validaciones en el frontend

### 5. Página del Admin - Lista de Programas

**Archivo Modificado**: `app/dashboard/admin/programa-analitico/page.tsx`

Cambios:
- Agregado botón de "Asignar a docente" (icono UserPlus)
- Tooltips en los botones para mejor UX
- Navegación al formulario de asignación

## Flujo de Trabajo

### 1. Administrador Sube Programa Analítico
```
1. Admin sube archivo Excel con estructura del programa
2. Backend detecta automáticamente las secciones:
   - CARACTERIZACIÓN
   - OBJETIVOS DE LA ASIGNATURA
   - COMPETENCIAS
   - RESULTADOS DE APRENDIZAJE
   - CONTENIDO DE LA ASIGNATURA (tabla)
   - METODOLOGÍA
   - PROCEDIMIENTO DE EVALUACIÓN
   - BIBLIOGRAFÍA (tabla)
3. Se guarda en la BD con toda la estructura detectada
```

### 2. Administrador Asigna a Docente
```
1. Admin selecciona un programa analítico
2. Hace clic en el botón de "Asignar" (UserPlus)
3. Selecciona el docente y datos académicos opcionales
4. Se crea la asignación con estado "pendiente"
```

### 3. Docente Completa el Programa
```
1. Docente ingresa a "Programas Analíticos"
2. Ve solo los programas que le fueron asignados
3. Selecciona un programa y ve el formulario dinámico
4. El formulario muestra las secciones del Excel:
   - Secciones de texto: Textarea grande
   - Secciones de tabla: Tabla editable con agregar/eliminar filas
5. Completa la información y guarda
6. El contenido se almacena en la BD vinculado al programa y docente
```

## Estructura de Datos en la Base de Datos

### Tabla: `programas_analiticos`

```json
{
  "id": 1,
  "nombre": "Programa Analítico - Programación I",
  "datos_tabla": {
    "datos_generales": {
      "carrera": "Ingeniería en Sistemas",
      "nivel": "Primer Nivel",
      "asignatura": "Programación I",
      "periodo_academico": "2025-1",
      "docente": ""
    },
    "secciones_completas": [
      {
        "titulo": "CARACTERIZACIÓN",
        "tipo": "texto_largo",
        "datos": [...]
      },
      {
        "titulo": "CONTENIDO DE LA ASIGNATURA",
        "tipo": "tabla",
        "encabezados": ["Unidad", "Contenidos", "Horas"],
        "datos": [...]
      }
    ],
    "secciones_formulario": [
      {
        "titulo": "CARACTERIZACIÓN",
        "tipo": "texto_largo",
        "campos": ["contenido"],
        "num_filas": 0
      },
      {
        "titulo": "CONTENIDO DE LA ASIGNATURA",
        "tipo": "tabla",
        "encabezados": ["Unidad", "Contenidos", "Horas"],
        "num_filas": 5
      }
    ],
    "asignaciones_docentes": [
      {
        "profesor_id": 123,
        "asignatura_id": 45,
        "nivel_id": 1,
        "paralelo_id": 2,
        "periodo_id": 3,
        "fecha_asignacion": "2025-12-04T10:30:00Z",
        "estado": "en_progreso"
      }
    ],
    "contenidos_docentes": {
      "123": {
        "fecha_inicio": "2025-12-04T11:00:00Z",
        "fecha_actualizacion": "2025-12-04T15:30:00Z",
        "secciones_completadas": {
          "CARACTERIZACIÓN": {
            "contenido": "La asignatura de Programación I...",
            "fecha_actualizacion": "2025-12-04T15:30:00Z"
          },
          "CONTENIDO DE LA ASIGNATURA": {
            "filas": [
              {
                "Unidad": "Unidad 1",
                "Contenidos": "Variables, tipos de datos",
                "Horas": "20"
              }
            ],
            "fecha_actualizacion": "2025-12-04T15:30:00Z"
          }
        }
      }
    }
  }
}
```

## Ventajas del Sistema

1. **Flexibilidad**: La estructura del formulario se adapta automáticamente al Excel subido
2. **Reutilización**: El mismo componente sirve para cualquier estructura de programa analítico
3. **Trazabilidad**: Se mantiene historial de quién completa qué y cuándo
4. **Escalabilidad**: Fácil agregar nuevos tipos de secciones
5. **UX Mejorada**: Tabs organizan las secciones, estados visuales claros
6. **Validación**: El backend valida permisos y relaciones

## Próximos Pasos Sugeridos

1. **Notificaciones**: Enviar emails cuando se asigna un programa
2. **Estados Avanzados**: Sistema de revisión/aprobación del admin
3. **Reportes**: Generar PDFs del programa completado
4. **Versionado**: Mantener versiones del programa cuando se actualiza
5. **Plantillas**: Crear plantillas predefinidas de Excel para diferentes tipos de programas
6. **Exportación**: Permitir exportar el programa completado a Excel/PDF

## Pruebas Recomendadas

1. **Backend**:
   - Probar asignación de programas
   - Verificar que solo se muestran programas asignados al docente correcto
   - Validar guardado de contenido

2. **Frontend**:
   - Probar formulario con diferentes estructuras de Excel
   - Verificar agregar/eliminar filas en tablas
   - Comprobar guardado y recuperación de datos
   - Validar navegación entre vistas

3. **Integración**:
   - Flujo completo: Admin sube → Admin asigna → Docente completa
   - Múltiples docentes con múltiples programas
   - Actualización de contenido existente

## Comandos para Probar

```bash
# Backend
cd my-node-backend
npm start

# Frontend
cd ../
npm run dev

# Abrir navegador en:
http://localhost:3000
```

## Credenciales de Prueba Sugeridas

- **Admin**: Crear un usuario con rol "administrador"
- **Docente**: Crear un usuario con rol "docente" o "profesor"
