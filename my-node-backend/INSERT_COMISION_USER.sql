-- Script para insertar usuario de Comisión Académica
-- Ejecutar este SQL en tu base de datos PostgreSQL

-- Verificar si el usuario ya existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE correo_electronico = 'comision@unesum.edu.ec') THEN
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
            '1234567890',
            '0999999999',
            'comision@unesum.edu.ec',
            '1980-01-01',
            'UNESUM - Campus Principal',
            'comision_academica',
            'ciencias-economicas',
            NULL,
            '$2b$10$YourHashedPasswordHere', -- Cambiar por hash real de 'comision123'
            true
        );
        
        RAISE NOTICE 'Usuario de Comisión Académica creado exitosamente';
    ELSE
        RAISE NOTICE 'El usuario comision@unesum.edu.ec ya existe';
    END IF;
END $$;

-- Para generar el hash de contraseña, puedes usar Node.js:
-- const bcrypt = require('bcrypt');
-- const hash = await bcrypt.hash('comision123', 10);
-- console.log(hash);

-- O actualizar el usuario existente para cambiar su rol a comision_academica:
-- UPDATE usuarios 
-- SET rol = 'comision_academica' 
-- WHERE correo_electronico = 'comision@unesum.edu.ec';
