-- Migración: Agregar columna es_eliminado a programas_analiticos
-- Fecha: 2026-02-03

-- Agregar columna es_eliminado
ALTER TABLE programas_analiticos 
ADD COLUMN IF NOT EXISTS es_eliminado BOOLEAN DEFAULT false;

-- Agregar columna nombre_programa si no existe
ALTER TABLE programas_analiticos 
ADD COLUMN IF NOT EXISTS nombre_programa VARCHAR(255);

-- Agregar columna periodo si no existe
ALTER TABLE programas_analiticos 
ADD COLUMN IF NOT EXISTS periodo VARCHAR(50);

-- Crear índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_programas_analiticos_es_eliminado 
ON programas_analiticos(es_eliminado);

CREATE INDEX IF NOT EXISTS idx_programas_analiticos_asignatura_periodo 
ON programas_analiticos(asignatura_id, periodo) 
WHERE es_eliminado = false;

-- Mostrar resultado
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'programas_analiticos'
ORDER BY ordinal_position;
