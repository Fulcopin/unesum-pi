// User roles in the academic system
export type UserRole = "administrador" | "comision" | "direccion" | "decano" | "subdecano" | "docente" | "estudiante"| "profesor"| "comision_academica"

// User interface
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  facultad?: string
  carrera?: string
  cedula?: string
  telefono?: string
  direccion?: string
  estado: "activo" | "inactivo"
  createdAt: Date
  updatedAt: Date
}

// Academic Functions
export interface FuncionSustantiva {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  estado: "activo" | "inactivo"
  createdAt: Date
  updatedAt: Date
}

// Paralelo
export interface Paralelo {
  id: string
  codigo?: string // Código automático generado
  nombre: string
  estado: "activo" | "inactivo"
  createdAt: Date
  updatedAt: Date
}

// Periodo
export interface Periodo {
  id: string
  codigo?: string // Código automático generado
  nombre: string
  estado: "activo" | "inactivo"
  createdAt: Date
  updatedAt: Date
}

// Nivel
export interface Nivel {
  id: string
  codigo: string
  nombre: string
  estado: "activo" | "inactivo"
  createdAt: Date
  updatedAt: Date
}

// Organizacion
export interface Organizacion {
  id: string
  codigo?: string // Código automático generado
  nombre: string
  estado: "activo" | "inactivo"
  createdAt: Date
  updatedAt: Date
}

// Teacher interface
export interface Docente {
  id: string
  nombre: string
  apellido: string
  cedula: string
  telefono: string
  correo: string
  fechaNacimiento: String
  direccion: string
  facultad: string
  carrera: string
  estado: "activo" | "inactivo"
  createdAt: Date
  updatedAt: Date
}

// Extracurricular Activities
export interface ActividadExtracurricular {
  id: string
  codigo: string
  nombre: string
  funcionSustantivaId: string
  funcionSustantiva?: FuncionSustantiva
  descripcion?: string
  estado: "activo" | "inactivo"
  createdAt: Date
  updatedAt: Date
}

// Academic Period
export interface PeriodoAcademico {
  id: string
  nombre: string
  fechaInicio: Date
  fechaFin: Date
  estado: "activo" | "inactivo" | "finalizado"
  createdAt: Date
  updatedAt: Date
}

// Faculty and Career
export interface Facultad {
  id: string
  nombre: string
  codigo: string
  estado: "activo" | "inactivo"
}

export interface Carrera {
  id: string
  nombre: string
  codigo: string
  facultadId: string
  facultad?: Facultad
  estado: "activo" | "inactivo"
}

// Teacher interface
export interface Malla {
  id: string
  nombre: string
  apellido: string
  cedula: string
  telefono: string
  correo: string
  fechaNacimiento: String
  direccion: string
  facultad: string
  carrera: string
  estado: "activo" | "inactivo"
  createdAt: Date
  updatedAt: Date
}