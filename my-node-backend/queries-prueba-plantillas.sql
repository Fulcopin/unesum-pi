-- Script de prueba para verificar el flujo completo Excel → Plantilla → Docente

-- 1. Ver plantillas creadas recientemente
SELECT 
  id,
  nombre,
  descripcion,
  tipo,
  activa,
  created_at
FROM plantillas_programa
ORDER BY created_at DESC
LIMIT 5;

-- 2. Ver secciones de la última plantilla creada
SELECT 
  sp.id as seccion_id,
  sp.nombre as seccion_nombre,
  sp.tipo,
  sp.orden,
  sp.obligatoria,
  COUNT(cs.id) as num_campos
FROM secciones_plantilla sp
LEFT JOIN campos_seccion cs ON cs.seccion_id = sp.id
WHERE sp.plantilla_id = (SELECT id FROM plantillas_programa ORDER BY created_at DESC LIMIT 1)
GROUP BY sp.id, sp.nombre, sp.tipo, sp.orden, sp.obligatoria
ORDER BY sp.orden;

-- 3. Ver todos los campos de las secciones tipo tabla
SELECT 
  sp.nombre as seccion,
  sp.tipo,
  cs.etiqueta as campo,
  cs.tipo_campo,
  cs.orden as orden_campo,
  cs.obligatorio
FROM campos_seccion cs
JOIN secciones_plantilla sp ON cs.seccion_id = sp.id
WHERE sp.plantilla_id = (SELECT id FROM plantillas_programa ORDER BY created_at DESC LIMIT 1)
  AND sp.tipo = 'tabla'
ORDER BY sp.orden, cs.orden;

-- 4. Ver programas analíticos con plantilla vinculada
SELECT 
  pa.id,
  pa.nombre,
  pa.plantilla_id,
  pp.nombre as plantilla_nombre,
  pa.carrera,
  pa.nivel,
  pa.asignatura,
  pa.created_at
FROM programas_analiticos pa
LEFT JOIN plantillas_programa pp ON pa.plantilla_id = pp.id
WHERE pa.plantilla_id IS NOT NULL
ORDER BY pa.created_at DESC
LIMIT 5;

-- 5. Ver asignaciones de programas a docentes
SELECT 
  apd.id,
  apd.programa_id,
  pa.nombre as programa_nombre,
  apd.profesor_id,
  apd.estado,
  apd.fecha_asignacion
FROM asignaciones_programa_docente apd
JOIN programas_analiticos pa ON apd.programa_id = pa.id
ORDER BY apd.fecha_asignacion DESC
LIMIT 5;

-- 6. Ver contenido guardado por docentes
SELECT 
  cp.id,
  cp.programa_id,
  pa.nombre as programa_nombre,
  cp.seccion_id,
  sp.nombre as seccion_nombre,
  sp.tipo as seccion_tipo,
  cp.profesor_id,
  LEFT(cp.contenido_texto, 50) as contenido_preview,
  cp.created_at
FROM contenido_programa cp
JOIN programas_analiticos pa ON cp.programa_id = pa.id
JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
ORDER BY cp.created_at DESC
LIMIT 10;

-- 7. Ver filas de tablas guardadas
SELECT 
  ft.id as fila_id,
  ft.contenido_id,
  cp.programa_id,
  sp.nombre as seccion_nombre,
  ft.orden,
  COUNT(vcp.id) as num_valores
FROM filas_tabla_programa ft
JOIN contenido_programa cp ON ft.contenido_id = cp.id
JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
LEFT JOIN valores_campo_programa vcp ON vcp.fila_id = ft.id
GROUP BY ft.id, ft.contenido_id, cp.programa_id, sp.nombre, ft.orden
ORDER BY cp.programa_id DESC, ft.orden
LIMIT 10;

-- 8. Ver valores de campos en tablas (con nombres de campos)
SELECT 
  pa.nombre as programa,
  sp.nombre as seccion,
  ft.orden as fila_num,
  cs.etiqueta as campo,
  vcp.valor
FROM valores_campo_programa vcp
JOIN filas_tabla_programa ft ON vcp.fila_id = ft.id
JOIN contenido_programa cp ON ft.contenido_id = cp.id
JOIN programas_analiticos pa ON cp.programa_id = pa.id
JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
JOIN campos_seccion cs ON vcp.campo_id = cs.id
ORDER BY pa.id DESC, sp.orden, ft.orden, cs.orden
LIMIT 20;

-- 9. Query completo para ver la estructura de una plantilla
SELECT 
  pp.id as plantilla_id,
  pp.nombre as plantilla_nombre,
  sp.id as seccion_id,
  sp.nombre as seccion_nombre,
  sp.tipo as seccion_tipo,
  sp.orden as seccion_orden,
  cs.id as campo_id,
  cs.etiqueta as campo_etiqueta,
  cs.tipo_campo,
  cs.orden as campo_orden
FROM plantillas_programa pp
JOIN secciones_plantilla sp ON sp.plantilla_id = pp.id
LEFT JOIN campos_seccion cs ON cs.seccion_id = sp.id
WHERE pp.id = (SELECT id FROM plantillas_programa ORDER BY created_at DESC LIMIT 1)
ORDER BY sp.orden, cs.orden;

-- 10. Verificar que un programa tiene todo listo para que el docente lo llene
SELECT 
  pa.id as programa_id,
  pa.nombre as programa_nombre,
  pa.plantilla_id,
  pp.nombre as plantilla_nombre,
  COUNT(DISTINCT sp.id) as num_secciones,
  COUNT(DISTINCT cs.id) as num_campos_totales,
  COUNT(DISTINCT apd.id) as num_asignaciones
FROM programas_analiticos pa
LEFT JOIN plantillas_programa pp ON pa.plantilla_id = pp.id
LEFT JOIN secciones_plantilla sp ON sp.plantilla_id = pp.id
LEFT JOIN campos_seccion cs ON cs.seccion_id = sp.id
LEFT JOIN asignaciones_programa_docente apd ON apd.programa_id = pa.id
WHERE pa.plantilla_id IS NOT NULL
GROUP BY pa.id, pa.nombre, pa.plantilla_id, pp.nombre
ORDER BY pa.created_at DESC;
