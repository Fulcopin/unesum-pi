const SequelizeAuto = require('sequelize-auto');
const config = require('../sequelize-auto-config.js');

async function generateModels() {
  try {
    console.log('Generando modelos desde la base de datos...');
    
    const auto = new SequelizeAuto(
      config.database,
      config.username, 
      config.password, 
      config
    );
    
    const data = await auto.run();
    console.log('Modelos generados con éxito en', config.directory);
    console.log('Tablas procesadas:', Object.keys(data.tables).join(', '));
  } catch (error) {
    console.error('Error al generar modelos:', error);
    process.exit(1);
  }
}

generateModels();