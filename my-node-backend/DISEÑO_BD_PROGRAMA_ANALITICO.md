# Diseño de Base de Datos para Programas Analíticos

## Estructura Propuesta

Esta estructura reemplaza el campo JSONB por tablas relacionales que permiten:
- Crear formularios dinámicos basados en plantillas
- Reutilizar secciones entre diferentes programas
- Hacer consultas eficientes
- Generar reportes fácilmente

## Tablas Principales

### 1. programas_analiticos (Modificada)
```sql
CREATE TABLE programas_analiticos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  carrera VARCHAR(255),
  nivel VARCHAR(100),
  asignatura VARCHAR(255),
  codigo VARCHAR(50),
  creditos INTEGER,
  periodo_academico VARCHAR(100),
  estado VARCHAR(50) DEFAULT 'borrador', -- borrador, publicado, archivado
  plantilla_id INTEGER REFERENCES plantillas_programa(id),
  usuario_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. plantillas_programa (Nueva)
Define la estructura/plantilla de un programa analítico
```sql
CREATE TABLE plantillas_programa (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) DEFAULT 'general', -- general, ingenieria, medicina, etc.
  activa BOOLEAN DEFAULT true,
  usuario_creador_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. secciones_plantilla (Nueva)
Define las secciones que componen una plantilla
```sql
CREATE TABLE secciones_plantilla (
  id SERIAL PRIMARY KEY,
  plantilla_id INTEGER REFERENCES plantillas_programa(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL, -- "CARACTERIZACIÓN", "OBJETIVOS", etc.
  descripcion TEXT,
  tipo VARCHAR(50) NOT NULL, -- 'texto_corto', 'texto_largo', 'tabla', 'lista'
  orden INTEGER NOT NULL,
  obligatoria BOOLEAN DEFAULT false,
  config_json JSONB, -- Configuración específica de la sección
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. campos_seccion (Nueva)
Define los campos dentro de cada sección (para tablas)
```sql
CREATE TABLE campos_seccion (
  id SERIAL PRIMARY KEY,
  seccion_id INTEGER REFERENCES secciones_plantilla(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  etiqueta VARCHAR(255) NOT NULL, -- Label que se muestra en el formulario
  tipo_campo VARCHAR(50) NOT NULL, -- 'text', 'textarea', 'number', 'date', 'select', etc.
  orden INTEGER NOT NULL,
  requerido BOOLEAN DEFAULT false,
  placeholder TEXT,
  opciones_json JSONB, -- Para selects, checkboxes, etc.
  validacion_json JSONB, -- Reglas de validación
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. contenido_programa (Nueva)
Almacena el contenido ingresado para cada sección
```sql
CREATE TABLE contenido_programa (
  id SERIAL PRIMARY KEY,
  programa_analitico_id INTEGER REFERENCES programas_analiticos(id) ON DELETE CASCADE,
  seccion_plantilla_id INTEGER REFERENCES secciones_plantilla(id),
  contenido_texto TEXT, -- Para secciones de texto
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 6. filas_tabla_programa (Nueva)
Para secciones tipo tabla
```sql
CREATE TABLE filas_tabla_programa (
  id SERIAL PRIMARY KEY,
  contenido_programa_id INTEGER REFERENCES contenido_programa(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 7. valores_campo_programa (Nueva)
Valores específicos de cada campo en las tablas
```sql
CREATE TABLE valores_campo_programa (
  id SERIAL PRIMARY KEY,
  fila_tabla_id INTEGER REFERENCES filas_tabla_programa(id) ON DELETE CASCADE,
  campo_seccion_id INTEGER REFERENCES campos_seccion(id),
  valor TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 8. asignaciones_programa_docente (Nueva)
Asignación de programas a docentes
```sql
CREATE TABLE asignaciones_programa_docente (
  id SERIAL PRIMARY KEY,
  programa_analitico_id INTEGER REFERENCES programas_analiticos(id) ON DELETE CASCADE,
  profesor_id INTEGER REFERENCES profesores(id) ON DELETE CASCADE,
  asignatura_id INTEGER REFERENCES asignaturas(id),
  nivel_id INTEGER REFERENCES nivel(id),
  paralelo_id INTEGER REFERENCES paralelo(id),
  periodo_id INTEGER REFERENCES periodos(id),
  estado VARCHAR(50) DEFAULT 'pendiente', -- pendiente, en_progreso, completado, rechazado
  fecha_asignacion TIMESTAMP DEFAULT NOW(),
  fecha_completado TIMESTAMP,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(programa_analitico_id, profesor_id, periodo_id)
);
```

## Ventajas de este Diseño

1. **Reutilización**: Las plantillas se pueden reutilizar para múltiples programas
2. **Flexibilidad**: Fácil agregar/modificar secciones sin cambiar código
3. **Consultas**: Búsquedas y reportes más eficientes
4. **Validaciones**: Validaciones a nivel de base de datos
5. **Historial**: Fácil implementar versionado
6. **Formularios Dinámicos**: El frontend lee la estructura y genera formularios automáticamente

## Ejemplo de Uso

### Crear una Plantilla:
```javascript
// 1. Crear plantilla base
const plantilla = await PlantillaPrograma.create({
  nombre: 'Plantilla Ingeniería',
  tipo: 'ingenieria'
});

// 2. Crear sección de texto largo
const seccionCaract = await SeccionPlantilla.create({
  plantilla_id: plantilla.id,
  nombre: 'CARACTERIZACIÓN DE LA ASIGNATURA',
  tipo: 'texto_largo',
  orden: 1,
  obligatoria: true
});

// 3. Crear sección tipo tabla
const seccionContenidos = await SeccionPlantilla.create({
  plantilla_id: plantilla.id,
  nombre: 'CONTENIDOS DE LA ASIGNATURA',
  tipo: 'tabla',
  orden: 2,
  obligatoria: true
});

// 4. Crear campos de la tabla
await CampoSeccion.bulkCreate([
  {
    seccion_id: seccionContenidos.id,
    nombre: 'unidad',
    etiqueta: 'Unidad Temática',
    tipo_campo: 'text',
    orden: 1,
    requerido: true
  },
  {
    seccion_id: seccionContenidos.id,
    nombre: 'contenido',
    etiqueta: 'Contenido',
    tipo_campo: 'textarea',
    orden: 2,
    requerido: true
  },
  {
    seccion_id: seccionContenidos.id,
    nombre: 'horas',
    etiqueta: 'Horas',
    tipo_campo: 'number',
    orden: 3,
    requerido: true
  }
]);
```

### Usar la Plantilla en un Programa:
```javascript
// 1. Crear programa basado en plantilla
const programa = await ProgramaAnalitico.create({
  nombre: 'Programación Avanzada',
  plantilla_id: plantilla.id,
  carrera: 'Ingeniería en Sistemas',
  nivel: 'Tercer Nivel'
});

// 2. El docente completa el contenido
const contenido = await ContenidoPrograma.create({
  programa_analitico_id: programa.id,
  seccion_plantilla_id: seccionContenidos.id
});

// 3. Agregar filas a la tabla
const fila1 = await FilaTablaPrograma.create({
  contenido_programa_id: contenido.id,
  orden: 1
});

// 4. Llenar valores de cada campo
await ValoresCampoPrograma.bulkCreate([
  {
    fila_tabla_id: fila1.id,
    campo_seccion_id: campoUnidad.id,
    valor: 'Unidad 1: POO'
  },
  {
    fila_tabla_id: fila1.id,
    campo_seccion_id: campoContenido.id,
    valor: 'Clases, objetos, herencia...'
  },
  {
    fila_tabla_id: fila1.id,
    campo_seccion_id: campoHoras.id,
    valor: '20'
  }
]);
```

## Flujo de Trabajo

1. **Admin crea plantilla** → Define estructura de secciones y campos
2. **Admin crea programa** → Basado en una plantilla
3. **Admin asigna a docente** → Crea registro en asignaciones_programa_docente
4. **Docente completa** → Llena el contenido según la estructura de la plantilla
5. **Sistema genera formulario** → Lee la estructura de la plantilla y genera UI dinámicamente

## Consultas Útiles

```sql
-- Obtener estructura completa de un programa
SELECT 
  pa.nombre as programa,
  sp.nombre as seccion,
  sp.tipo,
  cs.etiqueta as campo,
  cs.tipo_campo
FROM programas_analiticos pa
JOIN plantillas_programa pp ON pa.plantilla_id = pp.id
JOIN secciones_plantilla sp ON sp.plantilla_id = pp.id
LEFT JOIN campos_seccion cs ON cs.seccion_id = sp.id
WHERE pa.id = 1
ORDER BY sp.orden, cs.orden;

-- Obtener contenido completo de un programa
SELECT 
  sp.nombre as seccion,
  cs.etiqueta as campo,
  vcp.valor
FROM contenido_programa cp
JOIN secciones_plantilla sp ON cp.seccion_plantilla_id = sp.id
LEFT JOIN filas_tabla_programa ftp ON ftp.contenido_programa_id = cp.id
LEFT JOIN valores_campo_programa vcp ON vcp.fila_tabla_id = ftp.id
LEFT JOIN campos_seccion cs ON vcp.campo_seccion_id = cs.id
WHERE cp.programa_analitico_id = 1
ORDER BY sp.orden, ftp.orden, cs.orden;
```

## Migración desde JSONB

Para migrar los datos existentes:
1. Extraer estructura común de los JSONB existentes
2. Crear plantillas basadas en esas estructuras
3. Migrar datos a las nuevas tablas
4. Mantener JSONB como respaldo temporal

¿Deseas que proceda con la implementación de las migraciones?
