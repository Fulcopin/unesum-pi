-- ===================================================================
-- AGREGAR CAMPO carrera_id A LA TABLA usuarios
-- Para permitir que comisión académica gestione UNA SOLA CARRERA
-- ===================================================================

-- 1. Agregar la columna carrera_id
ALTER TABLE usuarios 
ADD COLUMN carrera_id INTEGER;

-- 2. Agregar la foreign key constraint
ALTER TABLE usuarios
ADD CONSTRAINT fk_usuarios_carrera
FOREIGN KEY (carrera_id) 
REFERENCES carreras(id) 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- 3. Agregar comentario
COMMENT ON COLUMN usuarios.carrera_id IS 'Carrera asignada al usuario (para comisión académica de carrera específica)';

-- ===================================================================
-- ASIGNAR UNA CARRERA AL USUARIO DE COMISIÓN ACADÉMICA
-- ===================================================================

-- 4. Primero, ver qué carreras existen de tu facultad
SELECT c.id, c.nombre, f.nombre as facultad
FROM carreras c
INNER JOIN facultades f ON c.facultad_id = f.id
WHERE f.nombre = 'Facultad de Ciencias Técnicas'
ORDER BY c.nombre;

-- 5. Ver tu usuario actual
SELECT id, nombres, apellidos, correo_electronico, rol, facultad, carrera_id
FROM usuarios
WHERE id = 3;

-- 6. Asignar una carrera específica al usuario
-- REEMPLAZA EL ID_DE_LA_CARRERA con el ID que viste en el paso 4
UPDATE usuarios 
SET carrera_id = ID_DE_LA_CARRERA
WHERE id = 3;

-- 7. Verificar que se asignó correctamente
SELECT 
  u.id, 
  u.nombres, 
  u.apellidos, 
  u.rol, 
  u.facultad,
  u.carrera_id,
  c.nombre as carrera_asignada
FROM usuarios u
LEFT JOIN carreras c ON u.carrera_id = c.id
WHERE u.id = 3;

-- ===================================================================
-- EJEMPLO:
-- Si la carrera "Ingeniería en Sistemas" tiene ID = 1, entonces:
-- UPDATE usuarios SET carrera_id = 1 WHERE id = 3;
-- ===================================================================
