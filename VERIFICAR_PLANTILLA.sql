-- 🔍 VERIFICAR SI EXISTE PLANTILLA DE REFERENCIA
-- ===============================================

-- 1. Ver todas las plantillas de referencia
SELECT 
  id,
  nombre,
  periodo,
  es_plantilla_referencia,
  usuario_id,
  "createdAt",
  LENGTH(datos_syllabus::text) as tamaño_datos
FROM syllabi
WHERE es_plantilla_referencia = true
ORDER BY "createdAt" DESC;

-- 2. Ver si existe para el periodo específico
SELECT 
  id,
  nombre,
  periodo,
  es_plantilla_referencia,
  usuario_id
FROM syllabi
WHERE periodo = 'Primer Periodo PII 2026' 
  AND es_plantilla_referencia = true;

-- 3. Ver TODOS los syllabi del periodo (incluso si no son plantilla)
SELECT 
  id,
  nombre,
  periodo,
  es_plantilla_referencia,
  usuario_id
FROM syllabi
WHERE periodo = 'Primer Periodo PII 2026'
ORDER BY "createdAt" DESC;

-- 4. Contar campos con isHeader=true en la plantilla
-- (esto ayuda a verificar que la estructura es correcta)
SELECT 
  id,
  nombre,
  jsonb_array_length(datos_syllabus->'tabs') as num_tabs,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(datos_syllabus->'tabs') as tab,
         jsonb_array_elements(tab->'rows') as row,
         jsonb_array_elements(row->'cells') as cell
    WHERE (cell->>'isHeader')::boolean = true
  ) as total_headers
FROM syllabi
WHERE periodo = 'Primer Periodo PII 2026'
  AND es_plantilla_referencia = true;

-- 5. Ver los primeros títulos de la plantilla
SELECT 
  id,
  nombre,
  (
    SELECT jsonb_agg(cell->>'content')
    FROM (
      SELECT cell
      FROM jsonb_array_elements(datos_syllabus->'tabs') as tab,
           jsonb_array_elements(tab->'rows') as row,
           jsonb_array_elements(row->'cells') as cell
      WHERE (cell->>'isHeader')::boolean = true
      LIMIT 10
    ) sub
  ) as primeros_10_headers
FROM syllabi
WHERE periodo = 'Primer Periodo PII 2026'
  AND es_plantilla_referencia = true;
