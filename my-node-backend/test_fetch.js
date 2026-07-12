async function run() {
  try {
    const res = await fetch("http://localhost:4000/api/asignaturas?carrera_id=28");
    const json = await res.json();
    console.log("STATUS:", res.status);
    console.log("SUCCESS:", json.success);
    const asig595 = json.data.find(x => x.id == 595 || x.id == "595");
    console.log("ASIG 595 over HTTP:", JSON.stringify(asig595, null, 2));
  } catch(e) {
    console.error("ERROR:", e);
  }
}
run();
