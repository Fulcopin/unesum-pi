-- VERIFICACIÓN RÁPIDA
-- Ejecuta esto en Neon SQL Editor para confirmar que el UPDATE funcionó

SELECT 
  id, 
  nombres, 
  apellidos, 
  rol,
  facultad,
  carrera,
  carrera_id
FROM usuarios
WHERE id = 3;

-- Si carrera_id = 5, entonces el UPDATE funcionó
-- El problema es que el token JWT en el navegador NO tiene ese valor
-- SOLUCIÓN: Cierra sesión y vuelve a iniciar sesión
