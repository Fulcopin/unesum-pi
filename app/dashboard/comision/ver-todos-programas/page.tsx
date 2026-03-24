'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function VerTodosProgramasPage() {
  const { getToken } = useAuth()
  const [programas, setProgramas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarTodosProgramas = async () => {
    setLoading(true)
    setError(null)
    
    console.log('🔍 ========================================')
    console.log('🔍 CARGANDO TODOS LOS PROGRAMAS ANALÍTICOS')
    console.log('🔍 ========================================')

    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/programa-analitico`
      console.log('🌐 URL:', url)

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      })

      console.log('📡 Status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Respuesta recibida:', data)
        console.log('📊 Total de programas:', data.data?.length || 0)

        if (data.data && data.data.length > 0) {
          // Analizar cada programa
          const programasConAnalisis = data.data.map((prog: any) => {
            let datosTabla = null
            let secciones = []
            
            if (prog.datos_tabla) {
              try {
                datosTabla = typeof prog.datos_tabla === 'string' 
                  ? JSON.parse(prog.datos_tabla) 
                  : prog.datos_tabla
                
                secciones = datosTabla?.secciones || []
                
                console.log(`\n📋 Programa ID ${prog.id}:`)
                console.log(`   Nombre: ${prog.nombre_programa || 'Sin nombre'}`)
                console.log(`   Usuario ID: ${prog.usuario_id}`)
                console.log(`   Asignatura ID: ${prog.asignatura_id || 'N/A'}`)
                console.log(`   Periodo: ${prog.periodo || 'N/A'}`)
                console.log(`   Secciones: ${secciones.length}`)
                
                if (secciones.length > 0) {
                  console.log(`   Primeras secciones:`)
                  secciones.slice(0, 3).forEach((sec: any, idx: number) => {
                    console.log(`      ${idx + 1}. ${sec.nombre} (${sec.campos?.length || 0} campos)`)
                  })
                }
              } catch (err) {
                console.error(`   ❌ Error al parsear JSON del programa ${prog.id}:`, err)
              }
            }

            return {
              ...prog,
              datosTabla,
              secciones,
              tieneDatos: !!prog.datos_tabla,
              numSecciones: secciones.length
            }
          })

          setProgramas(programasConAnalisis)
        } else {
          console.log('⚠️ No hay programas en la base de datos')
          setError('No hay programas analíticos guardados')
        }
      } else {
        const errorText = await response.text()
        console.error('❌ Error:', response.status, errorText)
        setError(`Error ${response.status}: ${errorText}`)
      }
    } catch (err: any) {
      console.error('❌ Exception:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      console.log('🔍 ========================================')
    }
  }

  const verDetalleJSON = (programa: any) => {
    console.log('🔍 ========================================')
    console.log('🔍 DETALLE COMPLETO DEL PROGRAMA', programa.id)
    console.log('🔍 ========================================')
    console.log('📋 Programa completo:', programa)
    console.log('\n📊 datos_tabla:')
    console.log(programa.datosTabla)
    
    if (programa.secciones && programa.secciones.length > 0) {
      console.log('\n🎯 SECCIONES DETALLADAS:')
      programa.secciones.forEach((sec: any, idx: number) => {
        console.log(`\n   📌 Sección ${idx + 1}: "${sec.nombre}"`)
        console.log(`      Campos: ${sec.campos?.length || 0}`)
        
        if (sec.campos && sec.campos.length > 0) {
          sec.campos.forEach((campo: any, cIdx: number) => {
            console.log(`         ${cIdx + 1}. "${campo.titulo}"`)
            console.log(`            Valor: ${campo.valor?.substring(0, 100) || '(vacío)'}${campo.valor?.length > 100 ? '...' : ''}`)
          })
        }
      })
    }
    
    console.log('🔍 ========================================')
    alert('✅ Detalle completo mostrado en la consola (F12)')
  }

  useEffect(() => {
    cargarTodosProgramas()
  }, [])

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📚 Todos los Programas Analíticos en la BD</h1>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-sm text-blue-700">
            Esta página muestra TODOS los programas analíticos guardados en la base de datos,
            incluyendo los que guardó el <strong>ADMIN</strong>.
            <br />
            <strong>Abre la consola (F12)</strong> para ver los detalles del JSON.
          </p>
        </div>

        <Button
          onClick={cargarTodosProgramas}
          disabled={loading}
          className="mb-6"
        >
          {loading ? 'Cargando...' : '🔄 Recargar Programas'}
        </Button>

        {error && (
          <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg mb-6">
            <p className="text-red-700 font-bold">❌ Error: {error}</p>
          </div>
        )}

        {programas.length === 0 && !loading && !error && (
          <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
            <p className="text-yellow-700">⚠️ No hay programas analíticos en la base de datos</p>
          </div>
        )}

        <div className="grid gap-4">
          {programas.map((programa, idx) => (
            <Card key={programa.id} className={programa.tieneDatos ? 'border-green-500' : 'border-gray-300'}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {idx + 1}. {programa.nombre_programa || programa.nombre || `Programa ${programa.id}`}
                  </span>
                  {programa.tieneDatos && (
                    <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                      ✅ Con datos
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <strong>ID:</strong> {programa.id}
                  </div>
                  <div>
                    <strong>Usuario ID:</strong> {programa.usuario_id}
                  </div>
                  <div>
                    <strong>Asignatura ID:</strong> {programa.asignatura_id || 'N/A'}
                  </div>
                  <div>
                    <strong>Periodo:</strong> {programa.periodo || 'N/A'}
                  </div>
                  <div>
                    <strong>Creado:</strong> {programa.createdAt ? new Date(programa.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div>
                    <strong>Secciones:</strong> {programa.numSecciones}
                  </div>
                </div>

                {programa.tieneDatos && programa.secciones.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded mb-3">
                    <p className="font-bold text-sm mb-2">📋 Secciones guardadas:</p>
                    <ul className="text-xs space-y-1">
                      {programa.secciones.slice(0, 5).map((sec: any, idx: number) => (
                        <li key={idx}>
                          {idx + 1}. {sec.nombre} ({sec.campos?.length || 0} campos)
                        </li>
                      ))}
                      {programa.secciones.length > 5 && (
                        <li className="text-gray-500">... y {programa.secciones.length - 5} más</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => verDetalleJSON(programa)}
                    variant="outline"
                    size="sm"
                    disabled={!programa.tieneDatos}
                  >
                    🔍 Ver JSON Completo en Consola
                  </Button>
                  
                  <Button
                    onClick={() => {
                      window.open(
                        `/dashboard/comision/crear-programa-analitico?asignatura=${programa.asignatura_id}`,
                        '_blank'
                      )
                    }}
                    variant="default"
                    size="sm"
                    disabled={!programa.asignatura_id}
                  >
                    📝 Abrir en Editor
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
