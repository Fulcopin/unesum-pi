-- Tabla para organizar títulos extraídos de Syllabus en pestañas/agrupaciones
CREATE TABLE IF NOT EXISTS agrupaciones_titulos_syllabus (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  nombre_pestana VARCHAR(255) NOT NULL,
  descripcion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  titulo_ids INTEGER[] NOT NULL DEFAULT '{}',
  color VARCHAR(50),
  icono VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_agrupaciones_syllabus_session ON agrupaciones_titulos_syllabus(session_id);
CREATE INDEX idx_agrupaciones_syllabus_orden ON agrupaciones_titulos_syllabus(orden);

COMMENT ON TABLE agrupaciones_titulos_syllabus IS 'Organiza títulos extraídos de Syllabus en pestañas configurables por el administrador';
COMMENT ON COLUMN agrupaciones_titulos_syllabus.titulo_ids IS 'Array de IDs de títulos que pertenecen a esta agrupación/pestaña';
