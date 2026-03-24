# 🎓 GESTIÓN DE FACULTADES, CARRERAS Y MALLAS CURRICULARES
## Implementación de Permisos por Facultad para Comisión Académica

**Fecha:** 10 de enero de 2026  
**Estado:** ✅ COMPLETADO

---

## 📋 DESCRIPCIÓN GENERAL

Se ha implementado un sistema completo de gestión de facultades, carreras y mallas curriculares con permisos específicos para la **Comisión Académica**. Ahora los usuarios con rol `comision_academica` solo pueden ver y gestionar las carreras y mallas de su propia facultad.

---

## 🔧 CAMBIOS IMPLEMENTADOS

### 1. **Nueva Ruta: Carreras** (`/api/carreras`)

#### Archivo Creado:
- `my-node-backend/src/routes/carrera.routes.js`

#### Endpoints Disponibles:
```javascript
GET    /api/carreras           // Obtener carreras (filtradas por facultad si es comision)
POST   /api/carreras           // Crear carrera (admin y comision_academica)
PUT    /api/carreras/:id       // Actualizar carrera
DELETE /api/carreras/:id       // Eliminar carrera
```

#### Permisos:
- **GET**: `administrador`, `comision_academica`, `comision`
- **POST/PUT/DELETE**: `administrador`, `comision_academica`

---

### 2. **Nueva Ruta: Facultades** (`/api/facultades`)

#### Archivo Creado:
- `my-node-backend/src/routes/facultad.routes.js`

#### Endpoints Disponibles:
```javascript
GET    /api/facultades         // Obtener todas las facultades
POST   /api/facultades         // Crear facultad (solo admin)
PUT    /api/facultades/:id     // Actualizar facultad (solo admin)
DELETE /api/facultades/:id     // Eliminar facultad (solo admin)
```

#### Permisos:
- **GET**: Todos los roles autenticados
- **POST/PUT/DELETE**: Solo `administrador`

---

### 3. **Controlador de Carreras Actualizado**

#### Archivo Modificado:
- `my-node-backend/src/controllers/carrera.controller.js`

#### Cambios Principales:

##### `getAll()` - Obtener Carreras
```javascript
// Si es comision_academica o comision, filtra por su facultad
if (user.rol === 'comision_academica' || user.rol === 'comision') {
  const facultad = await Facultad.findOne({
    where: { nombre: user.facultad }
  });
  whereClause.facultad_id = facultad.id;
}
```

##### `create()` - Crear Carrera
```javascript
// Valida que la comision_academica solo cree carreras en su facultad
if (user.rol === 'comision_academica' || user.rol === 'comision') {
  if (facultad.nombre !== user.facultad) {
    return res.status(403).json({ 
      message: 'No tienes permisos para crear carreras en otra facultad.' 
    });
  }
}
```

##### `update()` y `delete()` - Actualizar/Eliminar Carrera
- Validación de pertenencia a la facultad del usuario
- Impide cambiar carreras a otra facultad
- Solo permite modificar/eliminar carreras de su propia facultad

---

### 4. **Controlador de Mallas Actualizado**

#### Archivo Modificado:
- `my-node-backend/src/controllers/mallaController.js`

#### Cambios Principales:

##### `getAllMallas()` - Obtener Mallas
```javascript
// Filtra mallas por facultad del usuario
if (user.rol === 'comision_academica' || user.rol === 'comision') {
  const facultadUsuario = await Facultad.findOne({
    where: { nombre: user.facultad }
  });
  whereClause.facultad_id = facultadUsuario.id;
}
```

##### `createMalla()` - Crear Malla
```javascript
// Valida que la facultad y carrera pertenezcan al usuario
// Verifica que la carrera pertenezca a la facultad especificada
const carrera = await Carrera.findOne({
  where: { 
    id: carrera_id,
    facultad_id: facultad_id
  }
});
```

##### `updateMalla()` y `deleteMalla()` - Actualizar/Eliminar Malla
- Validación de pertenencia a la facultad del usuario
- Impide cambiar mallas a otra facultad
- Solo permite modificar/eliminar mallas de su propia facultad

---

### 5. **Rutas de Mallas Actualizadas**

#### Archivo Modificado:
- `my-node-backend/src/routes/malla.routes.js`

#### Cambio:
```javascript
// Antes: Sin authorize
router.get('/', mallaController.getAllMallas);

// Ahora: Con permisos específicos
router.get('/', authorize(['administrador', 'comision_academica', 'comision']), mallaController.getAllMallas);
router.post('/', authorize(['administrador', 'comision_academica']), mallaController.createMalla);
router.put('/:id', authorize(['administrador', 'comision_academica']), mallaController.updateMalla);
router.delete('/:id', authorize(['administrador', 'comision_academica']), mallaController.deleteMalla);
```

---

### 6. **Registro de Rutas Principal**

#### Archivo Modificado:
- `my-node-backend/src/routes/index.js`

#### Rutas Agregadas:
```javascript
const carreraRoutes = require('./carrera.routes');
const facultadRoutes = require('./facultad.routes');

router.use('/carreras', carreraRoutes);
router.use('/facultades', facultadRoutes);
```

---

## 🔐 LÓGICA DE PERMISOS

### Estructura de Base de Datos:
```
facultades
  ├── id
  └── nombre

carreras
  ├── id
  ├── nombre
  └── facultad_id (FK)

mallas
  ├── id
  ├── codigo_malla
  ├── facultad_id (FK)
  └── carrera_id (FK)

usuarios
  ├── id
  ├── rol
  └── facultad (nombre de la facultad asignada)
```

### Reglas de Negocio:

#### Para Administrador:
✅ Ver todas las facultades, carreras y mallas  
✅ Crear, editar, eliminar cualquier registro  
✅ Sin restricciones

#### Para Comisión Académica:
✅ Ver solo carreras y mallas de su facultad  
✅ Crear carreras y mallas en su facultad  
✅ Editar carreras y mallas de su facultad  
✅ Eliminar carreras y mallas de su facultad  
❌ No puede acceder a otras facultades  
❌ No puede cambiar registros a otra facultad

#### Para Comisión (rol 'comision'):
✅ Ver carreras y mallas de su facultad  
❌ No puede crear, editar o eliminar

---

## 🧪 PRUEBAS Y VALIDACIONES

### Casos de Uso:

#### 1. Comisión Académica - Facultad de Ingeniería
```javascript
// Usuario: comision_academica
// Facultad: "Ingeniería"

GET /api/carreras
→ Devuelve solo carreras de Ingeniería

GET /api/mallas
→ Devuelve solo mallas de Ingeniería

POST /api/carreras { nombre: "Sistemas", facultad_id: 1 }
→ ✅ Éxito si facultad_id=1 es Ingeniería
→ ❌ 403 si facultad_id pertenece a otra facultad

DELETE /api/carreras/5
→ ✅ Éxito si la carrera 5 es de Ingeniería
→ ❌ 403 si la carrera 5 es de otra facultad
```

#### 2. Administrador
```javascript
// Usuario: administrador

GET /api/carreras
→ Devuelve TODAS las carreras de todas las facultades

POST /api/carreras { nombre: "Derecho", facultad_id: 3 }
→ ✅ Éxito siempre (sin restricciones)

DELETE /api/mallas/10
→ ✅ Éxito siempre (sin restricciones)
```

---

## 📡 ENDPOINTS COMPLETOS

### Facultades
```
GET    /api/facultades              → Lista todas las facultades
POST   /api/facultades              → Crear facultad (admin)
PUT    /api/facultades/:id          → Actualizar facultad (admin)
DELETE /api/facultades/:id          → Eliminar facultad (admin)
```

### Carreras
```
GET    /api/carreras                → Lista carreras (filtradas por facultad)
POST   /api/carreras                → Crear carrera (admin, comision_academica)
PUT    /api/carreras/:id            → Actualizar carrera (admin, comision_academica)
DELETE /api/carreras/:id            → Eliminar carrera (admin, comision_academica)
```

### Mallas
```
GET    /api/mallas                  → Lista mallas (filtradas por facultad)
GET    /api/mallas/codigo/:codigo   → Buscar malla por código
POST   /api/mallas                  → Crear malla (admin, comision_academica)
PUT    /api/mallas/:id              → Actualizar malla (admin, comision_academica)
DELETE /api/mallas/:id              → Eliminar malla (admin, comision_academica)
```

---

## 🚀 CÓMO USAR

### Desde el Frontend:

#### 1. Obtener Carreras de la Facultad del Usuario
```typescript
const response = await fetch('http://localhost:5000/api/carreras', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data: carreras } = await response.json();
// Si el usuario es comision_academica, solo verá carreras de su facultad
```

#### 2. Crear Nueva Carrera
```typescript
const response = await fetch('http://localhost:5000/api/carreras', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    nombre: 'Ingeniería en Sistemas',
    facultad_id: 1
  })
});
// ✅ Éxito si facultad_id coincide con la facultad del usuario
// ❌ 403 si intenta crear en otra facultad
```

#### 3. Obtener Mallas
```typescript
const response = await fetch('http://localhost:5000/api/mallas', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data: mallas } = await response.json();
// Automáticamente filtradas por facultad si es comision_academica
```

---

## ✅ VERIFICACIÓN DE IMPLEMENTACIÓN

### Checklist:
- [x] Ruta `/api/carreras` creada y configurada
- [x] Ruta `/api/facultades` creada y configurada
- [x] Controlador de carreras con filtrado por facultad
- [x] Controlador de mallas con filtrado por facultad
- [x] Validación de permisos en crear carrera
- [x] Validación de permisos en actualizar carrera
- [x] Validación de permisos en eliminar carrera
- [x] Validación de permisos en crear malla
- [x] Validación de permisos en actualizar malla
- [x] Validación de permisos en eliminar malla
- [x] Rutas registradas en index.js
- [x] Permisos `authorize()` agregados a todas las rutas
- [x] Validación de que carrera pertenezca a facultad
- [x] Código corregido (Number.parseInt en lugar de parseInt)

---

## 🎯 BENEFICIOS

✅ **Seguridad**: Cada comisión académica solo ve y gestiona su propia facultad  
✅ **Escalabilidad**: Fácil agregar nuevas facultades y carreras  
✅ **Mantenibilidad**: Código modular y bien organizado  
✅ **Trazabilidad**: Todas las acciones validadas por el middleware de autenticación  
✅ **Flexibilidad**: Administrador mantiene control total

---

## 🔄 FLUJO COMPLETO

```
1. Usuario comision_academica inicia sesión
   ↓
2. JWT incluye { rol: "comision_academica", facultad: "Ingeniería" }
   ↓
3. Usuario solicita GET /api/carreras
   ↓
4. Middleware authenticate verifica el token
   ↓
5. Middleware authorize verifica el rol
   ↓
6. Controlador carrera.getAll() lee user.facultad
   ↓
7. Busca facultad_id donde nombre = "Ingeniería"
   ↓
8. Filtra carreras WHERE facultad_id = [id_ingeniería]
   ↓
9. Devuelve solo carreras de Ingeniería
```

---

## 📝 NOTAS IMPORTANTES

1. **Campo `facultad` en tabla `usuarios`**:
   - Debe ser un STRING con el nombre exacto de la facultad
   - Debe coincidir con `facultades.nombre`
   - Ejemplo: "Ingeniería", "Ciencias de la Salud", etc.

2. **Validación de Datos**:
   - Siempre se valida que el usuario tenga facultad asignada
   - Se valida que la facultad exista en la BD
   - Se valida que la carrera pertenezca a la facultad correcta

3. **Relaciones de Base de Datos**:
   - `carreras.facultad_id` → `facultades.id`
   - `mallas.facultad_id` → `facultades.id`
   - `mallas.carrera_id` → `carreras.id`

---

## 🎓 RESULTADO FINAL

La **Comisión Académica** ahora puede:

✅ Registrar todas las **carreras** de su facultad  
✅ Gestionar todas las **mallas curriculares** de su facultad  
✅ Ver solo información de su propia facultad  
✅ Mantener autonomía dentro de su ámbito  
❌ Sin acceso a otras facultades  

El sistema está **100% funcional** y listo para usar. 🚀
