const { Rol } = require('../models');

const ROLES_BASE = [
  { codigo: 'administrador',      nombre: 'Administrador',      descripcion: 'Acceso total al sistema' },
  { codigo: 'comision_academica', nombre: 'Comisión Académica', descripcion: 'Gestión de syllabus y programas analíticos' },
  { codigo: 'docente',            nombre: 'Docente',            descripcion: 'Acceso a módulos de docente' },
  { codigo: 'direccion',          nombre: 'Dirección',          descripcion: 'Dirección de carrera' },
  { codigo: 'decano',             nombre: 'Decano',             descripcion: 'Decano de facultad' },
  { codigo: 'subdecano',          nombre: 'Subdecano',          descripcion: 'Subdecano de facultad' },
  { codigo: 'estudiante',         nombre: 'Estudiante',         descripcion: 'Acceso de estudiante' },
];

async function seedRoles() {
  try {
    let creados = 0;
    for (const rol of ROLES_BASE) {
      const [, created] = await Rol.findOrCreate({
        where: { codigo: rol.codigo },
        defaults: { ...rol, estado: true },
      });
      if (created) creados += 1;
    }
    if (creados > 0) {
      console.log(`[seed:roles] Insertados ${creados} roles base`);
    } else {
      console.log('[seed:roles] Roles base ya existían, no se insertó nada');
    }
  } catch (error) {
    console.error('[seed:roles] Error al insertar roles base:', error.message);
  }
}

module.exports = { seedRoles };
