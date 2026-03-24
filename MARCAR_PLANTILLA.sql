-- 🎯 MARCAR SYLLABUS COMO PLANTILLA DE REFERENCIA
-- ==============================================

-- PASO 1: Ver los syllabi recientes que has creado
SELECT 
  id,
  nombre,
  periodo,
  usuario_id,
  es_plantilla_referencia,
  "createdAt"
FROM syllabi
WHERE "deletedAt" IS NULL
ORDER BY "createdAt" DESC
LIMIT 10;

-- PASO 2: Marcar el syllabus correcto como plantilla
-- ⚠️  REEMPLAZA 'TU_ID_AQUI' con el ID real del syllabus
-- ⚠️  REEMPLAZA 'TU_PERIODO_EXACTO' con el periodo exacto

-- Primero, desmarcar cualquier plantilla existente para ese periodo
UPDATE syllabi 
SET es_plantilla_referencia = false 
WHERE periodo = 'Primer Periodo PII 2026'
  AND es_plantilla_referencia = true;

-- Ahora marcar el syllabus correcto como plantilla
-- EJEMPLO: Si tu syllabus tiene ID = 5
UPDATE syllabi 
SET es_plantilla_referencia = true 
WHERE id = 5  -- ⚠️  CAMBIA ESTE NÚMERO
  AND periodo = 'Primer Periodo PII 2026';

-- PASO 3: Verificar que se marcó correctamente
SELECT 
  id,
  nombre,
  periodo,
  es_plantilla_referencia,
  usuario_id,
  jsonb_array_length(datos_syllabus->'tabs') as num_tabs,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(datos_syllabus->'tabs') as tab,
         jsonb_array_elements(tab->'rows') as row,
         jsonb_array_elements(row->'cells') as cell
    WHERE (cell->>'isHeader')::boolean = true
  ) as total_headers
FROM syllabi
WHERE es_plantilla_referencia = true
  AND periodo = 'Primer Periodo PII 2026';

-- PASO 4: Ver los primeros 20 títulos que se validarán
SELECT 
  cell->>'content' as titulo
FROM syllabi,
     jsonb_array_elements(datos_syllabus->'tabs') as tab,
     jsonb_array_elements(tab->'rows') as row,
     jsonb_array_elements(row->'cells') as cell
WHERE es_plantilla_referencia = true
  AND periodo = 'Primer Periodo PII 2026'
  AND (cell->>'isHeader')::boolean = true
  AND length(cell->>'content') > 2
LIMIT 20;

-- 💡 TIPS:
-- 1. Si no ves ningún resultado en PASO 3, el UPDATE no funcionó
--    → Verifica que el ID y periodo sean correctos
-- 
-- 2. Si "total_headers" sale 0, significa que no marcaste ningún campo como "Es encabezado"
--    → Ve al editor visual y marca los campos importantes con el checkbox
-- 
-- 3. Si "num_tabs" sale NULL, el syllabus no tiene la estructura correcta
--    → Necesitas crear un syllabus nuevo desde el editor visual
