-- =========================================================================
-- MIGRACIÓN: Agregar plantilla_id a programas_analiticos
-- Fecha: 7 de diciembre de 2025
-- Propósito: Vincular programas analíticos con sus plantillas dinámicas
-- =========================================================================

-- 1. Verificar si la columna ya existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'programas_analiticos' 
        AND column_name = 'plantilla_id'
    ) THEN
        -- 2. Agregar la columna plantilla_id
        ALTER TABLE programas_analiticos 
        ADD COLUMN plantilla_id INTEGER;
        
        RAISE NOTICE '✅ Columna plantilla_id agregada a programas_analiticos';
    ELSE
        RAISE NOTICE '⚠️  La columna plantilla_id ya existe';
    END IF;
END $$;

-- 3. Agregar la clave foránea si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'programas_analiticos_plantilla_id_fkey'
    ) THEN
        ALTER TABLE programas_analiticos
        ADD CONSTRAINT programas_analiticos_plantilla_id_fkey
        FOREIGN KEY (plantilla_id) 
        REFERENCES plantillas_programa(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Clave foránea agregada: plantilla_id → plantillas_programa';
    ELSE
        RAISE NOTICE '⚠️  La clave foránea ya existe';
    END IF;
END $$;

-- 4. Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_programas_analiticos_plantilla_id 
ON programas_analiticos(plantilla_id);

-- 5. Verificar la estructura actualizada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'programas_analiticos'
ORDER BY ordinal_position;

-- 6. Verificar programas existentes
SELECT 
    id,
    nombre,
    plantilla_id,
    usuario_id,
    "createdAt" as fecha_creacion
FROM programas_analiticos
ORDER BY id DESC
LIMIT 10;

-- =========================================================================
-- NOTAS:
-- - Esta migración es idempotente (se puede ejecutar múltiples veces)
-- - La columna permite NULL para programas antiguos sin plantilla
-- - Se puede ejecutar directamente en pgAdmin o con psql
-- =========================================================================
