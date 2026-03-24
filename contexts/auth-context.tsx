"use client"

import { createContext, useContext, useState, useEffect } from 'react'
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

interface User {
  id: number
  nombres: string
  apellidos: string
  correo_electronico: string
  rol: string
  email: string;     // <-- ¡CAMBIO AQUÍ! (de correo_electronico a email)
  cedula_identidad: string
  telefono?: string
  fecha_nacimiento?: Date
  direccion?: string
  facultad?: string
  carrera?: string
  estado: boolean
}

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  token: string | null
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, rolSeleccionado?: string) => Promise<boolean | string>
  register: (userData: Omit<User, 'id'>) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  clearError: () => void
  getToken: () => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    token: null
  })

  // Cargar datos del localStorage después del montaje del componente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user_data')
      const savedToken = localStorage.getItem('token')
      
      console.log('🔄 AuthContext - Cargando datos iniciales:', {
        hasUser: !!savedUser,
        hasToken: !!savedToken
      })
      
      if (savedUser && savedToken) {
        try {
          const parsedUser = JSON.parse(savedUser)
          console.log('✅ Usuario cargado desde localStorage:', parsedUser.rol)
          setState(prev => ({
            ...prev,
            user: parsedUser,
            token: savedToken,
            isLoading: false
          }))
        } catch (error) {
          console.error('❌ Error parsing saved user:', error)
          setState(prev => ({ ...prev, isLoading: false }))
        }
      } else {
        console.log('⚠️ No hay datos guardados en localStorage')
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }
  }, [])

  // Configurar interceptor global para axios
  useEffect(() => {
    // Interceptor para solicitudes - añade token automáticamente
    const requestInterceptor = axios.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )
    const responseInterceptor = axios.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        // Solo cerrar sesión si es un error 401 en endpoints de autenticación
        // NO cerrar sesión por errores 401 en otros endpoints
        if (error.response?.status === 401) {
          const url = error.config?.url || '';
          
          // Solo cerrar sesión si es un error de autenticación crítico
          // (no endpoints de datos como /api/periodo)
          const isCriticalAuthError = url.includes('/auth/') || 
                                      url.includes('/login') ||
                                      url.includes('/me');
          
          if (isCriticalAuthError) {
            console.log('❌ Error de autenticación crítico, cerrando sesión');
            // Limpiar la sesión
            localStorage.removeItem('token');
            localStorage.removeItem('token_time');
            localStorage.removeItem('user_data');
            delete axios.defaults.headers.common['Authorization'];
            setState(prev => ({ ...prev, user: null, token: null, isLoading: false, error: null }));
            
            // Redireccionar a login
            if (typeof window !== 'undefined' && 
                !window.location.pathname.includes('/login')) {
              window.location.replace('/login');
            }
          } else {
            console.log('⚠️ Error 401 en endpoint no crítico:', url);
            // Solo propagar el error, no cerrar sesión
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      // Limpiar interceptores al desmontar
      axios.interceptors.request.eject(requestInterceptor)
      axios.interceptors.response.eject(responseInterceptor)
    }
  }, [])

  // Verificar autenticación al cargar
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    checkAuth()
    
    // Verificar cada minuto si el token ha expirado
    const sessionCheckTimer = setInterval(() => {
      if (typeof window === 'undefined') return
      
      const token = localStorage.getItem('token')
      const tokenTime = localStorage.getItem('token_time')
      
      if (token && tokenTime) {
        const elapsed = Date.now() - parseInt(tokenTime)
        const oneHour = 60 * 60 * 1000 // 1 hora en ms
        
        if (elapsed > oneHour) {
          console.log('Sesión expirada por tiempo (verificación periódica)')
          logout()
        }
      }
    }, 60000) // Verificar cada minuto

    return () => clearInterval(sessionCheckTimer)
  }, [])

  const checkAuth = async () => {
    if (typeof window === 'undefined') return
    
    const token = localStorage.getItem('token')
    const tokenTime = localStorage.getItem('token_time')
    const savedUser = localStorage.getItem('user_data')
    
    console.log('🔍 checkAuth - Verificando autenticación:', {
      hasToken: !!token,
      hasTokenTime: !!tokenTime,
      hasSavedUser: !!savedUser
    })
    
    if (token && state.token !== token) {
      setState(prev => ({ ...prev, token }))
    }
    
    if (!token) {
      console.log('⚠️ No hay token, marcando como no autenticado')
      setState(prev => ({ ...prev, isLoading: false, token: null, user: null }))
      return
    }
    
    // Verificar si el token está próximo a expirar basado en el timestamp guardado
    if (tokenTime) {
      const elapsed = Date.now() - parseInt(tokenTime)
      const oneHour = 60 * 60 * 1000 // 1 hora en ms
      
      if (elapsed > oneHour) {
        console.log('❌ Token expirado por tiempo (verificación inicial)')
        logout()
        return
      }
    } else {
      // Si no hay tokenTime, establecerlo ahora
      localStorage.setItem('token_time', Date.now().toString())
    }
    
    if (savedUser && !state.user) {
      try {
        const parsedUser = JSON.parse(savedUser)
        console.log('✅ Restaurando usuario desde localStorage:', parsedUser.rol)
        setState(prev => ({ 
          ...prev, 
          user: parsedUser,
          isLoading: false 
        }))
      } catch (error) {
        console.error('❌ Error parsing saved user:', error)
        logout()
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }))
    }
    
    // NO INTENTAR VERIFICAR CON EL BACKEND
    // Esto estaba causando que se pierda la sesión
    // Si necesitas verificar con el backend, hazlo solo manualmente cuando sea necesario
  }

  const login = async (email: string, password: string, rolSeleccionado?: string): Promise<boolean | string> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      console.log('Intentando login para:', email, rolSeleccionado ? `con rol: ${rolSeleccionado}` : '')
      
      const response = await axios.post(`${API_URL}/auth/login`, {
        correo_electronico: email,
        contraseña: password,
        rol_seleccionado: rolSeleccionado || undefined
      })
      
      if (response.data.success) {
        // Verificar si el backend pide selección de rol
        if (response.data.multipleRoles) {
          console.log('Múltiples roles detectados:', response.data.roles)
          localStorage.setItem('pending_roles', JSON.stringify(response.data.roles))
          setState(prev => ({ ...prev, isLoading: false }))
          return 'multiple_roles'
        }

        const { token, user } = response.data
        
        console.log('Guardando datos en localStorage:', {
          rol: user.rol,
          email: user.correo_electronico || user.email
        })
        
        localStorage.setItem('token', token)
        localStorage.setItem('token_time', Date.now().toString())
        localStorage.setItem('user_data', JSON.stringify(user))
        localStorage.removeItem('pending_roles')
        
        setState(prev => ({ ...prev, user, token, isLoading: false }))
        
        return true
      } else {
        setState(prev => ({ 
          ...prev, 
          error: response.data.message || 'Error de inicio de sesión',
          isLoading: false 
        }))
        return false
      }
    } catch (error) {
      console.error('Error en login:', error)
      const axiosError = error as AxiosError<{ message: string }>
      setState(prev => ({ 
        ...prev, 
        error: axiosError.response?.data?.message || 'Error de inicio de sesión',
        isLoading: false 
      }))
      return false
    }
  }
  const register = async (userData: Omit<User, 'id'>) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData)
      return { success: true, data: response.data }
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      return {
        success: false,
        error: axiosError.response?.data?.message || 'Error en el registro'
      }
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }

  const logout = () => {
    try {
      // 1. Eliminar token del localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('token_time');
      localStorage.removeItem('user_data');
      // 2. Eliminar token de las cabeceras de axios
      delete axios.defaults.headers.common['Authorization'];
      
       // 3. Limpiar estado de usuario y token
       setState({ user: null, token: null, isLoading: false, error: null });
      
      // 4. Redirección forzada al login (CAMBIADO)
      if (typeof window !== 'undefined') {
        console.log('Redirigiendo a login...');
        window.location.href = '/login'; // CAMBIO: /auth/signin → /login
      }
    } catch (error) {
      console.error('Error durante logout:', error);
      
      // Si hay error, intentar redirección directa (CAMBIADO)
      if (typeof window !== 'undefined') {
        window.location.href = '/login'; // CAMBIO: /auth/signin → /login
      }
    }
  };

  const clearError = () => setState(prev => ({ ...prev, error: null }))
  const getToken = (): string => {
    // Si está en el estado, devolverlo
    if (state.token) return state.token
    
    // Si no, intentar obtenerlo del localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) return token
    }
    
    return ''
  }
  return (
    <AuthContext.Provider value={{ 
      ...state, 
      login, 
      register, 
      logout,
      clearError,
      getToken
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}