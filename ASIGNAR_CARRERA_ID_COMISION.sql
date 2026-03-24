-- ============================================================
-- ASIGNAR carrera_id A USUARIOS DE comision_academica
-- Ejecutar en pgAdmin o psql contra tu base de datos
-- ============================================================

-- PASO 1: Ver qué usuarios existen con rol comision_academica
-- y qué carreras hay en la BD
SELECT u.id, u.nombres, u.carrera, u.carrera_id, u.facultad
FROM usuarios u
WHERE u.rol = 'comision_academica';

-- PASO 2: Ver carreras disponibles
SELECT id, nombre FROM carreras ORDER BY nombre;

-- PASO 3: Actualizar carrera_id automáticamente haciendo match por nombre
-- (Esto une por nombre exacto, insensible a mayúsculas)
UPDATE usuarios u
SET carrera_id = c.id
FROM carreras c
WHERE u.rol = 'comision_academica'
  AND u.carrera_id IS NULL
  AND LOWER(TRIM(u.carrera)) = LOWER(TRIM(c.nombre));

-- Verificar el resultado
SELECT u.id, u.nombres, u.carrera, u.carrera_id, c.nombre AS carrera_real
FROM usuarios u
LEFT JOIN carreras c ON c.id = u.carrera_id
WHERE u.rol = 'comision_academica';
