import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { http, setAccessToken } from '../api/cliente'
import type { Rol, Usuario } from '../api/tipos'

interface AuthState {
  usuario: Usuario | null
  cargando: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  tieneRol: (...roles: Rol[]) => boolean
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  // Al montar, intenta recuperar la sesión vía refresh (cookie httpOnly).
  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
        if (r.ok) {
          const data = await r.json()
          setAccessToken(data.accessToken)
          const me = await http.get<Usuario>('/auth/me')
          setUsuario(me)
        }
      } catch { /* sin sesión */ }
      finally { setCargando(false) }
    })()
  }, [])

  async function login(email: string, password: string) {
    const data = await http.post<{ accessToken: string; usuario: Usuario }>('/auth/login', { email, password })
    setAccessToken(data.accessToken)
    setUsuario(data.usuario)
  }

  async function logout() {
    try { await http.post('/auth/logout') } catch { /* ignore */ }
    setAccessToken(null)
    setUsuario(null)
  }

  const tieneRol = (...roles: Rol[]) => !!usuario && roles.includes(usuario.rol)

  return <Ctx.Provider value={{ usuario, cargando, login, logout, tieneRol }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
