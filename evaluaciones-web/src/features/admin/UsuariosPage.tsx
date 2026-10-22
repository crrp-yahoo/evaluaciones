import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/cliente'
import type { Paginado, Rol, Usuario } from '../../api/tipos'
import { Boton, Card, Campo, inputCls } from '../../components/ui'

export default function UsuariosPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => http.get<Paginado<Usuario>>('/usuarios?pageSize=100'),
  })
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'estudiante' as Rol })
  const [msg, setMsg] = useState<string | null>(null)

  const crear = useMutation({
    mutationFn: () => http.post<Usuario>('/usuarios', form),
    onSuccess: () => { setMsg('Usuario creado'); setForm({ nombre: '', email: '', password: '', rol: 'estudiante' }); qc.invalidateQueries({ queryKey: ['usuarios'] }) },
    onError: () => setMsg('No se pudo crear (¿email repetido?)'),
  })
  const toggle = useMutation({
    mutationFn: (u: Usuario) => http.patch(`/usuarios/${u.id}/activo`, { activo: !u.activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Usuarios</h1>
      {msg && <p className="mb-3 text-sm text-slate-600 bg-slate-100 rounded-lg px-3 py-2">{msg}</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="font-medium mb-3">Nuevo usuario</h2>
          <Campo label="Nombre" htmlFor="n"><input id="n" className={inputCls} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Campo>
          <Campo label="Correo" htmlFor="e"><input id="e" type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Campo>
          <Campo label="Contraseña" htmlFor="p"><input id="p" type="password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Campo>
          <Campo label="Rol" htmlFor="r">
            <select id="r" className={inputCls} value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}>
              <option value="estudiante">Estudiante</option>
              <option value="profesor">Profesor</option>
              <option value="admin">Administrador</option>
            </select>
          </Campo>
          <Boton onClick={() => crear.mutate()} disabled={crear.isPending || !form.nombre || !form.email || form.password.length < 8}>Crear</Boton>
        </Card>
        <div className="lg:col-span-2">
          <Card>
            {isLoading ? <p className="text-slate-500">Cargando…</p> : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-500 border-b"><th className="py-2">Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {data?.rows.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-2">{u.nombre}</td><td>{u.email}</td><td>{u.rol}</td>
                      <td>{u.activo ? <span className="text-green-700">activo</span> : <span className="text-slate-400">inactivo</span>}</td>
                      <td className="text-right"><Boton variant="secondary" onClick={() => toggle.mutate(u)}>{u.activo ? 'Desactivar' : 'Activar'}</Boton></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
