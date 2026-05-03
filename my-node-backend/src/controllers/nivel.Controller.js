const { sequelize } = require('../models');
const Nivel = sequelize.models.nivel;

const ORDINAL_TO_NUMBER = {
  primero: 1,
  primer: 1,
  segundo: 2,
  tercero: 3,
  tercera: 3,
  cuarto: 4,
  quinto: 5,
  quinta: 5,
  sexto: 6,
  sexta: 6,
  septimo: 7,
  septima: 7,
  octavo: 8,
  octava: 8,
  noveno: 9,
  novena: 9,
  decimo: 10,
  decima: 10,
};

const NUMBER_TO_ORDINAL = {
  1: 'primero',
  2: 'segundo',
  3: 'tercero',
  4: 'cuarto',
  5: 'quinto',
  6: 'sexto',
  7: 'septimo',
  8: 'octavo',
  9: 'noveno',
  10: 'decimo',
};

const ROMAN_TO_NUMBER = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
};

const toRoman = (num) => {
  if (!Number.isInteger(num) || num <= 0 || num > 3999) return null;

  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];

  let n = num;
  let roman = '';

  for (let i = 0; i < values.length; i++) {
    while (n >= values[i]) {
      roman += symbols[i];
      n -= values[i];
    }
  }

  return roman;
};

const normalizeText = (text = '') => text
  .toString()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

const parseLevelNumber = (text = '') => {
  const raw = text.toString();
  const digits = raw.match(/\d+/);
  if (digits) {
    const n = Number(digits[0]);
    if (Number.isInteger(n) && n > 0) return n;
  }

  const normalized = normalizeText(raw);
  if (!normalized) return null;

  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (ORDINAL_TO_NUMBER[word]) return ORDINAL_TO_NUMBER[word];
    if (ROMAN_TO_NUMBER[word]) return ROMAN_TO_NUMBER[word];
  }

  return null;
};

const getComparableLevelNumber = (nivel) => {
  const texto = [nivel?.romano, nivel?.ordinal, nivel?.nombre, nivel?.codigo]
    .filter(Boolean)
    .join(' ');
  return parseLevelNumber(texto);
};

const getNormalizedName = (text = '') => normalizeText(text);


// Obtener todos los niveles
exports.getAll = async (req, res) => {
  try {
    const niveles = await Nivel.findAll({
      order: [['id', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: niveles // Corregido
    });
  } catch (error) {
    console.error('Error al obtener niveles:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los niveles',
      error: error.message
    });
  }
};

// Obtener un Nivel por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const niveles = await Nivel.findByPk(id); // Renombrado
    
    if (!niveles) { // Renombrado
      return res.status(404).json({
        success: false,
        message: `Nivel con ID ${id} no encontrado`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: niveles // Renombrado
    });
  } catch (error) {
     console.error('Error al obtener los niveles:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los niveles',
      error: error.message
    });
  }
};


// Crear una nuevo nivel
exports.create = async (req, res) => {
  try {
    const { codigo, nombre, estado, ordinal, romano } = req.body;
    
    // Validaciones básicas
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es un campo obligatorio'
      });
    }
    
    // Generar código automáticamente si no se proporciona
    let codigoFinal = codigo;
    if (!codigoFinal) {
      // Obtener el último nivel para generar el siguiente código
      const ultimoNivel = await Nivel.findOne({
        order: [['id', 'DESC']]
      });
      const siguienteNumero = ultimoNivel ? ultimoNivel.id + 1 : 1;
      codigoFinal = siguienteNumero.toString();
    }

    const levelNumber = parseLevelNumber(nombre) || parseLevelNumber(codigoFinal);
    const ordinalFinal = ordinal || (levelNumber ? NUMBER_TO_ORDINAL[levelNumber] || null : null);
    const romanoFinal = romano || (levelNumber ? toRoman(levelNumber) : null);

    const nivelesExistentes = await Nivel.findAll({
      attributes: ['id', 'codigo', 'nombre', 'ordinal', 'romano']
    });

    const duplicadoPorNumero = levelNumber
      ? nivelesExistentes.some((item) => getComparableLevelNumber(item) === levelNumber)
      : false;

    const nombreNormalizado = getNormalizedName(nombre);
    const duplicadoPorNombre = !!nombreNormalizado && nivelesExistentes.some(
      (item) => getNormalizedName(item.nombre) === nombreNormalizado
    );

    if (duplicadoPorNumero || duplicadoPorNombre) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un nivel registrado con el mismo valor.'
      });
    }
    
    // Verificar si ya existe un nivel con el mismo código
    const existente = await Nivel.findOne({ where: { codigo: codigoFinal } });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un nivel con el código ${codigoFinal}`
      });
    }
    
    // Crear la nueva función
    const nuevoNivel = await Nivel.create({
      codigo: codigoFinal,
      nombre,
      ordinal: ordinalFinal,
      romano: romanoFinal,
      estado: estado || 'activo'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Nivel creado exitosamente',
      data: nuevoNivel
    });
  } catch (error) {
    console.error('Error al crear el nivel:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el nivel',
      error: error.message
    });
  }
};

// Actualizar un Nivel
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, estado, ordinal, romano } = req.body;
    
    // Validación básica
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es un campo obligatorio'
      });
    }
    
    // Buscar la función a actualizar
    const nivel = await Nivel.findByPk(id);
    
    if (!nivel) {
      return res.status(404).json({
        success: false,
        message: `Nivel con ID ${id} no encontrada`
      });
    }
    
    // Actualizar los campos (el código no se modifica)
    const baseNombre = nombre || nivel.nombre;
    const levelNumber = parseLevelNumber(baseNombre) || parseLevelNumber(nivel.codigo);
    const ordinalFinal = ordinal || (levelNumber ? NUMBER_TO_ORDINAL[levelNumber] || nivel.ordinal || null : nivel.ordinal || null);
    const romanoFinal = romano || (levelNumber ? toRoman(levelNumber) || nivel.romano || null : nivel.romano || null);

    const nivelesExistentes = await Nivel.findAll({
      attributes: ['id', 'codigo', 'nombre', 'ordinal', 'romano']
    });

    const duplicadoPorNumero = levelNumber
      ? nivelesExistentes.some(
          (item) => String(item.id) !== String(id) && getComparableLevelNumber(item) === levelNumber
        )
      : false;

    const nombreNormalizado = getNormalizedName(baseNombre);
    const duplicadoPorNombre = !!nombreNormalizado && nivelesExistentes.some(
      (item) => String(item.id) !== String(id) && getNormalizedName(item.nombre) === nombreNormalizado
    );

    if (duplicadoPorNumero || duplicadoPorNombre) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un nivel registrado con el mismo valor.'
      });
    }

    await nivel.update({
      nombre: nombre || nivel.nombre,
      ordinal: ordinalFinal,
      romano: romanoFinal,
      estado: estado || nivel.estado
    });
    
    return res.status(200).json({
      success: true,
      message: 'Nivel actualizado exitosamente',
      data: nivel
    });
  } catch (error) {
    console.error('Error al actualizar el nivel:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el nivel',
      error: error.message
    });
  }
};

// Cambiar el estado del Nivel
exports.changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    if (!estado || !['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'El estado debe ser "activo" o "inactivo"'
      });
    }
    
    const nivel = await Nivel.findByPk(id);
    
    if (!nivel) {
      return res.status(404).json({
        success: false,
        message: `Nivel con ID ${id} no encontrada`
      });
    }
    
    await nivel.update({ estado });
    
    return res.status(200).json({
      success: true,
      message: `Estado del Nivel cambiado a ${estado}`,
      data: nivel
    });
  } catch (error) {
    console.error('Error al cambiar estado del Nivel:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado del Nivel',
      error: error.message
    });
  }
};

// Eliminar un Paralelo
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const nivel = await Nivel.findByPk(id);
    
    if (!nivel) {
      return res.status(404).json({
        success: false,
        message: `Nivel con ID ${id} no encontrada`
      });
    }
    
    await nivel.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Nivel eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar el nivel:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el nivel',
      error: error.message
    });
  }
};