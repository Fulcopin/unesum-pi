# Módulo de Programa Analítico

## Descripción
Este módulo permite la carga de programas analíticos mediante archivos Excel y la integración del escudo institucional de UNESUM.

## Funcionalidades

### 1. Carga de Archivo Excel
- Permite cargar programas analíticos desde archivos Excel (.xls, .xlsx)
- Validación automática del formato
- Procesamiento y almacenamiento de datos estructurados

### 2. Escudo Institucional
- Opción para cargar un escudo personalizado (PNG, JPG, SVG)
- Logo por defecto de UNESUM incluido en `/public/images/unesum-logo.svg`
- Vista previa en tiempo real del escudo seleccionado

### 3. Plantilla Excel
- Descarga de plantilla con formato correcto
- Incluye datos de ejemplo para facilitar el llenado
- Columnas predefinidas:
  - Carrera
  - Nivel
  - Paralelo
  - Asignatura
  - Código
  - Créditos
  - Horas semanales
  - Periodo académico
  - Docente
  - Unidad temática
  - Contenidos
  - Horas (clase, prácticas, autónomas)
  - Estrategias metodológicas
  - Recursos didácticos
  - Evaluación
  - Bibliografía

## Rutas del Backend

### GET `/api/programas-analiticos/plantilla`
- **Descripción**: Descarga la plantilla Excel con formato correcto
- **Autenticación**: No requerida
- **Respuesta**: Archivo Excel

### POST `/api/programas-analiticos/upload`
- **Descripción**: Sube y procesa un programa analítico desde Excel
- **Autenticación**: Requerida (Bearer token)
- **Roles**: Administrador, Docente
- **Body**: FormData con campos:
  - `excel`: Archivo Excel (requerido)
  - `escudo`: Imagen del escudo (opcional)
- **Respuesta**:
```json
{
  "success": true,
  "message": "Programa analítico cargado exitosamente",
  "data": {
    "id": 1,
    "archivo_excel": "programa_1234567890_nombre.xlsx",
    "archivo_escudo": "escudo_1234567890_logo.png",
    "registros_procesados": 10
  }
}
```

### GET `/api/programas-analiticos/`
- **Descripción**: Lista todos los programas analíticos
- **Autenticación**: Requerida
- **Roles**: Administrador

### GET `/api/programas-analiticos/:id`
- **Descripción**: Obtiene un programa analítico por ID
- **Autenticación**: Requerida
- **Roles**: Administrador

### DELETE `/api/programas-analiticos/:id`
- **Descripción**: Elimina un programa analítico
- **Autenticación**: Requerida
- **Roles**: Administrador

## Estructura de Datos

### Modelo: programas_analiticos

```javascript
{
  id: INTEGER (PK),
  nombre: STRING,
  datos_tabla: JSONB {
    archivo_excel: STRING,
    archivo_escudo: STRING,
    rutas: {
      excel: STRING,
      escudo: STRING
    },
    datos_generales: {
      carrera: STRING,
      nivel: STRING,
      paralelo: STRING,
      asignatura: STRING,
      codigo: STRING,
      creditos: INTEGER,
      horas_semanales: INTEGER,
      periodo_academico: STRING,
      docente: STRING
    },
    unidades_tematicas: ARRAY[OBJECT],
    fecha_carga: TIMESTAMP
  },
  usuario_id: INTEGER (FK -> usuarios),
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

## Uso

### Frontend

1. **Acceder al módulo**:
   - Navegar a `/dashboard/admin/programa-analitico`

2. **Descargar plantilla**:
   - Click en "Descargar Plantilla Excel"
   - Completar con los datos del programa analítico

3. **Cargar programa**:
   - Seleccionar archivo Excel completado
   - (Opcional) Seleccionar imagen del escudo institucional
   - Click en "Cargar Programa Analítico"

4. **Vista previa del escudo**:
   - Si no se carga un escudo, se muestra el logo por defecto de UNESUM
   - Si se carga uno, se muestra vista previa inmediata

### Backend

1. **Instalación de dependencias**:
```bash
cd my-node-backend
npm install
```

2. **Iniciar servidor**:
```bash
npm run dev
```

3. **Archivos cargados**:
   - Se almacenan en `my-node-backend/uploads/programa-analitico/`
   - Formato: `programa_[timestamp]_[nombre_original].xlsx`
   - Escudos: `escudo_[timestamp]_[nombre_original].[ext]`

## Archivos Creados

### Frontend
- `app/dashboard/admin/programa-analitico/page.tsx`

### Backend
- `my-node-backend/src/controllers/programaAnaliticoController.js`
- `my-node-backend/src/routes/programaAnaliticoRoutes.js` (actualizado)

### Assets
- `public/images/unesum-logo.svg` (logo por defecto)

## Dependencias Utilizadas

- **xlsx**: Lectura y escritura de archivos Excel
- **multer**: Manejo de carga de archivos
- **sequelize**: ORM para base de datos PostgreSQL

## Validaciones

1. **Archivo Excel**:
   - Solo acepta formatos .xls y .xlsx
   - Máximo 10MB por archivo
   - Debe contener al menos una fila de datos

2. **Escudo**:
   - Formatos aceptados: PNG, JPG, SVG
   - Tamaño máximo: 10MB

## Notas

- El logo por defecto de UNESUM es un placeholder. Reemplace `/public/images/unesum-logo.svg` con el logo oficial.
- Los archivos se almacenan en el servidor backend en `uploads/programa-analitico/`
- Los datos se guardan en formato JSON en el campo `datos_tabla` de la base de datos
- El campo `nombre` del registro toma el valor de la asignatura de la primera fila del Excel

## Próximas Mejoras

- Generación de PDF del programa analítico con el escudo institucional
- Validación avanzada de datos del Excel
- Bulk import de múltiples programas
- Exportación de programas existentes a Excel
- Interfaz de visualización y edición de programas cargados
