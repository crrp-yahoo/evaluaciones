import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/cliente'
import type { Curso } from '../../api/tipos'
import { Boton, Card, Campo, inputCls } from '../../components/ui'

interface Estudiante { id: string; nombre: string; email: string }

export default function CursosPage() {
  const qc = useQueryClient()
  const { data: cursos, isLoading } = useQuery({ queryKey: ['cursos'], queryFn: () => http.get<Curso[]>('/cursos') })
  const [nombre, setNombre] = useState('')
  const [sel, setSel] = useState<string | null>(null)

  const crear = useMutation({
    mutationFn: () => http.post<Curso>('/cursos', { nombre }),
    onSuccess: () => { setNombre(''); qc.invalidateQueries({ queryKey: ['cursos'] }) },
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Cursos</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="font-medium mb-3">Nuevo curso</h2>
          <Campo label="Nombre" htmlFor="c"><input id="c" className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
          <Boton onClick={() => crear.mutate()} disabled={!nombre || crear.isPending}>Crear</Boton>
        </Card>
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? <p className="text-slate-500">Cargando…</p> : cursos?.length === 0 ? <p className="text-slate-500">Aún no hay cursos.</p> :
            cursos?.map((c) => (
              <Card key={c.id}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.nombre}</span>
                  <Boton variant="secondary" onClick={() => setSel(sel === c.id ? null : c.id)}>{sel === c.id ? 'Ocultar' : 'Inscripciones'}</Boton>
                </div>
                {sel === c.id && <Inscripciones cursoId={c.id} />}
              </Card>
            ))}
        </div>
      </div>
    </div>
  )
}

function Inscripciones({ cursoId }: { cursoId: string }) {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['estudiantes', cursoId], queryFn: () => http.get<Estudiante[]>(`/cursos/${cursoId}/estudiantes`) })
  const [estudianteId, setEstudianteId] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const inscribir = useMutation({
    mutationFn: () => http.post(`/cursos/${cursoId}/inscripciones`, { estudianteId: Number(estudianteId) }),
    onSuccess: () => { setEstudianteId(''); setErr(null); qc.invalidateQueries({ queryKey: ['estudiantes', cursoId] }) },
    onError: () => setErr('No se pudo inscribir (¿ya inscrito o no es estudiante?)'),
  })
  const quitar = useMutation({
    mutationFn: (id: string) => http.del(`/cursos/${cursoId}/inscripciones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['estudiantes', cursoId] }),
  })

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex gap-2 mb-2">
        <input className={inputCls} placeholder="ID de estudiante" value={estudianteId} onChange={(e) => setEstudianteId(e.target.value)} />
        <Boton onClick={() => inscribir.mutate()} disabled={!estudianteId}>Inscribir</Boton>
      </div>
      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
      <ul className="text-sm divide-y">
        {data?.length === 0 ? <li className="text-slate-400 py-1">Sin estudiantes.</li> :
          data?.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-1">
              <span>{e.nombre} <span className="text-slate-400">· {e.email}</span></span>
              <button onClick={() => quitar.mutate(e.id)} className="text-red-600 text-xs hover:underline">Quitar</button>
            </li>
          ))}
      </ul>
    </div>
  )
}
