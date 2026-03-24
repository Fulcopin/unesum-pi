-- Tabla para almacenar los títulos extraídos de documentos Syllabus
CREATE TABLE IF NOT EXISTS titulos_extraidos_syllabus (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  nombre_archivo VARCHAR(500) NOT NULL,
  tipo_archivo VARCHAR(50) NOT NULL,
  usuario_id INTEGER,
  titulo TEXT NOT NULL,
  tipo VARCHAR(100),
  fila INTEGER,
  columna INTEGER,
  columna_letra VARCHAR(10),
  puntuacion DECIMAL(5,2),
  tiene_dos_puntos BOOLEAN DEFAULT false,
  longitud_texto INTEGER,
  es_mayuscula BOOLEAN DEFAULT false,
  es_negrita BOOLEAN DEFAULT false,
  nivel_jerarquia INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_titulos_syllabus_session ON titulos_extraidos_syllabus(session_id);
CREATE INDEX idx_titulos_syllabus_usuario ON titulos_extraidos_syllabus(usuario_id);
CREATE INDEX idx_titulos_syllabus_archivo ON titulos_extraidos_syllabus(nombre_archivo);

COMMENT ON TABLE titulos_extraidos_syllabus IS 'Almacena títulos extraídos de documentos Syllabus (Excel/Word) para posterior organización';
