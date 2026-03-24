$content = Get-Content "c:\distributivofinallllllllllllllllllllllllllllllllllllllllllll\unesum-final\app\dashboard\admin\editor-syllabus\page.tsx" -Raw -Encoding UTF8

# Reemplazos
$content = $content -replace 'EditorSyllabusPage', 'EditorProgramaAnaliticoPage'
$content = $content -replace 'datos_syllabus', 'datos_tabla'
$content = $content -replace '/api/syllabi', '/api/programa-analitico'
$content = $content -replace 'syllabi', 'programas'
$content = $content -replace 'Syllabus', 'ProgramaAnalitico'
$content = $content -replace 'syllabus', 'programa'
$content = $content -replace 'Syllabi', 'Programas'
$content = $content -replace 'Editor de ProgramaAnalitico', 'Editor de Programa Analítico'
$content = $content -replace 'Crear ProgramaAnalitico', 'Crear Programa Analítico'

$content | Out-File "c:\distributivofinallllllllllllllllllllllllllllllllllllllllllll\unesum-final\app\dashboard\admin\programa-analitico\page.tsx" -Encoding UTF8
Write-Host "✅ Archivo creado exitosamente"
