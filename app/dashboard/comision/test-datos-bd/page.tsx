'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'

export default function TestDatosBDPage() {
  const { getToken } = useAuth()
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testearAsignatura31 = async () => {
    setLoading(true)
    console.log('🧪 ========================================')
    console.log('🧪 INICIANDO TEST DE BASE DE DATOS')
    console.log('🧪 ========================================')

    try {
      // 1. Buscar programas de asignatura 31
      const url = `${process.env.NEXT_PUBLIC_API_URL}/programa-analitico?asignatura_id=31`
      console.log('🌐 URL que se va a llamar:', url)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      })

      console.log('📡 Response status:', response.status)
      console.log('📡 Response ok:', response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ DATOS RECIBIDOS:')
        console.log('📦 Data completo:', data)
        console.log('📦 Cantidad de programas:', data.data?.length || 0)

        if (data.data && data.data.length > 0) {
          const programa = data.data[0]
          console.log('\n📋 PRIMER PROGRAMA ENCONTRADO:')
          console.log('   ID:', programa.id)
          console.log('   Nombre:', programa.nombre_programa)
          console.log('   Asignatura ID:', programa.asignatura_id)
          console.log('   Periodo:', programa.periodo)
          console.log('   Tiene datos_tabla:', !!programa.datos_tabla)

          if (programa.datos_tabla) {
            console.log('\n🎯 ANALIZANDO DATOS_TABLA:')
            console.log('   Tipo de datos_tabla:', typeof programa.datos_tabla)
            
            let datosTabla
            if (typeof programa.datos_tabla === 'string') {
              console.log('   ℹ️ Es string, parseando...')
              datosTabla = JSON.parse(programa.datos_tabla)
            } else {
              console.log('   ℹ️ Ya es objeto')
              datosTabla = programa.datos_tabla
            }

            console.log('\n📊 ESTRUCTURA DEL JSON:')
            console.log('   Version:', datosTabla.version)
            console.log('   Tipo:', datosTabla.tipo)
            console.log('   Tiene metadata:', !!datosTabla.metadata)
            console.log('   Tiene secciones:', !!datosTabla.secciones)
            
            if (datosTabla.secciones) {
              console.log('\n🎨 SECCIONES ENCONTRADAS:', datosTabla.secciones.length)
              
              datosTabla.secciones.forEach((seccion: any, index: number) => {
                console.log(`\n   📌 Seccion ${index + 1}: "${seccion.nombre}"`)
                console.log(`      - Campos: ${seccion.campos?.length || 0}`)
                
                if (seccion.campos && seccion.campos.length > 0) {
                  seccion.campos.forEach((campo: any, cIdx: number) => {
                    const valorPreview = campo.valor?.substring(0, 50) || '(vacío)'
                    console.log(`         ${cIdx + 1}. "${campo.titulo}": ${valorPreview}${campo.valor?.length > 50 ? '...' : ''}`)
                  })
                }
              })
            }

            setResultado({
              success: true,
              programa: programa,
              datosTabla: datosTabla,
              mensaje: '✅ Datos encontrados y parseados correctamente'
            })
          } else {
            console.log('⚠️ El programa NO tiene datos_tabla guardado')
            setResultado({
              success: false,
              mensaje: '⚠️ El programa existe pero NO tiene datos_tabla'
            })
          }
        } else {
          console.log('⚠️ NO se encontraron programas para asignatura_id=31')
          setResultado({
            success: false,
            mensaje: '⚠️ No hay programas guardados para esta asignatura'
          })
        }
      } else {
        console.log('❌ Error en la respuesta:', response.statusText)
        setResultado({
          success: false,
          mensaje: `❌ Error ${response.status}: ${response.statusText}`
        })
      }
    } catch (error: any) {
      console.error('❌ ERROR:', error)
      setResultado({
        success: false,
        mensaje: `❌ Error: ${error.message}`,
        error: error
      })
    } finally {
      setLoading(false)
      console.log('🧪 ========================================')
      console.log('🧪 TEST FINALIZADO')
      console.log('🧪 ========================================')
    }
  }

  useEffect(() => {
    // Auto-ejecutar el test al cargar la página
    testearAsignatura31()
  }, [])

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧪 Test de Datos de Base de Datos</h1>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-sm text-blue-700">
            Esta página verifica si los datos del programa analítico están en la base de datos.
            <br />
            <strong>Abre la consola del navegador (F12)</strong> para ver los logs detallados.
          </p>
        </div>

        <button
          onClick={testearAsignatura31}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-6"
        >
          {loading ? 'Cargando...' : '🔄 Volver a Testear'}
        </button>

        {resultado && (
          <div className={`p-6 rounded-lg border-2 ${
            resultado.success 
              ? 'bg-green-50 border-green-500' 
              : 'bg-yellow-50 border-yellow-500'
          }`}>
            <h2 className="text-xl font-bold mb-4">
              {resultado.success ? '✅ Resultado' : '⚠️ Advertencia'}
            </h2>
            
            <p className="mb-4 text-lg">{resultado.mensaje}</p>

            {resultado.datosTabla && (
              <div className="mt-4 bg-white p-4 rounded border">
                <h3 className="font-bold mb-2">📊 Resumen del JSON:</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>Version: {resultado.datosTabla.version}</li>
                  <li>Tipo: {resultado.datosTabla.tipo}</li>
                  <li>
                    Secciones: {resultado.datosTabla.secciones?.length || 0}
                    {resultado.datosTabla.secciones && (
                      <ul className="ml-6 mt-2 space-y-1">
                        {resultado.datosTabla.secciones.map((sec: any, idx: number) => (
                          <li key={idx}>
                            {idx + 1}. {sec.nombre} ({sec.campos?.length || 0} campos)
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                </ul>
              </div>
            )}

            {resultado.programa && (
              <div className="mt-4 bg-white p-4 rounded border">
                <h3 className="font-bold mb-2">📋 Info del Programa:</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>ID: {resultado.programa.id}</li>
                  <li>Nombre: {resultado.programa.nombre_programa}</li>
                  <li>Asignatura ID: {resultado.programa.asignatura_id}</li>
                  <li>Periodo: {resultado.programa.periodo}</li>
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">📝 Instrucciones:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Abre la consola del navegador (F12 → Console)</li>
            <li>Los logs mostrarán TODO el proceso de carga de datos</li>
            <li>Busca los emojis 🧪 📦 📋 🎯 📊 🎨 para ver el flujo completo</li>
            <li>Si dice "⚠️ No hay programas guardados", primero debes crear uno</li>
            <li>Si dice "✅ Datos encontrados", entonces SÍ está trayendo de la BD</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
