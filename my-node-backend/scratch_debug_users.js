const db = require('./src/models');
const Usuario = db.Usuario;

async function run() {
  try {
    const users = await Usuario.findAll({
      attributes: ['id', 'nombres', 'apellidos', 'correo_electronico', 'rol']
    });
    console.log("Registered Users in Database:");
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Error fetching users:", error);
  } finally {
    process.exit(0);
  }
}

run();
