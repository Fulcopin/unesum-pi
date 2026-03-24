export interface User {
    id: number
    nombres: string
    apellidos: string
    correo_electronico: string
    rol: string
    cedula_identidad: string
    telefono?: string
    fecha_nacimiento?: String
    direccion?: string
    facultad?: string
    carrera?: string
    estado: boolean
  }
  
  export interface ApiError {
    message: string
    statusCode?: number
  }
  
  export interface LoginResponse {
    token: string
    user: User
  }
  
  export interface RegisterResponse {
    success: boolean
    user: User
    token: string
  }
  
  export interface AuthState {
    user: User | null
    isLoading: boolean
    error: string | null
  }