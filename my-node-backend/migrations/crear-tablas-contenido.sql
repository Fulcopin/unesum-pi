-- ================================================
-- CREAR TABLAS PARA CONTENIDO DE PROGRAMA ANALÍTICO
-- ================================================

-- Tabla: contenido_programa
-- Almacena el contenido de cada sección del programa
CREATE TABLE IF NOT EXISTS contenido_programa (
  id SERIAL PRIMARY KEY,
  programa_analitico_id INTEGER NOT NULL REFERENCES programas_analiticos(id) ON DELETE CASCADE,
  seccion_plantilla_id INTEGER NOT NULL REFERENCES secciones_plantilla(id),
  contenido_texto TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: filas_tabla_programa
-- Para secciones tipo tabla, cada fila de la tabla
CREATE TABLE IF NOT EXISTS filas_tabla_programa (
  id SERIAL PRIMARY KEY,
  contenido_programa_id INTEGER NOT NULL REFERENCES contenido_programa(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: valores_campo_programa
-- Valores de cada celda de las tablas
CREATE TABLE IF NOT EXISTS valores_campo_programa (
  id SERIAL PRIMARY KEY,
  fila_tabla_id INTEGER NOT NULL REFERENCES filas_tabla_programa(id) ON DELETE CASCADE,
  campo_seccion_id INTEGER NOT NULL REFERENCES campos_seccion(id),
  valor TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_contenido_programa_programa_id ON contenido_programa(programa_analitico_id);
CREATE INDEX IF NOT EXISTS idx_contenido_programa_seccion_id ON contenido_programa(seccion_plantilla_id);
CREATE INDEX IF NOT EXISTS idx_filas_tabla_contenido_id ON filas_tabla_programa(contenido_programa_id);
CREATE INDEX IF NOT EXISTS idx_valores_campo_fila_id ON valores_campo_programa(fila_tabla_id);
CREATE INDEX IF NOT EXISTS idx_valores_campo_campo_id ON valores_campo_programa(campo_seccion_id);

-- Comentarios
COMMENT ON TABLE contenido_programa IS 'Contenido ingresado para cada sección de un programa analítico';
COMMENT ON TABLE filas_tabla_programa IS 'Filas de las tablas en secciones tipo tabla';
COMMENT ON TABLE valores_campo_programa IS 'Valores de cada celda en las tablas';

COMMENT ON COLUMN contenido_programa.contenido_texto IS 'Texto para secciones tipo texto_largo';
COMMENT ON COLUMN filas_tabla_programa.orden IS 'Número de fila en la tabla (1, 2, 3, ...)';
COMMENT ON COLUMN valores_campo_programa.valor IS 'Valor de la celda';

-- Verificar creación
SELECT 
  'contenido_programa' as tabla, 
  COUNT(*) as registros 
FROM contenido_programa
UNION ALL
SELECT 
  'filas_tabla_programa' as tabla, 
  COUNT(*) as registros 
FROM filas_tabla_programa
UNION ALL
SELECT 
  'valores_campo_programa' as tabla, 
  COUNT(*) as registros 
FROM valores_campo_programa;

COMMIT;
