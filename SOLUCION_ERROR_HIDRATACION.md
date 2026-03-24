# 🔧 Solución de Error de Hidratación y Acceso a Menús

## ✅ Cambios Realizados

### 1. **MainHeader** - Solución de Error de Hidratación
**Archivo:** `components/layout/main-header.tsx`

**Problema:** El componente estaba accediendo a `localStorage` durante el renderizado inicial del servidor, causando error de hidratación.

**Solución:**
- ✅ Agregado `'use client'` al inicio del archivo
- ✅ Agregado estado `mounted` con `useState(false)`
- ✅ Agregado `useEffect` para establecer `mounted = true`
- ✅ Renderizar versión simplificada del header mientras no esté montado
- ✅ Solo mostrar información del usuario después de que el componente esté montado en el cliente

### 2. **AuthContext** - Prevención de Error de Hidratación
**Archivo:** `contexts/auth-context.tsx`

**Problema:** El contexto estaba leyendo `localStorage` durante la inicialización del estado, antes de que el componente se montara en el cliente.

**Solución:**
- ✅ Cambiar estado inicial a `user: null` y `isLoading: true`
- ✅ Mover la lectura de `localStorage` a un `useEffect` separado que se ejecuta después del montaje
- ✅ Agregar verificación `typeof window !== 'undefined'` en todos los accesos a `localStorage`
- ✅ Agregar manejo de errores con try-catch al parsear datos guardados
- ✅ Agregados console.logs para debugging

### 3. **Dashboard de Comisión** - 4 Módulos Completos
**Archivo:** `app/dashboard/comision/page.tsx`

**Cambios:**
- ✅ Actualizado de 1 módulo a 4 módulos:
  1. 📘 **Extraer Programa Analítico** (azul)
  2. ✨ **Extraer Syllabus** (morado)
  3. 🔄 **Comparar Documentos** (naranja)
  4. 📋 **Syllabus Extraídos** (violeta)
- ✅ Actualizado título: "Panel de Comisión Académica"
- ✅ Actualizada descripción: "Gestión, supervisión y comparación de documentos académicos"
- ✅ Cambiado padding de `px-0` a `px-6`

### 4. **ProtectedRoute** - Debugging
**Archivo:** `components/auth/protected-route.tsx`

**Cambios:**
- ✅ Agregados console.logs detallados para debugging:
  - Estado de usuario
  - Roles permitidos
  - Estado de carga
  - Razones de redirección

---

## 🧪 Cómo Probar

### 1. **Verificar que el error de hidratación se haya solucionado**
1. Abrir la consola del navegador (F12)
2. Navegar a http://localhost:3000/login
3. **Verificar que NO aparezca:** `Error: Hydration failed because...`
4. Los "Fast Refresh" warnings son normales durante desarrollo

### 2. **Verificar el login y acceso al menú**
1. Login con: `comision@unesum.edu.ec` / `comision123`
2. En la consola deberías ver:
   ```
   🔄 AuthContext - Cargando datos iniciales: {hasUser: true, hasToken: true}
   ✅ Usuario cargado desde localStorage: comision_academica
   🔐 ProtectedRoute - Verificando acceso: {...}
   ✅ Acceso permitido
   ```
3. Deberías ver el dashboard con **4 módulos**
4. Al hacer clic en cada módulo, deberías poder acceder sin problemas

### 3. **Verificar cada módulo**

#### Módulo 1: Extraer Programa Analítico
- URL: `/dashboard/comision/programa-analitico/extraer-titulos`
- Debería cargar el componente extractor
- Permite subir archivos Excel/Word

#### Módulo 2: Extraer Syllabus
- URL: `/dashboard/comision/syllabus/extraer-titulos`
- Debería cargar el formulario de extracción
- Permite seleccionar periodo académico
- Permite subir archivos Excel/Word

#### Módulo 3: Comparar Documentos
- URL: `/dashboard/comision/comparar-documentos`
- Debería cargar la interfaz de comparación
- Muestra 2 dropdowns para seleccionar sesiones
- Muestra 4 tabs de resultados

#### Módulo 4: Syllabus Extraídos
- URL: `/dashboard/comision/syllabus-formularios`
- Debería cargar la lista de syllabus guardados

---

## 🐛 Debugging - Si Aún No Funciona

### Problema: "No entro a las opciones del menú"

**Verificar en la consola del navegador:**

1. **Al cargar el dashboard**, deberías ver:
   ```
   🔄 AuthContext - Cargando datos iniciales: {hasUser: true, hasToken: true}
   ✅ Usuario cargado desde localStorage: comision_academica
   ```

2. **Al intentar acceder a un módulo**, deberías ver:
   ```
   🔐 ProtectedRoute - Verificando acceso: {
     user: "comision_academica",
     allowedRoles: ["comision", "comision_academica"],
     isLoading: false,
     isMounted: true
   }
   ✅ Acceso permitido
   ```

### Si ves "❌ No hay usuario, redirigiendo a login"
**Causa:** El usuario no se está cargando del localStorage

**Solución:**
1. Abrir DevTools → Application → Local Storage
2. Verificar que existan:
   - `token` → Debe tener un valor JWT
   - `user_data` → Debe tener JSON con datos del usuario
   - `token_time` → Debe tener un timestamp
3. Si no existen, hacer login nuevamente

### Si ves "❌ Rol no permitido"
**Causa:** El rol del usuario no coincide con los roles permitidos

**Solución:**
1. Verificar el rol en localStorage:
   ```javascript
   JSON.parse(localStorage.getItem('user_data')).rol
   ```
2. Debería ser: `comision_academica` o `comision`
3. Si es diferente, ejecutar el script de actualización:
   ```powershell
   cd my-node-backend
   node actualizar-rol-comision.js
   ```
4. Hacer logout y login nuevamente

### Si el token expiró
**Síntomas:** Redirige a login constantemente

**Solución:**
1. Verificar en consola si aparece: "Token expirado por tiempo"
2. Hacer login nuevamente
3. El token dura 1 hora (configurado en backend)

---

## 🔍 Herramientas de Debugging

### 1. Console Logs Agregados

#### En AuthContext:
```javascript
🔄 AuthContext - Cargando datos iniciales
✅ Usuario cargado desde localStorage
⚠️ No hay datos guardados en localStorage
❌ Error parsing saved user
```

#### En ProtectedRoute:
```javascript
🔐 ProtectedRoute - Verificando acceso
✅ Acceso permitido
❌ No hay usuario, redirigiendo a login
❌ Rol no permitido
```

### 2. Verificar Estado en React DevTools
1. Instalar React Developer Tools (extensión de Chrome/Firefox)
2. Abrir DevTools → Components
3. Buscar `AuthProvider`
4. Ver estado actual:
   - `user` → Debe tener datos del usuario
   - `isLoading` → Debe ser `false` después de cargar
   - `token` → Debe tener el JWT

### 3. Verificar Requests en Network Tab
1. Abrir DevTools → Network
2. Al hacer login, debería aparecer:
   - `POST /api/auth/login` → Status 200
   - Response debe incluir `token` y `user`
3. Al navegar, los requests deben incluir:
   - Header: `Authorization: Bearer [token]`

---

## 📝 Comandos Útiles

### Reiniciar Backend
```powershell
cd my-node-backend
npm run dev
```

### Reiniciar Frontend
```powershell
# En la raíz del proyecto
npm run dev
```

### Limpiar localStorage (en consola del navegador)
```javascript
localStorage.clear()
location.reload()
```

### Verificar usuario en DB
```powershell
cd my-node-backend
node verificar-usuario.js
```

---

## ✅ Checklist de Verificación

- [ ] ✅ Error de hidratación solucionado (no aparece en consola)
- [ ] ✅ Login funciona correctamente
- [ ] ✅ Token se guarda en localStorage
- [ ] ✅ Usuario se guarda en localStorage con rol correcto
- [ ] ✅ Dashboard de comisión muestra 4 módulos
- [ ] ✅ Console logs muestran "Usuario cargado" y "Acceso permitido"
- [ ] ✅ Puedo hacer clic en cada módulo
- [ ] ✅ Cada módulo carga su página correspondiente
- [ ] ✅ No hay redirecciones inesperadas a /login
- [ ] ✅ Backend está corriendo en http://localhost:4000
- [ ] ✅ Frontend está corriendo en http://localhost:3000

---

## 🚨 Si Nada Funciona

### Hard Reset:

1. **Detener ambos servidores** (Ctrl+C en ambas terminales)

2. **Limpiar el navegador:**
   ```javascript
   // En consola del navegador
   localStorage.clear()
   sessionStorage.clear()
   // Luego cerrar y abrir el navegador
   ```

3. **Reiniciar Backend:**
   ```powershell
   cd my-node-backend
   npm run dev
   ```
   Esperar a ver: "Server running on http://localhost:4000"

4. **Reiniciar Frontend:**
   ```powershell
   npm run dev
   ```
   Esperar a ver: "✓ Ready in X seconds"

5. **Hacer login nuevamente:**
   - Email: `comision@unesum.edu.ec`
   - Password: `comision123`

6. **Verificar console logs** para ver si el usuario se carga correctamente

---

## 📞 Próximos Pasos

Una vez que todo funcione:
1. **Remover console.logs de producción** (los agregados para debugging)
2. **Probar todos los flujos:**
   - Extracción de Programa Analítico
   - Extracción de Syllabus
   - Comparación de documentos
   - Visualización de syllabus guardados
3. **Verificar que la comparación funcione end-to-end**

---

**Última actualización:** Enero 7, 2026
**Estado:** Correcciones aplicadas, esperando pruebas del usuario
