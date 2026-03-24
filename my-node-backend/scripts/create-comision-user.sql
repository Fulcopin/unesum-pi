-- Script para crear usuario de Comisión Académica
-- Ejecuta esto en tu base de datos PostgreSQL

-- Primero verifica si el usuario ya existe
SELECT * FROM usuarios WHERE correo_electronico = 'comision@unesum.edu.ec';

-- Si no existe, insértalo (la contraseña "comision123" debe estar hasheada)
-- Nota: Debes hashear la contraseña usando bcrypt antes de insertarla
-- Por ahora, este es un ejemplo con contraseña en texto plano (NO RECOMENDADO PARA PRODUCCIÓN)

INSERT INTO usuarios (
  nombres,
  apellidos,
  cedula_identidad,
  telefono,
  correo_electronico,
  fecha_nacimiento,
  direccion,
  rol,
  facultad,
  carrera,
  contraseña,
  estado
) VALUES (
  'Comisión',
  'Académica',
  '9999999999',
  '0999999999',
  'comision@unesum.edu.ec',
  '1980-01-01',
  'UNESUM',
  'comision_academica',
  'Ciencias Económicas',
  NULL,
  '$2b$10$YourHashedPasswordHere', -- Reemplaza con el hash de "comision123"
  true
)
ON CONFLICT (correo_electronico) DO UPDATE
SET rol = 'comision_academica',
    estado = true;

-- Verifica que se creó correctamente
SELECT id, nombres, apellidos, correo_electronico, rol, estado 
FROM usuarios 
WHERE correo_electronico = 'comision@unesum.edu.ec';
