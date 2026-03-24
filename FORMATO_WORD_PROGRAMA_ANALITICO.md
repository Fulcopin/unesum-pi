# 📄 Formato de Archivo Word para Programa Analítico

## ✅ Estructura Recomendada

El sistema ahora acepta archivos **Word (.docx)** además de Excel (.xlsx). Para que el archivo Word se procese correctamente, debe seguir esta estructura:

### 📋 Formato General

```
PROGRAMA ANALÍTICO DE ASIGNATURA
(Título principal en negrilla o Heading 1)

ASIGNATURA
(Título de sección en negrilla o Heading 2)
Contenido de la sección...

PERIODO ACADÉMICO ORDINARIO(PAO)
Contenido...

NIVEL
Contenido...

CARACTERIZACIÓN
Contenido largo con párrafos...

OBJETIVOS DE LA ASIGNATURA
- Objetivo 1
- Objetivo 2
- Objetivo 3

COMPETENCIAS
Lista de competencias...

RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA
Lista de resultados...

CONTENIDO DE LA ASIGNATURA
(Tabla con columnas: Unidad | Contenido | Horas)

METODOLOGÍA
Descripción de la metodología...

PROCEDIMIENTO DE EVALUACIÓN
Descripción del procedimiento...

BIBLIOGRAFÍA - FUENTES DE CONSULTA
(Tabla o lista de referencias)

BIBLIOGRAFÍA COMPLEMENTARIA
Lista adicional...

VISADO
(Tabla con firmas: DECANO/A | DIRECTOR/A | COORDINADOR/A | DOCENTE)
```

---

## 🎯 Reglas Importantes

### 1. **Títulos de Sección**
- Usar **negrilla** o estilos de Heading (Heading 1, Heading 2)
- Escribir exactamente como aparece en el formato (mayúsculas/minúsculas no importan)
- Ejemplo: `OBJETIVOS DE LA ASIGNATURA`

### 2. **Tablas**
- Las secciones como "CONTENIDO DE LA ASIGNATURA" y "VISADO" deben ser **tablas de Word**
- Cada columna será detectada automáticamente
- No dejar celdas combinadas si es posible

### 3. **Contenido de Texto**
- Los párrafos normales después de cada título serán el contenido de esa sección
- Usar listas con viñetas o numeradas para objetivos, competencias, etc.

### 4. **Orden de Secciones**
El orden no es estricto, pero se recomienda seguir el formato UNESUM estándar

---

## ⚠️ Ventajas de Word vs Excel

| Aspecto | Word (.docx) | Excel (.xlsx) |
|---------|--------------|---------------|
| **Títulos** | ✅ Claramente identificables | ⚠️ Pueden perderse en celdas combinadas |
| **Texto largo** | ✅ Mejor para párrafos extensos | ❌ Limitado por ancho de celda |
| **Tablas** | ✅ Estructura clara | ⚠️ Puede confundirse con el layout |
| **Facilidad** | ✅ Más natural para documentos académicos | ⚠️ Requiere estructura específica |

---

## 📝 Ejemplo Mínimo

```word
PROGRAMA ANALÍTICO DE ASIGNATURA

ASIGNATURA
Programación I

NIVEL
Primer Semestre

CARACTERIZACIÓN
Esta asignatura introduce los conceptos fundamentales de la programación...

OBJETIVOS DE LA ASIGNATURA
- Comprender los fundamentos de la programación
- Desarrollar algoritmos básicos
- Aplicar estructuras de datos simples

VISADO
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ DECANO/A        │ DIRECTOR/A      │ COORDINADOR/A   │ DOCENTE         │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ Firma:          │ Firma:          │ Firma:          │ Firma:          │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

---

## 🚀 Cómo Subir el Archivo

1. Ve a **Dashboard Admin** → **Programa Analítico**
2. Clic en **"Subir Archivo"**
3. Selecciona tu archivo **.docx** o **.xlsx**
4. (Opcional) Adjunta el escudo de la universidad
5. Clic en **"Subir y Procesar"**

El sistema detectará automáticamente las secciones y las guardará en la base de datos.

---

## 🔧 Troubleshooting

### "No se detectan las secciones"
- ✅ Asegúrate de que los títulos estén en **negrilla** o como **Headings**
- ✅ Verifica que los nombres de las secciones coincidan con el formato UNESUM

### "Las tablas no se procesan bien"
- ✅ Usa **tablas de Word** (Insertar → Tabla)
- ✅ No uses tabulaciones para simular tablas
- ✅ Evita celdas combinadas complejas

### "Falta contenido"
- ✅ Asegúrate de que haya texto después de cada título de sección
- ✅ No dejes secciones vacías

---

## 📞 Soporte

Si tienes problemas con el formato, contacta al administrador del sistema o revisa los logs en la consola del servidor.
