-- =========================================
-- SCRIPT PARA VERIFICAR CONTENIDO GUARDADO
-- =========================================

-- 1. Ver todos los contenidos guardados
SELECT 
  cp.id,
  cp.programa_id,
  cp.seccion_id,
  sp.nombre as seccion_nombre,
  sp.tipo as seccion_tipo,
  cp.profesor_id,
  LEFT(cp.contenido_texto, 100) as contenido_preview,
  cp.created_at,
  cp.updated_at
FROM contenido_programa cp
INNER JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
ORDER BY cp.programa_id, sp.orden;

-- 2. Ver filas de tablas guardadas
SELECT 
  ftp.id as fila_id,
  ftp.contenido_id,
  ftp.orden as numero_fila,
  cp.programa_id,
  sp.nombre as seccion_nombre,
  ftp.created_at
FROM filas_tabla_programa ftp
INNER JOIN contenido_programa cp ON ftp.contenido_id = cp.id
INNER JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
ORDER BY cp.programa_id, sp.orden, ftp.orden;

-- 3. Ver valores de campos guardados (contenido de las celdas)
SELECT 
  vcp.id,
  vcp.fila_id,
  ftp.orden as numero_fila,
  cs.etiqueta as campo_nombre,
  vcp.valor,
  cp.programa_id,
  sp.nombre as seccion_nombre
FROM valores_campo_programa vcp
INNER JOIN filas_tabla_programa ftp ON vcp.fila_id = ftp.id
INNER JOIN contenido_programa cp ON ftp.contenido_id = cp.id
INNER JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
INNER JOIN campos_seccion cs ON vcp.campo_id = cs.id
ORDER BY cp.programa_id, sp.orden, ftp.orden, cs.orden;

-- 4. Ver contenido completo de un programa específico (cambiar el ID)
-- Reemplaza :programa_id con el ID del programa que quieres ver
SELECT 
  'Programa' as tipo,
  pa.id,
  pa.nombre,
  pl.nombre as plantilla,
  pa.created_at
FROM programas_analiticos pa
LEFT JOIN plantillas_programa pl ON pa.plantilla_id = pl.id
WHERE pa.id = 1; -- Cambiar el ID aquí

-- 5. Ver secciones de texto largo con su contenido
SELECT 
  sp.nombre as seccion,
  cp.contenido_texto,
  cp.profesor_id,
  cp.updated_at as ultima_modificacion
FROM contenido_programa cp
INNER JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
WHERE cp.programa_id = 1 -- Cambiar el ID aquí
  AND sp.tipo = 'texto_largo'
ORDER BY sp.orden;

-- 6. Ver secciones de tabla con su contenido (formato legible)
SELECT 
  sp.nombre as seccion,
  ftp.orden as fila,
  cs.etiqueta as campo,
  vcp.valor,
  cp.profesor_id
FROM contenido_programa cp
INNER JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
INNER JOIN filas_tabla_programa ftp ON cp.id = ftp.contenido_id
INNER JOIN valores_campo_programa vcp ON ftp.id = vcp.fila_id
INNER JOIN campos_seccion cs ON vcp.campo_id = cs.id
WHERE cp.programa_id = 1 -- Cambiar el ID aquí
  AND sp.tipo = 'tabla'
ORDER BY sp.orden, ftp.orden, cs.orden;

-- 7. Contar registros por tabla
SELECT 
  'contenido_programa' as tabla,
  COUNT(*) as total_registros
FROM contenido_programa
UNION ALL
SELECT 
  'filas_tabla_programa' as tabla,
  COUNT(*) as total_registros
FROM filas_tabla_programa
UNION ALL
SELECT 
  'valores_campo_programa' as tabla,
  COUNT(*) as total_registros
FROM valores_campo_programa;

-- 8. Ver último contenido guardado
SELECT 
  cp.id,
  cp.programa_id,
  pa.nombre as programa,
  sp.nombre as seccion,
  sp.tipo,
  cp.profesor_id,
  CASE 
    WHEN sp.tipo = 'texto_largo' THEN LEFT(cp.contenido_texto, 50)
    ELSE '(ver filas y valores)'
  END as contenido,
  cp.created_at,
  cp.updated_at
FROM contenido_programa cp
INNER JOIN programas_analiticos pa ON cp.programa_id = pa.id
INNER JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
ORDER BY cp.updated_at DESC
LIMIT 10;

-- 9. Ver estructura completa de "Datos Generales" guardados
-- Esta consulta muestra los valores guardados en la primera sección (normalmente Datos Generales)
WITH primera_seccion AS (
  SELECT sp.id, sp.nombre
  FROM secciones_plantilla sp
  WHERE sp.tipo = 'tabla'
  ORDER BY sp.orden
  LIMIT 1
)
SELECT 
  cs.etiqueta as campo,
  vcp.valor,
  cp.programa_id,
  pa.nombre as programa,
  cp.profesor_id
FROM valores_campo_programa vcp
INNER JOIN filas_tabla_programa ftp ON vcp.fila_id = ftp.id
INNER JOIN contenido_programa cp ON ftp.contenido_id = cp.id
INNER JOIN programas_analiticos pa ON cp.programa_id = pa.id
INNER JOIN campos_seccion cs ON vcp.campo_id = cs.id
INNER JOIN primera_seccion ps ON cp.seccion_id = ps.id
WHERE ftp.orden = 1  -- Primera fila (Datos Generales solo tiene 1 fila)
ORDER BY cp.programa_id, cs.orden;

-- 10. Ver si hay datos guardados (resumen general)
SELECT 
  pa.id as programa_id,
  pa.nombre as programa,
  pl.nombre as plantilla,
  COUNT(DISTINCT cp.id) as secciones_llenadas,
  COUNT(DISTINCT ftp.id) as filas_tabla,
  COUNT(DISTINCT vcp.id) as valores_guardados,
  MAX(cp.updated_at) as ultima_actualizacion
FROM programas_analiticos pa
LEFT JOIN plantillas_programa pl ON pa.plantilla_id = pl.id
LEFT JOIN contenido_programa cp ON pa.id = cp.programa_id
LEFT JOIN filas_tabla_programa ftp ON cp.id = ftp.contenido_id
LEFT JOIN valores_campo_programa vcp ON ftp.id = vcp.fila_id
GROUP BY pa.id, pa.nombre, pl.nombre
ORDER BY pa.id;
