'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainHeader } from '@/components/layout/main-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ExtractorTitulosModal } from '@/components/programa-analitico/extractor-titulos-modal'
import { SesionesExtraidasList } from '@/components/programa-analitico/sesiones-extraidas-list'
import { FileSpreadsheet } from 'lucide-react'

export default function ComisionExtractorProgramaAnaliticoPage() {
  return (
    <ProtectedRoute allowedRoles={['comision', 'comision_academica']}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Extractor de Programa Analítico
            </h1>
            <p className="text-gray-600">
              Sube archivos Excel o Word para extraer los títulos del programa analítico
            </p>
          </div>

          {/* Card con el extractor */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500 text-white">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Extraer Títulos</CardTitle>
                  <CardDescription>
                    Sube un archivo Excel (.xlsx) o Word (.docx) para extraer automáticamente los títulos
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ExtractorTitulosModal />
            </CardContent>
          </Card>

          {/* Lista de sesiones extraídas */}
          <Card>
            <CardHeader>
              <CardTitle>Sesiones Extraídas</CardTitle>
              <CardDescription>
                Historial de extracciones realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SesionesExtraidasList />
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}
