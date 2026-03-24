# 📝 GUÍA: Cómo Subir Syllabus por Materia

## 🎯 Lo que acabamos de implementar

### ✅ Backend Completado
- Cada profesor puede subir **1 syllabus por materia por periodo**
- Si ya existe, el sistema lo rechaza con error 409
- Puede eliminar el anterior para subir uno nuevo

---

## 🔄 Flujo para Subir Syllabus

### Paso 1: El profesor inicia sesión
- Login con credenciales de profesor

### Paso 2: Va a "Mis Syllabus"
- Ruta: `/dashboard/docente/syllabus`

### Paso 3: Selecciona Periodo y Materia
**AQUÍ ES DONDE NECESITAS AYUDA**

El sistema debe:
1. Mostrar dropdown con periodos académicos
2. Mostrar dropdown con materias asignadas al profesor
3. Cuando seleccione ambos, verificar si ya existe syllabus

### Paso 4: Sistema verifica existencia
```javascript
// Llamada a API
GET /api/syllabi/verificar-existencia?periodo=2024-1&asignatura_id=15
```

**Si NO existe:**
- ✅ Mostrar formulario para subir documento

**Si SÍ existe:**
- ⚠️ Mostrar alerta: "Ya existe un syllabus para esta materia"
- 🗑️ Botón: "Eliminar para subir nuevo"

### Paso 5: Subir documento
- Upload archivo (Word/Excel)
- El sistema extrae títulos automáticamente
- Guarda con `asignatura_id` y `periodo`

---

## 🛠️ Lo que falta implementar en el Frontend

### Archivo: `app/dashboard/docente/syllabus/page.tsx`

Necesitas agregar:

```tsx
// 1. Estados para selección
const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>('');
const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState<number | null>(null);
const [syllabusExistente, setSyllabusExistente] = useState<any>(null);

// 2. Función para verificar
const verificarExistencia = async () => {
  if (!periodoSeleccionado || !asignaturaSeleccionada) return;
  
  try {
    const response = await fetch(
      `http://localhost:4000/api/syllabi/verificar-existencia?periodo=${periodoSeleccionado}&asignatura_id=${asignaturaSeleccionada}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const data = await response.json();
    
    if (data.existe) {
      setSyllabusExistente(data.syllabus);
      // Mostrar alerta
    } else {
      setSyllabusExistente(null);
      // Habilitar formulario
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// 3. UI para selección
<div className="space-y-4">
  {/* Selector de Periodo */}
  <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
    <SelectTrigger>
      <SelectValue placeholder="Seleccione periodo" />
    </SelectTrigger>
    <SelectContent>
      {periodos.map(p => (
        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
      ))}
    </SelectContent>
  </Select>

  {/* Selector de Materia */}
  <Select 
    value={asignaturaSeleccionada?.toString()} 
    onValueChange={(v) => setAsignaturaSeleccionada(Number(v))}
  >
    <SelectTrigger>
      <SelectValue placeholder="Seleccione materia" />
    </SelectTrigger>
    <SelectContent>
      {materiasDelProfesor.map(m => (
        <SelectItem key={m.id} value={m.id.toString()}>
          {m.nombre} ({m.codigo})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  {/* Alerta si existe */}
  {syllabusExistente && (
    <Alert variant="destructive">
      <AlertTitle>Ya existe un syllabus</AlertTitle>
      <AlertDescription>
        <p>{syllabusExistente.nombre}</p>
        <Button onClick={() => handleEliminar(syllabusExistente.id)}>
          Eliminar para subir nuevo
        </Button>
      </AlertDescription>
    </Alert>
  )}

  {/* Formulario de subida (solo si no existe) */}
  {!syllabusExistente && periodoSeleccionado && asignaturaSeleccionada && (
    <div>
      {/* Aquí va el uploader actual */}
    </div>
  )}
</div>
```

---

## 🎬 Próximos pasos INMEDIATOS

### 1. Iniciar servidores
```bash
# Terminal 1: Backend
cd my-node-backend
npm run dev

# Terminal 2: Frontend  
npm run dev
```

### 2. Probar el endpoint manualmente
Abre Postman o Thunder Client y prueba:
```
GET http://localhost:4000/api/syllabi/verificar-existencia?periodo=2024-1&asignatura_id=1
Header: Authorization: Bearer TU_TOKEN
```

### 3. Ver estructura actual de página
- Abre `app/dashboard/docente/syllabus/page.tsx`
- Busca dónde está el uploader actual
- Agregar los selectores ANTES del uploader

---

## 📞 ¿Qué necesitas que haga YO ahora?

**Opción A:** Te abro el archivo `syllabus/page.tsx` y agrego los selectores
**Opción B:** Te muestro el código exacto de cómo obtener las materias del profesor
**Opción C:** Implemento todo el flujo completo en el frontend

**Dime qué prefieres y lo hago ahora mismo** 👇

---

## 🔍 Diagnóstico de tu error actual

El error `ERR_CONNECTION_REFUSED` significa que el backend no está corriendo.

**Solución:**
1. Abre una terminal
2. Ve a: `cd my-node-backend`
3. Ejecuta: `npm run dev`
4. Espera ver: "Server running on http://localhost:4000"

¿Quieres que te ayude a iniciar los servidores primero?
