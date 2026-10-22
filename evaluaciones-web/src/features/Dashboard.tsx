import { useAuth } from '../auth/AuthContext'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { usuario } = useAuth()
  const accesos: Record<string, Array<{ to: string; label: string }>> = {
    admin: [{ to: '/usuarios', label: 'Gestionar usuarios' }, { to: '/cursos', label: 'Cursos' }, { to: '/examenes', label: 'Exámenes' }],
    profesor: [{ to: '/cursos', label: 'Mis cursos' }, { to: '/preguntas', label: 'Banco de preguntas' }, { to: '/examenes', label: 'Mis exámenes' }],
    estudiante: [{ to: '/mis-examenes', label: 'Mis exámenes' }],
  }
  const items = usuario ? accesos[usuario.rol] ?? [] : []
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Hola, {usuario?.nombre}</h1>
      <p className="text-slate-500 mb-6">¿Qué quieres hacer hoy?</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((a) => (
          <Link key={a.to} to={a.to} className="bg-white rounded-xl border p-5 hover:shadow transition">
            <span className="font-medium">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
