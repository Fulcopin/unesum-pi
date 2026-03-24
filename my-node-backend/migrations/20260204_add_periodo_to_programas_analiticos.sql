-- Agregar columna periodo a programas_analiticos
ALTER TABLE programas_analiticos ADD COLUMN IF NOT EXISTS periodo VARCHAR(50);

-- Crear índice para mejorar búsquedas por periodo
CREATE INDEX IF NOT EXISTS idx_programas_analiticos_periodo ON programas_analiticos(periodo);

-- Crear índice compuesto para búsquedas por asignatura y periodo
CREATE INDEX IF NOT EXISTS idx_programas_analiticos_asignatura_periodo ON programas_analiticos(asignatura_id, periodo);
