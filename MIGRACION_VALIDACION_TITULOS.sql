-- ============================================
-- MIGRACIÓN: Agregar Validación de Títulos a Syllabi
-- ============================================
-- Ejecutar en Neon SQL Editor

-- PASO 1: Agregar columna es_plantilla_referencia
-- -----------------------------------------------
ALTER TABLE syllabi 
ADD COLUMN IF NOT EXISTS es_plantilla_referencia BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN syllabi.es_plantilla_referencia IS 
'Indica si este syllabus es la plantilla de referencia del admin para el periodo';


-- PASO 2: Agregar columna titulos_extraidos
-- ------------------------------------------
ALTER TABLE syllabi 
ADD COLUMN IF NOT EXISTS titulos_extraidos JSONB;

COMMENT ON COLUMN syllabi.titulos_extraidos IS 
'Array de títulos en negrita extraídos del documento Word';


-- PASO 3: Crear índice para búsqueda rápida de plantillas
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_syllabi_plantilla_periodo 
ON syllabi (periodo, es_plantilla_referencia) 
WHERE es_plantilla_referencia = true;


-- PASO 4: Verificar que se crearon las columnas
-- ---------------------------------------------
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'syllabi' 
  AND column_name IN ('es_plantilla_referencia', 'titulos_extraidos');

-- Deberías ver:
-- es_plantilla_referencia | boolean | NO  | false
-- titulos_extraidos       | jsonb   | YES | NULL


-- PASO 5: Verificar que se creó el índice
-- ---------------------------------------
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'syllabi' 
  AND indexname = 'idx_syllabi_plantilla_periodo';


-- PASO 6 (OPCIONAL): Ver estructura actual de la tabla syllabi
-- ------------------------------------------------------------
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'syllabi'
ORDER BY ordinal_position;


-- PASO 7 (OPCIONAL): Marcar un syllabus existente como plantilla de prueba
-- ------------------------------------------------------------------------
-- ⚠️ SOLO EJECUTA ESTO SI TIENES UN SYLLABUS EXISTENTE QUE QUIERAS USAR COMO PLANTILLA
-- SELECT id, nombre, periodo FROM syllabi ORDER BY id DESC LIMIT 5;
-- UPDATE syllabi SET es_plantilla_referencia = true WHERE id = X;  -- Reemplaza X con el ID


-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Contar syllabi normales vs plantillas
SELECT 
  es_plantilla_referencia,
  COUNT(*) as total,
  STRING_AGG(DISTINCT periodo, ', ') as periodos
FROM syllabi
GROUP BY es_plantilla_referencia;

-- Deberías ver algo como:
-- es_plantilla_referencia | total | periodos
-- false                   | 50    | 2024-1, 2024-2, 2025-1
-- true                    | 0     | (ninguno aún)


-- ============================================
-- ROLLBACK (Solo si necesitas deshacer)
-- ============================================
-- DROP INDEX IF EXISTS idx_syllabi_plantilla_periodo;
-- ALTER TABLE syllabi DROP COLUMN IF EXISTS titulos_extraidos;
-- ALTER TABLE syllabi DROP COLUMN IF EXISTS es_plantilla_referencia;


-- ============================================
-- ✅ MIGRACIÓN COMPLETADA
-- ============================================
-- Siguiente paso: Reiniciar el backend con 'npm run dev'
