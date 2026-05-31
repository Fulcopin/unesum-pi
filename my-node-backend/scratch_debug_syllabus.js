const path = require('path');
require('dotenv').config();

const db = require('./src/models');
const Syllabus = db.Syllabus;

async function run() {
  console.log("Starting DB save test...");
  try {
    const testSyllabus = await Syllabus.create({
      nombre: "Syllabus de prueba de guardado",
      periodo: "2026-I",
      materias: "Asignatura de prueba",
      datos_syllabus: {
        version: "2.0",
        tabs: []
      },
      usuario_id: 1 // Usamos ID 1 como prueba (generalmente el admin o primer usuario registrado)
    });
    console.log("SUCCESS! Created syllabus with ID:", testSyllabus.id);
  } catch (error) {
    console.error("FAILED! Exact database error detail:");
    console.error(error);
    if (error.parent) {
      console.error("SQL Parent error:", error.parent);
    }
  } finally {
    process.exit(0);
  }
}

run();
