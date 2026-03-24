-- =========================================================================
-- Script para agregar columna asignatura_id a syllabi y programas_analiticos
-- Fecha: 30 de enero de 2026
-- Propósito: Permitir validación de 1 syllabus/programa por materia por periodo
-- =========================================================================

-- 1. Agregar columna asignatura_id a la tabla syllabi
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'syllabi' 
        AND column_name = 'asignatura_id'
    ) THEN
        ALTER TABLE syllabi 
        ADD COLUMN asignatura_id BIGINT NULL 
        REFERENCES asignaturas(id) ON UPDATE CASCADE ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Columna asignatura_id agregada a syllabi';
    ELSE
        RAISE NOTICE '⚠️ Columna asignatura_id ya existe en syllabi';
    END IF;
END $$;

-- 2. Crear índice para asignatura_id en syllabi
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'syllabi' 
        AND indexname = 'idx_syllabi_asignatura_id'
    ) THEN
        CREATE INDEX idx_syllabi_asignatura_id ON syllabi(asignatura_id);
        RAISE NOTICE '✅ Índice idx_syllabi_asignatura_id creado';
    ELSE
        RAISE NOTICE '⚠️ Índice idx_syllabi_asignatura_id ya existe';
    END IF;
END $$;

-- 3. Crear índice compuesto para validación de duplicados en syllabi
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'syllabi' 
        AND indexname = 'idx_syllabi_unique_validation'
    ) THEN
        CREATE INDEX idx_syllabi_unique_validation 
        ON syllabi(usuario_id, periodo, asignatura_id);
        RAISE NOTICE '✅ Índice idx_syllabi_unique_validation creado';
    ELSE
        RAISE NOTICE '⚠️ Índice idx_syllabi_unique_validation ya existe';
    END IF;
END $$;

-- 4. Agregar columna asignatura_id a la tabla programas_analiticos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'programas_analiticos' 
        AND column_name = 'asignatura_id'
    ) THEN
        ALTER TABLE programas_analiticos 
        ADD COLUMN asignatura_id BIGINT NULL 
        REFERENCES asignaturas(id) ON UPDATE CASCADE ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Columna asignatura_id agregada a programas_analiticos';
    ELSE
        RAISE NOTICE '⚠️ Columna asignatura_id ya existe en programas_analiticos';
    END IF;
END $$;

-- 5. Crear índice para asignatura_id en programas_analiticos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'programas_analiticos' 
        AND indexname = 'idx_programa_analitico_asignatura_id'
    ) THEN
        CREATE INDEX idx_programa_analitico_asignatura_id 
        ON programas_analiticos(asignatura_id);
        RAISE NOTICE '✅ Índice idx_programa_analitico_asignatura_id creado';
    ELSE
        RAISE NOTICE '⚠️ Índice idx_programa_analitico_asignatura_id ya existe';
    END IF;
END $$;

-- 6. Crear índice compuesto para validación de duplicados en programas_analiticos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'programas_analiticos' 
        AND indexname = 'idx_programa_analitico_unique_validation'
    ) THEN
        CREATE INDEX idx_programa_analitico_unique_validation 
        ON programas_analiticos(usuario_id, asignatura_id);
        RAISE NOTICE '✅ Índice idx_programa_analitico_unique_validation creado';
    ELSE
        RAISE NOTICE '⚠️ Índice idx_programa_analitico_unique_validation ya existe';
    END IF;
END $$;

-- 7. Insertar registro en SequelizeMeta para las nuevas migraciones
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "SequelizeMeta" 
        WHERE name = '20260130000000-add-asignatura-id-to-syllabi.js'
    ) THEN
        INSERT INTO "SequelizeMeta" (name) 
        VALUES ('20260130000000-add-asignatura-id-to-syllabi.js');
        RAISE NOTICE '✅ Migración 20260130000000-add-asignatura-id-to-syllabi.js registrada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM "SequelizeMeta" 
        WHERE name = '20260130000001-add-asignatura-id-to-programa-analitico.js'
    ) THEN
        INSERT INTO "SequelizeMeta" (name) 
        VALUES ('20260130000001-add-asignatura-id-to-programa-analitico.js');
        RAISE NOTICE '✅ Migración 20260130000001-add-asignatura-id-to-programa-analitico.js registrada';
    END IF;
END $$;

-- =========================================================================
-- Verificación final
-- =========================================================================
SELECT 
    'syllabi' as tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'syllabi' AND column_name = 'asignatura_id'

UNION ALL

SELECT 
    'programas_analiticos' as tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'programas_analiticos' AND column_name = 'asignatura_id';

SELECT '✅ Script ejecutado exitosamente' as resultado;
