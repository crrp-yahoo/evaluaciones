import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { Rol } from '../api/tipos'

// Protege rutas por autenticación y, opcionalmente, por rol.
export function ProtectedRoute({ roles }: { roles?: Rol[] }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return <div className="p-8 text-slate-500">Cargando…</div>
  if (!usuario) return <Navigate to="/login" replace />
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />
  return <Outlet />
}
