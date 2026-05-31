import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import CalendarioPublico from "@/components/landing/calendario-publico"

export default function HomePage() {
  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="bg-emerald-950/80 backdrop-blur-lg text-white px-6 py-4 shadow-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center overflow-hidden border border-white/20 aspect-square">
              <Image
                src="/images/escudo-unesum.png"
                alt="UNESUM Logo"
                width={48}
                height={48}
                className="object-cover w-full h-full"
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
              <Button variant="ghost" className="text-white hover:bg-emerald-600 gap-2">
                🔑 Iniciar sesión
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="ghost" className="text-white hover:bg-emerald-600 border border-white/30 gap-2">
                📝 Registrarse
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-28 relative overflow-hidden bg-emerald-950">
        <div className="absolute inset-0 z-0">
          <Image 
            src="/images/campus-aerial-unesum.png" 
            alt="Campus UNESUM" 
            fill 
            className="object-cover opacity-80"
            priority
          />
          <div className="absolute inset-0 bg-emerald-950/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/95 via-transparent to-emerald-950/95" />
        </div>
        <div className="max-w-4xl mx-auto text-center text-white relative z-10">
          <div className="mb-10">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full" />
              <Image
                src="/images/escudo-unesum.png"
                alt="UNESUM Logo"
                width={120}
                height={120}
                className="relative z-10 mx-auto mb-6 bg-white rounded-full shadow-2xl backdrop-blur-sm object-cover overflow-hidden aspect-square"
              />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-lg tracking-tight">
            Plataforma de Gestión Académica
          </h1>
          <p className="text-xl md:text-2xl mb-4 opacity-100 font-semibold drop-shadow-md text-emerald-100">
            Universidad Estatal del Sur de Manabí
          </p>
          <p className="text-lg md:text-xl mb-10 opacity-90 leading-relaxed max-w-2xl mx-auto drop-shadow-sm">
            Excelencia Académica para el Desarrollo - Sistema integral para la gestión de funciones sustantivas,
            docentes y actividades académicas.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-white text-emerald-700 hover:bg-gray-100 font-bold px-8 py-6 text-lg shadow-lg hover:shadow-emerald-500/20 transition-all">
                Acceder al Sistema
              </Button>
            </Link>
            <a href="#cronograma">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-emerald-700 font-bold px-8 py-6 text-lg shadow-lg bg-transparent backdrop-blur-sm transition-all"
              >
                📅 Ver Calendario
              </Button>
            </a>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="px-6 py-20 bg-[#f8faf9] border-y border-emerald-100/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-emerald-900 text-center mb-4">Módulos del Sistema</h2>
          <p className="text-emerald-700/70 text-center mb-16 max-w-2xl mx-auto">
            Herramientas integradas para optimizar la gestión universitaria y el seguimiento académico.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white border-emerald-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <span className="text-3xl">👨‍🏫</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-emerald-900">Gestión de Docentes</h3>
                <p className="text-emerald-800/70 leading-relaxed">
                  Administra información completa de docentes, sus datos personales y actividades académicas.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white border-emerald-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <span className="text-3xl">📚</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-emerald-900">Funciones Sustantivas</h3>
                <p className="text-emerald-800/70 leading-relaxed">
                  Registra y controla las funciones sustantivas universitarias: docencia, investigación y vinculación.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white border-emerald-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <span className="text-3xl">🎯</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-emerald-900">Actividades Extracurriculares</h3>
                <p className="text-emerald-800/70 leading-relaxed">
                  Gestiona actividades complementarias, eventos académicos y su seguimiento integral.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Campus Section */}
      <section className="px-6 py-24 bg-white">
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
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden aspect-square mx-auto md:mx-0">
              <Image
                src="/images/escudo-unesum.png"
                alt="UNESUM Logo"
                width={40}
                height={40}
                className="object-cover w-full h-full"
              />
            </div>
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
