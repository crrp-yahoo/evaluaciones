import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { Rol } from '../api/tipos'

interface NavItem { to: string; label: string; roles: Rol[] }
const NAV: NavItem[] = [
  { to: '/usuarios', label: 'Usuarios', roles: ['admin'] },
  { to: '/cursos', label: 'Cursos', roles: ['admin', 'profesor'] },
  { to: '/preguntas', label: 'Preguntas', roles: ['admin', 'profesor'] },
  { to: '/examenes', label: 'Exámenes', roles: ['admin', 'profesor'] },
  { to: '/mis-examenes', label: 'Mis exámenes', roles: ['estudiante'] },
  { to: '/practica/estadisticas', label: 'Mi práctica', roles: ['estudiante'] },
]

export function Layout() {
  const { usuario, logout } = useAuth()
  const loc = useLocation()
  const items = NAV.filter((n) => usuario && n.roles.includes(usuario.rol))

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-semibold">Exámenes</Link>
            <nav className="flex gap-1">
              {items.map((n) => (
                <Link key={n.to} to={n.to}
                  className={`px-3 py-1.5 rounded-lg text-sm ${loc.pathname.startsWith(n.to) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{usuario?.nombre} · {usuario?.rol}</span>
            <button onClick={() => logout()} className="text-slate-600 hover:text-slate-900">Salir</button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6"><Outlet /></main>
    </div>
  )
}
