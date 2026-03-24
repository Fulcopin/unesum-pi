# 🎓 Guía Rápida para Comisión Académica

## 🚀 Acceso Rápido

### 📱 URLs Importantes

- **Dashboard Principal:** `http://localhost:3000/dashboard/comision`
- **Gestión de Asignaturas:** `http://localhost:3000/dashboard/comision/asignaturas`
- **Editor de Syllabus:** `http://localhost:3000/dashboard/admin/editor-syllabus`
- **Editor Programa Analítico:** `http://localhost:3000/dashboard/comision/editor-programa-analitico`

---

## 📋 ¿Qué puedo hacer?

### 1. 🏫 Gestionar Asignaturas de mi Facultad

**Ruta:** `/dashboard/comision/asignaturas`

**Funciones:**
- ✅ Ver todas las carreras de tu facultad
- ✅ Ver todas las asignaturas por carrera
- ✅ Ver qué materias tienen Syllabus y Programa Analítico
- ✅ Crear nuevos Syllabus para materias
- ✅ Crear nuevos Programas Analíticos para materias
- ✅ Editar Syllabus existentes
- ✅ Editar Programas Analíticos existentes

### 2. 📝 Crear y Editar Syllabus

**Ruta:** `/dashboard/admin/editor-syllabus`

**Funciones:**
- ✅ Editor con pestañas personalizables
- ✅ Tablas interactivas (agregar/eliminar filas y columnas)
- ✅ Guardar en base de datos
- ✅ Imprimir en formato profesional
- ✅ Importar desde Word/Excel

### 3. 📄 Crear y Editar Programas Analíticos

**Ruta:** `/dashboard/comision/editor-programa-analitico`

**Funciones:**
- ✅ Editor con pestañas personalizables
- ✅ Tablas interactivas
- ✅ Formato JSON editable
- ✅ Guardar y exportar

---

## 🎯 Flujo de Trabajo Típico

### Escenario 1: Crear Syllabus para una Materia Nueva

1. **Ir a Gestión de Asignaturas**
   - Clic en "Gestión de Asignaturas" en el dashboard

2. **Seleccionar Carrera**
   - Clic en el botón de la carrera deseada

3. **Buscar la Materia**
   - Busca en la lista la materia que necesitas

4. **Crear Syllabus**
   - Si dice "✗ Syllabus", clic en [Crear Syllabus]
   - Se abre el editor automáticamente

5. **Completar el Syllabus**
   - Llena las pestañas con la información
   - Usa las tablas para organizar contenidos

6. **Guardar**
   - Clic en el botón "Guardar"
   - El sistema te confirma que se guardó

7. **Verificar**
   - Regresa a Gestión de Asignaturas
   - Ahora debe decir "✅ Syllabus"

### Escenario 2: Editar un Syllabus Existente

1. **Ir a Gestión de Asignaturas**

2. **Seleccionar Carrera**

3. **Buscar la Materia**
   - Debe tener "✅ Syllabus"

4. **Ver/Editar**
   - Clic en [Ver Syllabus]
   - Se abre el editor con los datos actuales

5. **Modificar**
   - Haz los cambios necesarios

6. **Guardar**
   - Clic en "Guardar" para actualizar

### Escenario 3: Ver Progreso de tu Facultad

1. **Ir a Gestión de Asignaturas**

2. **Seleccionar Carrera**

3. **Ver Estadísticas**
   - En la parte superior verás:
     - **Total:** Número total de asignaturas
     - **Con Syllabus:** Materias con syllabus creado
     - **Con Programa:** Materias con programa analítico
     - **Completas:** Materias con ambos documentos
     - **Pendientes:** Materias sin completar

4. **Identificar Prioridades**
   - Las materias en naranja/rojo necesitan atención

---

## 🎨 Interfaz Visual

### Dashboard Principal

```
┌────────────────────────────────────────────┐
│  UNESUM - Panel de Comisión Académica      │
├────────────────────────────────────────────┤
│                                             │
│  Herramientas Principales:                 │
│                                             │
│  ┌──────────────────┐  ┌──────────────────┐│
│  │ 🏫 Gestión de    │  │ 📝 Editor de     ││
│  │    Asignaturas   │  │    Syllabus      ││
│  │ [DESTACADO]      │  │                  ││
│  └──────────────────┘  └──────────────────┘│
│                                             │
│  ┌──────────────────┐                      │
│  │ 📄 Editor de     │                      │
│  │    Programa      │                      │
│  │    Analítico     │                      │
│  └──────────────────┘                      │
│                                             │
│  Otras Herramientas:                       │
│  [Extracción PA] [Extracción Syllabus]    │
│  [Comparar Docs] [Formularios]            │
└────────────────────────────────────────────┘
```

### Página de Gestión de Asignaturas

```
┌────────────────────────────────────────────────────┐
│ 🏫 Gestión de Asignaturas                         │
│ Facultad: Facultad de Ciencias de la Salud        │
├────────────────────────────────────────────────────┤
│                                                    │
│ Seleccionar Carrera:                              │
│ [Enfermería (25)] [Medicina (30)] [Lab. (15)]    │
│                                                    │
├────────────────────────────────────────────────────┤
│ Estadísticas:                                     │
│ ┌──────┬──────┬──────┬──────┬──────┐            │
│ │Total │Syllab│Progra│Comple│Pendie│            │
│ │  25  │  15  │  10  │   8  │  17  │            │
│ └──────┴──────┴──────┴──────┴──────┘            │
├────────────────────────────────────────────────────┤
│                                                    │
│ Asignaturas de Enfermería:                        │
│                                                    │
│ ┌──────────────────────────────────────────────┐ │
│ │ Anatomía I  [ENF-101] [Primer Nivel]         │ │
│ │ ✅ Syllabus  ✗ Programa                      │ │
│ │ [Ver Syllabus] [Crear Programa]              │ │
│ └──────────────────────────────────────────────┘ │
│                                                    │
│ ┌──────────────────────────────────────────────┐ │
│ │ Fisiología I  [ENF-102] [Primer Nivel]       │ │
│ │ ✗ Syllabus  ✗ Programa                       │ │
│ │ [Crear Syllabus] [Crear Programa]            │ │
│ └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

---

## 🔐 Permisos y Limitaciones

### ✅ Lo que SÍ puedes hacer:

- Ver todas las carreras de **tu facultad**
- Ver todas las mallas de **tu facultad**
- Ver todas las asignaturas de **las carreras de tu facultad**
- Crear carreras en **tu facultad**
- Crear mallas en **tu facultad**
- Crear asignaturas en **las carreras de tu facultad**
- Crear y editar Syllabus de **las asignaturas de tu facultad**
- Crear y editar Programas Analíticos de **las asignaturas de tu facultad**

### ❌ Lo que NO puedes hacer:

- Ver o modificar carreras de **otras facultades**
- Ver o modificar asignaturas de **otras facultades**
- Crear o eliminar facultades
- Cambiar una carrera de facultad
- Modificar datos de **otras facultades**

---

## 🎯 Indicadores Visuales

### Estados de Asignaturas

| Icono | Significado |
|-------|-------------|
| ✅    | Documento creado y guardado |
| ✗     | Documento pendiente de crear |
| 🟢    | Todo completo |
| 🟡    | Parcialmente completo |
| 🔴    | Nada creado |

### Colores de Estadísticas

| Color  | Significado |
|--------|-------------|
| 🔵 Azul | Total de asignaturas |
| 🟢 Verde | Con Syllabus |
| 🟣 Morado | Con Programa |
| ✅ Esmeralda | Completas |
| 🟠 Naranja | Pendientes (requieren atención) |

---

## 💡 Consejos y Buenas Prácticas

### 1. Organización

- 📝 Completa primero los Syllabus de todas las materias
- 📄 Luego trabaja en los Programas Analíticos
- 🎯 Prioriza las materias de los primeros niveles

### 2. Trabajo en Equipo

- 👥 Asigna materias específicas a diferentes miembros
- 📊 Revisa las estadísticas regularmente
- ✅ Marca como completas las materias finalizadas

### 3. Calidad

- 📋 Usa los formatos oficiales de UNESUM
- ✏️ Revisa la ortografía antes de guardar
- 🔄 Actualiza los documentos cuando cambien los contenidos

### 4. Respaldo

- 💾 Guarda regularmente tu trabajo
- 📥 Exporta los documentos importantes
- 🖨️ Imprime copias de los documentos finalizados

---

## 🆘 Solución de Problemas

### Problema: No veo ninguna carrera

**Solución:**
1. Verifica que tu usuario tenga una facultad asignada
2. Contacta al administrador para que te asigne una facultad
3. Verifica que existan carreras creadas en tu facultad

### Problema: No puedo crear un Syllabus

**Solución:**
1. Verifica que tengas el rol `comision_academica`
2. Verifica que la asignatura pertenezca a una carrera de tu facultad
3. Revisa que no exista ya un Syllabus para esa materia

### Problema: Las estadísticas no se actualizan

**Solución:**
1. Recarga la página (F5)
2. Verifica tu conexión a internet
3. Si persiste, contacta al administrador

### Problema: No puedo guardar cambios

**Solución:**
1. Verifica tu conexión a internet
2. Asegúrate de haber llenado los campos obligatorios
3. Revisa la consola del navegador (F12) para ver errores
4. Contacta al administrador si el problema persiste

---

## 📞 Contacto y Soporte

**Administrador del Sistema:**
- Email: soporte@unesum.edu.ec
- Teléfono: (ext. XXXX)

**Horario de Soporte:**
- Lunes a Viernes: 8:00 AM - 5:00 PM

---

## 🎓 Capacitación

### Recursos Disponibles

1. **Documentación Completa:**
   - `GESTION_ASIGNATURAS_COMISION_ACADEMICA.md`

2. **Videos Tutoriales:** (Próximamente)
   - Cómo crear un Syllabus
   - Cómo usar el editor de tablas
   - Cómo importar documentos

3. **Manual de Usuario:** (Próximamente)
   - Guía paso a paso con capturas de pantalla

---

## ✨ Resumen Rápido

1. **Login** → Ingresa con tu usuario de comisión académica
2. **Dashboard** → Clic en "Gestión de Asignaturas"
3. **Seleccionar** → Elige una carrera
4. **Revisar** → Ve el estado de cada materia
5. **Crear/Editar** → Trabaja en los documentos pendientes
6. **Guardar** → Confirma tus cambios
7. **Verificar** → Revisa las estadísticas de progreso

---

¡Bienvenido al Sistema de Gestión Académica de UNESUM! 🎓
