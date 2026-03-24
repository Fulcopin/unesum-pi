-- Migración: Crear tabla de agrupaciones de títulos
-- Fecha: 2025-12-20
-- Descripción: Permite al admin organizar títulos extraídos en pestañas/viñetas

CREATE TABLE IF NOT EXISTS agrupaciones_titulos (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  nombre_pestana VARCHAR(100) NOT NULL,
  descripcion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  titulo_ids INTEGER[] NOT NULL DEFAULT '{}',
  color VARCHAR(20) DEFAULT 'blue',
  icono VARCHAR(50) DEFAULT '📋',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas por session_id
CREATE INDEX idx_agrupaciones_session ON agrupaciones_titulos(session_id);

-- Índice para ordenamiento
CREATE INDEX idx_agrupaciones_orden ON agrupaciones_titulos(session_id, orden);

-- Comentarios
COMMENT ON TABLE agrupaciones_titulos IS 'Organización de títulos extraídos en pestañas para formularios dinámicos';
COMMENT ON COLUMN agrupaciones_titulos.session_id IS 'ID de la sesión de extracción de títulos';
COMMENT ON COLUMN agrupaciones_titulos.nombre_pestana IS 'Nombre de la pestaña/viñeta que verá el docente';
COMMENT ON COLUMN agrupaciones_titulos.titulo_ids IS 'Array de IDs de títulos que pertenecen a esta pestaña';
COMMENT ON COLUMN agrupaciones_titulos.orden IS 'Orden de aparición de la pestaña';
COMMENT ON COLUMN agrupaciones_titulos.color IS 'Color del badge: blue, purple, green, red, yellow';
COMMENT ON COLUMN agrupaciones_titulos.icono IS 'Emoji o icono para la pestaña';
