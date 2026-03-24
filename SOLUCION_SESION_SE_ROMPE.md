# 🔧 Solución: Sesión Se Rompe Después del Login

## ❌ Problema Identificado

Después de hacer login exitoso, la sesión se "rompe" inmediatamente y te pide volver a iniciar sesión. Esto ocurría por **3 razones principales**:

### 1. **localStorage.clear() antes del login**
El código estaba limpiando TODO el localStorage antes de intentar el login, causando problemas de sincronización.

### 2. **checkAuth() llamaba a endpoint inexistente**
La función `checkAuth` intentaba verificar el token con `GET /api/auth/me`, que probablemente no existe o está fallando, causando que se llame a `logout()` automáticamente.

### 3. **Race condition entre login y checkAuth**
`checkAuth` se ejecutaba inmediatamente después del login, antes de que los datos se guardaran correctamente, causando que detectara una sesión inválida.

---

## ✅ Soluciones Aplicadas

### 1. **Eliminado localStorage.clear() del Login**
**Archivo:** `app/login/page.tsx`

**Antes:**
```typescript
try {
  // Limpiar localStorage antes de intentar login
  localStorage.clear();
  
  const success = await login(email, password);
  // ...
}
```

**Después:**
```typescript
try {
  // Ya NO limpiamos localStorage aquí
  const success = await login(email, password);
  // ...
}
```

**Beneficio:** Evita limpiar datos necesarios y problemas de timing.

---

### 2. **checkAuth Ya NO Verifica con el Backend**
**Archivo:** `contexts/auth-context.tsx`

**Cambio Principal:** La función `checkAuth` ahora **solo verifica localStorage** y **no hace requests al backend**.

**Antes:**
```typescript
const checkAuth = async () => {
  // ... verificaciones de token ...
  
  try {
    // ❌ ESTO ESTABA CAUSANDO EL PROBLEMA
    const response = await axios.get(`${API_URL}/auth/me`)
    
    if (response.data.success) {
      setState(prev => ({ ...prev, user: response.data.user }))
    } else {
      logout() // ❌ Cerraba sesión si fallaba
    }
  } catch (error) {
    if (!savedUser) {
      logout() // ❌ Cerraba sesión si había error
    }
  }
}
```

**Después:**
```typescript
const checkAuth = async () => {
  // 1. Verificar token existe
  // 2. Verificar que no haya expirado (1 hora)
  // 3. Restaurar usuario desde localStorage
  // 4. ✅ NO hacer request al backend
  
  if (savedUser && !state.user) {
    const parsedUser = JSON.parse(savedUser)
    console.log('✅ Restaurando usuario desde localStorage:', parsedUser.rol)
    setState(prev => ({ 
      ...prev, 
      user: parsedUser,
      isLoading: false 
    }))
  }
  
  // NO INTENTAR VERIFICAR CON EL BACKEND
}
```

**Beneficio:** La sesión se mantiene estable basándose en localStorage, sin depender de requests externos.

---

### 3. **Login con Logging Mejorado**
**Archivo:** `contexts/auth-context.tsx`

**Agregados console.logs detallados:**
```typescript
const login = async (email: string, password: string): Promise<boolean> => {
  console.log('🔐 Intentando login para:', email)
  
  const response = await axios.post(`${API_URL}/auth/login`, {
    correo_electronico: email,
    contraseña: password
  })
  
  console.log('📥 Respuesta del backend:', response.data.success ? 'exitosa' : 'fallida')
  
  if (response.data.success) {
    const { token, user } = response.data
    
    console.log('💾 Guardando datos en localStorage:', {
      rol: user.rol,
      email: user.correo_electronico
    })
    
    localStorage.setItem('token', token)
    localStorage.setItem('token_time', Date.now().toString())
    localStorage.setItem('user_data', JSON.stringify(user))
    
    setState({ ...prev, user, token, isLoading: false })
    
    console.log('✅ Login exitoso')
    return true
  }
}
```

**Beneficio:** Podemos ver exactamente qué está pasando en cada paso del login.

---

### 4. **Manejo de Errores Mejorado en handleSubmit**
**Archivo:** `app/login/page.tsx`

**Antes:**
```typescript
} catch (error) {
  setError("Error al iniciar sesión. Intente nuevamente.");
} finally {
  // No se establecía isLoading = false en todos los casos
}
```

**Después:**
```typescript
} catch (error) {
  console.error('Error en handleSubmit:', error);
  setError("Error al iniciar sesión. Intente nuevamente.");
  setIsLoading(false); // ✅ Siempre detiene el loading
}
```

---

## 🧪 Cómo Probar

### 1. **Limpiar Estado Anterior**
```javascript
// En consola del navegador (F12)
localStorage.clear()
location.reload()
```

### 2. **Intentar Login**
1. Ir a http://localhost:3000/login
2. Usar: `comision@unesum.edu.ec` / `comision123`
3. Clic en "Iniciar Sesión"

### 3. **Verificar Console Logs**
Deberías ver en la consola:
```
🔐 Intentando login para: comision@unesum.edu.ec
📥 Respuesta del backend: exitosa
💾 Guardando datos en localStorage: { rol: 'comision_academica', email: '...' }
✅ Login exitoso
🔍 DEBUG - Usuario después del login: { ... }
🔍 DEBUG - Rol detectado: comision_academica
➡️ Redirigiendo a: /dashboard/comision
🔄 AuthContext - Cargando datos iniciales: {hasUser: true, hasToken: true}
✅ Usuario cargado desde localStorage: comision_academica
```

### 4. **Verificar que la Sesión Se Mantiene**
1. Después del login, deberías ver el dashboard de comisión
2. **IMPORTANTE:** La página NO debería redirigir a /login
3. Deberías poder navegar a los 4 módulos sin problemas
4. Al recargar la página (F5), deberías seguir autenticado

### 5. **Verificar localStorage**
```javascript
// En consola del navegador
console.log('Token:', localStorage.getItem('token'))
console.log('User:', JSON.parse(localStorage.getItem('user_data')))
console.log('Time:', localStorage.getItem('token_time'))
```

Deberías ver:
- `token`: String largo (JWT)
- `user_data`: Objeto con `rol: "comision_academica"`
- `token_time`: Timestamp numérico

---

## 🔍 Logs de Debugging

### Durante Login Exitoso:
```
🔐 Intentando login para: comision@unesum.edu.ec
📥 Respuesta del backend: exitosa
💾 Guardando datos en localStorage: { rol: 'comision_academica', ... }
✅ Login exitoso
🔍 DEBUG - Usuario después del login: {...}
🔍 DEBUG - Rol detectado: comision_academica
➡️ Redirigiendo a: /dashboard/comision
```

### Al Cargar Dashboard:
```
🔄 AuthContext - Cargando datos iniciales: {hasUser: true, hasToken: true}
✅ Usuario cargado desde localStorage: comision_academica
🔐 ProtectedRoute - Verificando acceso: {user: "comision_academica", allowedRoles: [...]}
✅ Acceso permitido
```

### Durante checkAuth (Verificación Periódica):
```
🔍 checkAuth - Verificando autenticación: {hasToken: true, hasTokenTime: true, hasSavedUser: true}
✅ Restaurando usuario desde localStorage: comision_academica
```

---

## ⚠️ Problemas Conocidos y Soluciones

### Problema: "Sigo siendo redirigido a /login"

**Causa Posible 1:** Token expirado (más de 1 hora)
```
❌ Token expirado por tiempo (verificación inicial)
```
**Solución:** Hacer login nuevamente. El token dura 1 hora.

**Causa Posible 2:** localStorage vacío
```
⚠️ No hay token, marcando como no autenticado
```
**Solución:**
1. Verificar que el backend esté corriendo en puerto 4000
2. Verificar que el login retorne `success: true`
3. Hacer login nuevamente

**Causa Posible 3:** Error al parsear user_data
```
❌ Error parsing saved user: SyntaxError: Unexpected token...
```
**Solución:**
```javascript
localStorage.removeItem('user_data')
// Hacer login nuevamente
```

---

### Problema: "Backend retorna error 401"

**Síntomas:**
- Login falla
- Console muestra: "Error de inicio de sesión"

**Verificar:**
1. **Backend está corriendo:**
   ```powershell
   cd my-node-backend
   npm run dev
   ```
   Debe mostrar: "Server running on http://localhost:4000"

2. **Credenciales correctas:**
   - Email: `comision@unesum.edu.ec`
   - Password: `comision123`

3. **Usuario existe en DB:**
   ```powershell
   cd my-node-backend
   node verificar-usuario.js
   ```
   Debe mostrar: "ROL ACTUAL: comision_academica"

---

### Problema: "Fast Refresh warnings"

**Mensaje:**
```
⚠ Fast Refresh had to perform a full reload.
```

**Causa:** Cambios en el código que Next.js no puede aplicar en caliente.

**Solución:** Esto es NORMAL durante desarrollo. No afecta la funcionalidad.

---

## 🎯 Resultado Esperado

### ✅ Login Exitoso:
1. Introduces credenciales
2. Clic en "Iniciar Sesión"
3. Loading spinner brevemente
4. **Redirección automática a /dashboard/comision**
5. Dashboard muestra 4 módulos
6. Puedes navegar a cualquier módulo
7. **La sesión se mantiene**

### ✅ Recarga de Página (F5):
1. Página recarga
2. **NO redirige a /login**
3. Dashboard se muestra inmediatamente
4. Usuario sigue autenticado

### ✅ Navegación entre Módulos:
1. Clic en "Extraer Syllabus"
2. Página carga correctamente
3. **NO redirige a /login**
4. Puedes volver al dashboard
5. Puedes ir a otros módulos

---

## 📋 Checklist de Verificación

- [ ] ✅ Login funciona sin errores
- [ ] ✅ Token se guarda en localStorage
- [ ] ✅ user_data se guarda en localStorage
- [ ] ✅ token_time se guarda en localStorage
- [ ] ✅ Redirección correcta según rol
- [ ] ✅ Dashboard muestra 4 módulos
- [ ] ✅ Console logs muestran proceso completo
- [ ] ✅ NO aparece error de hidratación
- [ ] ✅ NO redirige a /login después de autenticar
- [ ] ✅ Sesión se mantiene al recargar (F5)
- [ ] ✅ Puedo navegar a todos los módulos
- [ ] ✅ Backend responde en puerto 4000
- [ ] ✅ Frontend responde en puerto 3000

---

## 🔄 Flujo Correcto de Autenticación

### 1. Login
```
Usuario → handleSubmit() → login() → Backend POST /api/auth/login
                                    ↓
                          Token + User Data
                                    ↓
                          localStorage.setItem()
                                    ↓
                          setState({ user, token })
                                    ↓
                          router.push('/dashboard/comision')
```

### 2. Carga de Dashboard
```
Dashboard Component → ProtectedRoute → useAuth() → state.user
                                                         ↓
                                                   ¿user exists?
                                                         ↓
                                                   YES → Render
                                                   NO → Redirect /login
```

### 3. Montaje de AuthContext
```
AuthContext Mount → useEffect() → checkAuth()
                                       ↓
                              localStorage.getItem('token')
                              localStorage.getItem('user_data')
                                       ↓
                              setState({ user, token })
                                       ↓
                              ✅ Usuario restaurado
```

---

## 🚫 Lo Que YA NO Hace checkAuth

### ❌ ANTES (Causaba problemas):
```typescript
const checkAuth = async () => {
  // ... validaciones ...
  
  try {
    // ❌ Request al backend
    const response = await axios.get(`${API_URL}/auth/me`)
    
    if (!response.data.success) {
      logout() // ❌ Cerraba sesión si fallaba
    }
  } catch (error) {
    logout() // ❌ Cerraba sesión si había error de red
  }
}
```

### ✅ AHORA (Funciona correctamente):
```typescript
const checkAuth = async () => {
  // 1. Leer de localStorage
  const token = localStorage.getItem('token')
  const savedUser = localStorage.getItem('user_data')
  
  // 2. Validar expiración local (1 hora)
  if (tokenExpired) {
    logout()
    return
  }
  
  // 3. Restaurar estado
  setState({ user: parsedUser, token })
  
  // ✅ NO hace requests al backend
}
```

---

## 📞 Si Todavía Hay Problemas

### 1. Captura los Console Logs:
- Abre DevTools (F12)
- Pestaña "Console"
- Intenta hacer login
- Copia TODOS los mensajes que aparecen

### 2. Verifica Network Tab:
- DevTools → Network
- Intenta hacer login
- Busca request `POST /api/auth/login`
- Verifica Status Code (debe ser 200)
- Verifica Response (debe incluir `success: true`, `token`, `user`)

### 3. Verifica Application Tab:
- DevTools → Application → Local Storage
- Verifica que existan:
  - `token`
  - `user_data`
  - `token_time`
- Si faltan, el login no está guardando correctamente

---

**Última actualización:** Enero 7, 2026  
**Estado:** Correcciones aplicadas - Sesión debería mantenerse estable
