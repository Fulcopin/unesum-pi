-- ============================================
-- VERIFICACIÓN Y DIAGNÓSTICO DEL PROBLEMA
-- ============================================

-- PASO 1: Verificar el usuario actual y su carrera_id
-- ---------------------------------------------------
SELECT 
  id, 
  nombres, 
  apellidos, 
  correo_electronico, 
  rol, 
  facultad, 
  carrera, 
  carrera_id
FROM usuarios
WHERE id = 3;

-- ❓ PREGUNTA: ¿El campo carrera_id tiene un valor o es NULL?
-- Si es NULL, el backend enviará TODAS las carreras de la facultad
-- Si tiene un número (por ejemplo 6), el backend enviará SOLO esa carrera


-- PASO 2: Ver qué carrera tiene asignada (si carrera_id NO es NULL)
-- -----------------------------------------------------------------
SELECT 
  u.id as usuario_id,
  u.nombres,
  u.apellidos,
  u.carrera_id,
  c.id as carrera_real_id,
  c.nombre as carrera_nombre,
  f.nombre as facultad_nombre
FROM usuarios u
LEFT JOIN carreras c ON u.carrera_id = c.id
LEFT JOIN facultades f ON c.facultad_id = f.id
WHERE u.id = 3;


-- PASO 3: Si carrera_id es NULL, necesitas asignarlo
-- ---------------------------------------------------
-- Primero, busca el ID de la carrera que quieres asignar
SELECT id, nombre, facultad_id
FROM carreras
WHERE nombre LIKE '%Eléctrica%'
ORDER BY nombre;

-- Luego asigna la carrera (reemplaza 6 con el ID correcto)
-- UPDATE usuarios SET carrera_id = 6 WHERE id = 3;


-- PASO 4: Verificar cuántas carreras existen en la facultad
-- ---------------------------------------------------------
SELECT 
  f.id as facultad_id,
  f.nombre as facultad,
  COUNT(c.id) as total_carreras,
  STRING_AGG(c.nombre, ', ') as carreras
FROM facultades f
LEFT JOIN carreras c ON c.facultad_id = f.id
WHERE f.nombre = 'Facultad de Ciencias Técnicas'
GROUP BY f.id, f.nombre;


-- PASO 5: Ver todas las carreras de tu facultad
-- ---------------------------------------------
SELECT 
  c.id,
  c.nombre,
  f.nombre as facultad,
  COUNT(a.id) as total_asignaturas
FROM carreras c
JOIN facultades f ON c.facultad_id = f.id
LEFT JOIN asignaturas a ON a.carrera_id = c.id
WHERE f.nombre = 'Facultad de Ciencias Técnicas'
GROUP BY c.id, c.nombre, f.nombre
ORDER BY c.nombre;


-- ============================================
-- DIAGNÓSTICO
-- ============================================
-- Si el PASO 1 muestra carrera_id = NULL:
--   → El backend está enviando TODAS las carreras de la facultad
--   → SOLUCIÓN: Ejecuta el UPDATE del PASO 3
--
-- Si el PASO 1 muestra carrera_id con un número (ej: 6):
--   → El backend DEBERÍA enviar solo 1 carrera
--   → Si el frontend muestra muchas, el problema es del backend o cache
--   → SOLUCIÓN: Reinicia el backend y borra el localStorage del navegador
