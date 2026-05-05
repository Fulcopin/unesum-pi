import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import CalendarioPublico from "@/components/landing/calendario-publico"

export default function HomePage() {
  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="bg-emerald-950/55 backdrop-blur-md text-white px-6 py-4 shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full p-1 flex items-center justify-center">
              <Image
                src="/images/unesum-logo-official.png"
                alt="UNESUM Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold">UNESUM</h1>
              <p className="text-sm opacity-90">Universidad Estatal del Sur de Manabí</p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <a href="#cronograma">
              <Button variant="ghost" className="text-white hover:bg-emerald-600">
                📅 Calendario
              </Button>
            </a>
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:bg-emerald-600">
                Iniciar sesión
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="ghost" className="text-white hover:bg-emerald-600 border border-white/30">
                Registrarse
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <Image src="/images/unesum-campus-aerial.png" alt="Campus UNESUM" fill className="object-cover" />
        </div>
        <div className="max-w-4xl mx-auto text-center text-white relative z-10">
          <div className="mb-8">
            <Image
              src="/images/unesum-logo-official.png"
              alt="UNESUM Logo"
              width={120}
              height={120}
              className="mx-auto mb-6 bg-white rounded-full p-3"
            />
          </div>
          <h1 className="text-5xl font-bold mb-6">Plataforma de Gestión Académica</h1>
          <p className="text-xl mb-4 opacity-90 font-medium">Universidad Estatal del Sur de Manabí</p>
          <p className="text-lg mb-8 opacity-80">
            Excelencia Académica para el Desarrollo - Sistema integral para la gestión de funciones sustantivas,
            docentes y actividades académicas.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-white text-emerald-700 hover:bg-gray-100 font-semibold px-8 py-3">
                Acceder al Sistema
              </Button>
            </Link>
            <a href="#cronograma">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-emerald-700 font-semibold px-8 py-3 bg-transparent"
              >
                📅 Ver Calendario
              </Button>
            </a>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="px-6 py-16 bg-white/12 backdrop-blur-md border-y border-white/15">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Módulos del Sistema</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30 transition-all">
              <CardContent className="p-6 text-center text-white">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👨‍🏫</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Gestión de Docentes</h3>
                <p className="opacity-90">
                  Administra información completa de docentes, sus datos personales y actividades académicas.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30 transition-all">
              <CardContent className="p-6 text-center text-white">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📚</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Funciones Sustantivas</h3>
                <p className="opacity-90">
                  Registra y controla las funciones sustantivas universitarias: docencia, investigación y vinculación.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30 transition-all">
              <CardContent className="p-6 text-center text-white">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Actividades Extracurriculares</h3>
                <p className="opacity-90">
                  Gestiona actividades complementarias, eventos académicos y su seguimiento integral.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Campus Section */}
      <section className="px-6 py-16 bg-white/72 backdrop-blur-md">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-emerald-700 mb-6">Nuestro Campus</h2>
              <p className="text-gray-700 mb-4 leading-relaxed">
                La Universidad Estatal del Sur de Manabí cuenta con modernas instalaciones diseñadas para brindar la
                mejor experiencia educativa a nuestros estudiantes y docentes.
              </p>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Fundada el 7 de febrero de 2001, UNESUM se ha consolidado como una institución de excelencia académica
                comprometida con el desarrollo regional y nacional.
              </p>
              <Link href="/register">
                <Button className="bg-emerald-700 hover:bg-emerald-800 text-white">Únete a UNESUM</Button>
              </Link>
            </div>
            <div className="relative">
              <Image
                src="/images/unesum-building.png"
                alt="Edificio Principal UNESUM"
                width={600}
                height={400}
                className="rounded-lg shadow-xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Calendar Section */}
      <CalendarioPublico />

      {/* Footer */}
      <footer className="bg-emerald-950/70 backdrop-blur-md text-white py-8 border-t border-white/20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image
              src="/images/unesum-logo-official.png"
              alt="UNESUM Logo"
              width={40}
              height={40}
              className="bg-white rounded-full p-1"
            />
            <div>
              <h3 className="font-bold">UNESUM</h3>
              <p className="text-sm opacity-90">Excelencia Académica para el Desarrollo</p>
            </div>
          </div>
          <p className="text-sm opacity-80">
            © 2024 Universidad Estatal del Sur de Manabí. Todos los derechos reservados.
          </p>
          <p className="text-xs opacity-50 mt-1">by apf</p>
        </div>
      </footer>
    </div>
  )
}
