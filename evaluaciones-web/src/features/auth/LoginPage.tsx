import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import type { ApiError } from '../../api/cliente'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null); setCargando(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      const e = err as ApiError
      setError(e.status === 429 ? 'Demasiados intentos. Espera unos minutos.' : 'Credenciales inválidas')
    } finally { setCargando(false) }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">Plataforma de Exámenes</h1>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">Correo</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">Contraseña</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {error && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={cargando}
          className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50">
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
