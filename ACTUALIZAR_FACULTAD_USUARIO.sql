-- 1. Primero, verifica qué facultades existen:
SELECT id, nombre FROM facultades ORDER BY nombre;

-- 2. Verifica qué usuarios de comisión académica existen:
SELECT id, nombres, apellidos, correo_electronico, rol, facultad 
FROM usuarios 
WHERE rol IN ('comision_academica', 'comision')
ORDER BY id;

-- 3. Actualiza el usuario de comisión académica con la facultad correcta.
--    Reemplaza 'NOMBRE_FACULTAD' con el nombre EXACTO de la facultad que viste en la consulta 1
--    Reemplaza el ID (1) con el ID del usuario que viste en la consulta 2
UPDATE usuarios 
SET facultad = 'NOMBRE_FACULTAD'
WHERE id = 1 AND rol IN ('comision_academica', 'comision');

-- 4. Verifica que se actualizó correctamente:
SELECT id, nombres, apellidos, correo_electronico, rol, facultad 
FROM usuarios 
WHERE rol IN ('comision_academica', 'comision');

-- EJEMPLO:
-- Si tu facultad se llama "Facultad de Ciencias" y tu usuario tiene ID 5:
-- UPDATE usuarios SET facultad = 'Facultad de Ciencias' WHERE id = 5;
