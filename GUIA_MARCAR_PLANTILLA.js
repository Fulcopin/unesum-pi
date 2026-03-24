/**
 * 🎯 GUÍA RÁPIDA: MARCAR SYLLABUS COMO PLANTILLA
 * ===============================================
 * 
 * PASOS PARA CONFIGURAR LA VALIDACIÓN:
 * 
 * 1️⃣ CREAR SYLLABUS EN EL EDITOR VISUAL
 *    - Ve a: /dashboard/admin/editor-syllabus
 *    - Crea una estructura completa con todas las secciones
 *    - Marca los campos importantes con "Es encabezado" (isHeader: true)
 *    - Guarda el syllabus normalmente
 * 
 * 2️⃣ MARCAR COMO PLANTILLA DE REFERENCIA
 *    Opción A - Usando Postman/Thunder Client:
 *    ```
 *    POST http://localhost:4000/api/syllabi/:id/marcar-plantilla
 *    Headers:
 *      Authorization: Bearer TU_TOKEN_DE_ADMIN
 *    Body (JSON):
 *    {
 *      "periodo": "Primer Periodo PII 2026"
 *    }
 *    ```
 * 
 *    Opción B - Usando SQL directo:
 *    ```sql
 *    -- Ver el syllabus que acabas de crear
 *    SELECT id, nombre, periodo FROM syllabi 
 *    ORDER BY "createdAt" DESC LIMIT 5;
 *    
 *    -- Marcar como plantilla (reemplaza ID con el correcto)
 *    UPDATE syllabi 
 *    SET es_plantilla_referencia = true 
 *    WHERE id = TU_ID_AQUI;
 *    
 *    -- Verificar
 *    SELECT id, nombre, periodo, es_plantilla_referencia 
 *    FROM syllabi 
 *    WHERE es_plantilla_referencia = true;
 *    ```
 * 
 * 3️⃣ VERIFICAR QUE ESTÁ LISTA
 *    ```sql
 *    SELECT 
 *      id,
 *      nombre,
 *      periodo,
 *      es_plantilla_referencia,
 *      (
 *        SELECT COUNT(*)
 *        FROM jsonb_array_elements(datos_syllabus->'tabs') as tab,
 *             jsonb_array_elements(tab->'rows') as row,
 *             jsonb_array_elements(row->'cells') as cell
 *        WHERE (cell->>'isHeader')::boolean = true
 *      ) as total_campos_requeridos
 *    FROM syllabi
 *    WHERE periodo = 'Primer Periodo PII 2026'
 *      AND es_plantilla_referencia = true;
 *    ```
 * 
 * 4️⃣ AHORA LA COMISIÓN PUEDE SUBIR Y VALIDAR
 *    - La comisión académica va a /dashboard/admin/editor-syllabus
 *    - Selecciona el periodo "Primer Periodo PII 2026"
 *    - Sube un archivo Word
 *    - El sistema automáticamente:
 *      ✓ Busca la plantilla para ese periodo
 *      ✓ Extrae los campos con isHeader=true de la plantilla
 *      ✓ Extrae los títulos en negrita del Word subido
 *      ✓ Compara ambos
 *      ✓ Acepta si coinciden 100% o rechaza mostrando qué falta
 * 
 * 
 * 📊 ESTRUCTURA ESPERADA DEL EDITOR:
 * 
 * datos_syllabus: {
 *   tabs: [
 *     {
 *       title: "DATOS GENERALES Y ESPECÍFICOS DE LA ASIGNATURA",
 *       rows: [
 *         {
 *           cells: [
 *             { content: "Código de Asignatura", isHeader: true },   // ✅ ESTO SE VALIDA
 *             { content: ":", isHeader: true },                      // ✅ ESTO SE VALIDA
 *             { content: "", isHeader: false }                       // ❌ Esto NO se valida
 *           ]
 *         },
 *         {
 *           cells: [
 *             { content: "Nombre de la asignatura", isHeader: true }, // ✅ ESTO SE VALIDA
 *             { content: ":", isHeader: true },
 *             { content: "", isHeader: false }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 * 
 * 
 * 🔍 TROUBLESHOOTING:
 * 
 * ❌ Error: "No existe una plantilla de referencia para el periodo X"
 *    → Verifica que marcaste el syllabus como plantilla
 *    → Verifica que el nombre del periodo coincida EXACTAMENTE
 * 
 * ❌ Error: "La plantilla no contiene configuración del editor"
 *    → El syllabus fue creado pero no desde el editor visual
 *    → Necesitas crear uno nuevo usando /dashboard/admin/editor-syllabus
 * 
 * ❌ Error: "No se encontraron campos con isHeader=true"
 *    → No marcaste ningún campo como "Es encabezado" en el editor
 *    → Ve al editor, edita las celdas importantes, marca checkbox "Es encabezado"
 * 
 * ❌ Error validación: "Falta: Código de Asignatura, Prerrequisito..."
 *    → El Word del profesor no tiene esos títulos en negrita
 *    → El profesor debe asegurarse de que TODOS los títulos estén en negrita
 * 
 * 
 * 📝 NOTAS IMPORTANTES:
 * 
 * 1. Solo puede haber UNA plantilla de referencia por periodo
 *    (Si marcas otra, la anterior se desmarcará automáticamente)
 * 
 * 2. Los títulos deben estar EXACTAMENTE igual (normalización incluida):
 *    - "Código de Asignatura" = "codigo de asignatura" ✅
 *    - "Código de Asignatura:" = "codigo de asignatura" ✅ (quita :)
 *    - "Código" ≠ "Código de Asignatura" ❌
 * 
 * 3. El Word del profesor debe tener los títulos en NEGRITA
 *    - Aplicar negrita (Ctrl+B) a los títulos importantes
 *    - No usar mayúsculas solamente
 * 
 * 4. El sistema compara con 100% de coincidencia
 *    - Si falta UN solo título, rechaza el documento
 *    - Muestra lista completa de qué falta y qué sobra
 */

module.exports = {
  // Exportar guía en objeto para que no de error al importar
  guia: "Ver comentarios del archivo"
};
