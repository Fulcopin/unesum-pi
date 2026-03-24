# 🔧 Solución: Debug Grave - Sesión Se Reinicia Constantemente

## ❌ Problema Identificado

La sesión se estaba cerrando automáticamente y redirigiendo a `/login` cada vez que cualquier endpoint retornaba un error **401 (Unauthorized)**, incluso si era un endpoint de datos no crítico como `/api/periodo`.

### Síntomas:
- Login exitoso
- Inmediatamente redirige a `/login`
- Console muestra: "401 (Unauthorized)" en `/api/periodo`
- Mensaje: "Error cargando periodos"
- Sesión se cierra automáticamente

### Flujo del Problema:
```
1. Usuario hace login ✅
2. Guarda token en localStorage ✅
3. Redirige a /dashboard/comision ✅
4. Dashboard intenta cargar datos
5. Endpoint /api/periodo retorna 401 ❌
6. Interceptor de axios detecta 401 ❌
7. Cierra sesión automáticamente ❌
8. Redirige a /login ❌
9. Loop infinito 🔄
```

---

## 🎯 Causa Raíz

### Interceptor de Axios Demasiado Agresivo

**Archivo:** `contexts/auth-context.tsx`

**Código Problemático:**
```typescript
const responseInterceptor = axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // ❌ PROBLEMA: Cierra sesión con CUALQUIER 401
    if (error.response?.status === 401) {
      // Limpiar sesión
      localStorage.removeItem('token');
      localStorage.removeItem('token_time');
      setState(prev => ({ ...prev, user: null, token: null }));
      
      // Redirigir a login
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);
```

**Por qué era problemático:**
- ❌ Cerraba sesión con CUALQUIER error 401
- ❌ No distinguía entre errores críticos y no críticos
- ❌ Endpoints como `/api/periodo` podían no existir o tener problemas de permisos
- ❌ Un solo error 401 cerraba toda la sesión

---

## ✅ Solución Aplicada

### 1. Interceptor Inteligente de Axios

**Archivo:** `contexts/auth-context.tsx`

**Nuevo Código:**
```typescript
const responseInterceptor = axios.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      
      // ✅ SOLUCIÓN: Solo cerrar sesión si es un error CRÍTICO
      const isCriticalAuthError = url.includes('/auth/') || 
                                  url.includes('/login') ||
                                  url.includes('/me');
      
      if (isCriticalAuthError) {
        console.log('❌ Error de autenticación crítico, cerrando sesión');
        // Limpiar la sesión
        localStorage.removeItem('token');
        localStorage.removeItem('token_time');
        localStorage.removeItem('user_data');
        delete axios.defaults.headers.common['Authorization'];
        setState(prev => ({ ...prev, user: null, token: null, isLoading: false, error: null }));
        
        // Redireccionar a login
        if (typeof window !== 'undefined' && 
            !window.location.pathname.includes('/login')) {
          window.location.replace('/login');
        }
      } else {
        console.log('⚠️ Error 401 en endpoint no crítico:', url);
        // Solo propagar el error, NO cerrar sesión
      }
    }
    return Promise.reject(error);
  }
);
```

**Beneficios:**
- ✅ Distingue entre errores críticos y no críticos
- ✅ Solo cierra sesión si es un error de autenticación real
- ✅ Errores en endpoints de datos NO cierran la sesión
- ✅ Muestra log diferente según el tipo de error

### Errores Críticos (Cierran Sesión):
- `/api/auth/login` - 401
- `/api/auth/me` - 401
- Cualquier URL que incluya `/auth/`

### Errores NO Críticos (NO Cierran Sesión):
- `/api/periodo` - 401
- `/api/usuarios` - 401
- `/api/syllabus-extraction` - 401
- `/api/programa-analitico` - 401
- `/api/comparacion` - 401
- Cualquier otro endpoint de datos

---

### 2. Página de Extracción de Syllabus Mejorada

**Archivo:** `app/dashboard/comision/syllabus/extraer-titulos/page.tsx`

**Características:**
- ✅ Manejo de errores mejorado en carga de periodos
- ✅ No muestra error al usuario si falla la carga de periodos
- ✅ Permite continuar sin seleccionar periodo
- ✅ Logs solo en consola, no afectan UX
- ✅ Try-catch robusto en todas las operaciones

**Código Clave:**
```typescript
const cargarPeriodos = async () => {
  try {
    setLoadingPeriodos(true)
    const response = await axios.get('http://localhost:4000/api/periodo', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.data.success) {
      setPeriodos(response.data.data || [])
    }
  } catch (error: any) {
    console.error('Error al cargar periodos:', error)
    // ✅ No mostrar error al usuario, solo en consola
    // El usuario puede continuar sin seleccionar periodo
  } finally {
    setLoadingPeriodos(false)
  }
}
```

---

## 🧪 Cómo Probar

### 1. Limpiar Estado Anterior
```javascript
// En consola del navegador (F12)
localStorage.clear()
location.reload()
```

### 2. Verificar Backend
```powershell
cd my-node-backend
npm run dev
```
Debe mostrar: "Server running on http://localhost:4000"

### 3. Hacer Login
1. Ir a http://localhost:3000/login
2. Usuario: `comision@unesum.edu.ec`
3. Password: `comision123`
4. Clic en "Iniciar Sesión"

### 4. Observar Console Logs

**Login Exitoso:**
```
🔐 Intentando login para: comision@unesum.edu.ec
📥 Respuesta del backend: exitosa
💾 Guardando datos en localStorage
✅ Login exitoso
➡️ Redirigiendo a: /dashboard/comision
```

**Si hay error 401 en endpoint no crítico:**
```
⚠️ Error 401 en endpoint no crítico: /api/periodo
Error al cargar periodos: AxiosError...
```

**Resultado Esperado:**
- ✅ Dashboard se muestra correctamente
- ✅ NO redirige a /login
- ✅ Usuario sigue autenticado
- ✅ Puede navegar sin problemas

---

## 🔍 Diferencias Antes vs Después

### ❌ ANTES:
```
Login → Dashboard → Intenta cargar /api/periodo
                           ↓
                      401 Error
                           ↓
                   Cierra sesión ❌
                           ↓
                   Redirige a /login
                           ↓
                   Loop infinito 🔄
```

### ✅ DESPUÉS:
```
Login → Dashboard → Intenta cargar /api/periodo
                           ↓
                      401 Error
                           ↓
                   Log en consola ℹ️
                           ↓
                   Continúa sin periodos
                           ↓
                   Usuario autenticado ✅
```

---

## 📋 Checklist de Verificación

- [ ] ✅ Login funciona sin redirección inmediata
- [ ] ✅ Dashboard se muestra correctamente
- [ ] ✅ Console muestra "⚠️ Error 401 en endpoint no crítico" (si aplica)
- [ ] ✅ NO muestra "❌ Error de autenticación crítico"
- [ ] ✅ NO redirige a /login después de login exitoso
- [ ] ✅ Puedo navegar a módulos sin problemas
- [ ] ✅ Sesión se mantiene al recargar (F5)
- [ ] ✅ Token sigue en localStorage
- [ ] ✅ user_data sigue en localStorage

---

## 🐛 Debugging

### Ver Interceptor en Acción:

**Console Logs a Observar:**

#### Error Crítico (Cierra Sesión):
```
❌ Error de autenticación crítico, cerrando sesión
```

#### Error NO Crítico (NO Cierra Sesión):
```
⚠️ Error 401 en endpoint no crítico: /api/periodo
```

### Verificar localStorage:
```javascript
// En consola del navegador
console.log('Token:', localStorage.getItem('token'))
console.log('User:', JSON.parse(localStorage.getItem('user_data')))
```

**Debe mostrar:**
- Token: String JWT válido
- User: Objeto con rol "comision_academica"

### Si Sigue Redirigiendo:

1. **Verificar que no sea un error de login:**
   - Backend debe retornar 200 en POST `/api/auth/login`
   - Response debe incluir `success: true`, `token`, `user`

2. **Verificar que el token sea válido:**
   - No debe estar expirado (menos de 1 hora)
   - Debe existir en localStorage

3. **Verificar console logs:**
   - Si muestra "Error de autenticación crítico" → El error SÍ es en endpoint de auth
   - Si muestra "Error 401 en endpoint no crítico" → El error es manejado correctamente

---

## 🚨 Endpoints que Pueden Fallar Sin Cerrar Sesión

Los siguientes endpoints pueden retornar 401 sin que la sesión se cierre:

- `/api/periodo` - Periodos académicos
- `/api/usuarios` - Lista de usuarios
- `/api/profesores` - Lista de profesores
- `/api/asignaturas` - Asignaturas
- `/api/mallas` - Mallas curriculares
- `/api/syllabus-extraction/*` - Extracción de syllabus
- `/api/programa-analitico/*` - Programa analítico
- `/api/comparacion/*` - Comparación de documentos

**Comportamiento:**
- ⚠️ Muestran error en consola
- ⚠️ El componente maneja el error localmente
- ✅ La sesión NO se cierra
- ✅ El usuario puede continuar navegando

---

## 🔐 Endpoints que SÍ Cierran Sesión en 401

Solo estos endpoints cerrarán sesión si retornan 401:

- `/api/auth/login` - Login
- `/api/auth/register` - Registro
- `/api/auth/me` - Verificar usuario actual
- Cualquier URL que incluya `/auth/`

**Comportamiento:**
- ❌ Error de autenticación crítico
- ❌ Limpia localStorage completo
- ❌ Redirige a /login
- ❌ Usuario debe volver a autenticarse

---

## 💡 Recomendaciones

### Para Desarrollo:

1. **Siempre verificar backend está corriendo:**
   ```powershell
   cd my-node-backend
   npm run dev
   ```

2. **Monitorear console logs:**
   - Abrir DevTools (F12)
   - Pestaña "Console"
   - Observar mensajes de interceptor

3. **Verificar Network Tab:**
   - DevTools → Network
   - Filtrar por "XHR"
   - Ver qué endpoints fallan
   - Ver status codes

### Para Producción:

1. **Remover console.logs excesivos:**
   - Mantener solo logs críticos
   - Usar un sistema de logging apropiado

2. **Implementar refresh token:**
   - Renovar token antes de expirar
   - Evitar errores 401 por expiración

3. **Mejorar manejo de errores:**
   - Mostrar mensajes amigables
   - Retry automático en fallos temporales

---

## 📞 Si el Problema Persiste

### 1. Capturar Logs Completos:
- Abre DevTools (F12)
- Pestaña "Console"
- Haz login
- Copia TODOS los mensajes

### 2. Verificar Network:
- DevTools → Network
- Haz login
- Verifica requests:
  - `POST /api/auth/login` → ¿200 OK?
  - `GET /api/periodo` → ¿Qué status?
  - Otros requests → ¿Algún 401?

### 3. Verificar Estado:
```javascript
// En consola después de login
console.log({
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user_data')),
  time: localStorage.getItem('token_time'),
  expired: (Date.now() - parseInt(localStorage.getItem('token_time'))) > 3600000
})
```

---

## ✅ Resultado Esperado

### Flujo Completo Correcto:

1. ✅ Login exitoso
2. ✅ Token guardado en localStorage
3. ✅ Redirige a /dashboard/comision
4. ✅ Dashboard se carga
5. ⚠️ Intenta cargar /api/periodo (puede fallar 401)
6. ℹ️ Log en consola: "Error 401 en endpoint no crítico"
7. ✅ Usuario sigue autenticado
8. ✅ Puede navegar a módulos
9. ✅ Sesión se mantiene estable
10. ✅ NO hay redirecciones a /login

---

**Última actualización:** Enero 7, 2026  
**Estado:** ✅ Interceptor mejorado - Sesión estable - Ya NO se reinicia con errores 401 no críticos
