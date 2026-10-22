import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { http } from '../../api/cliente'
import type { Examen, Paginado, Pregunta } from '../../api/tipos'
import { Boton, Card } from '../../components/ui'

// Selecciona y ordena las preguntas de un examen (Req 5.1).
export default function ExamenPreguntasPage() {
  const { id = '' } = useParams()
  const { data: examen } = useQuery({ queryKey: ['examen', id], queryFn: () => http.get<Examen>(`/examenes/${id}`) })
  const { data: banco } = useQuery({
    queryKey: ['preguntas-banco', examen?.cursoId],
    queryFn: () => http.get<Paginado<Pregunta>>(`/preguntas?pageSize=100&cursoId=${examen!.cursoId}`),
    enabled: !!examen,
  })
  const [sel, setSel] = useState<string[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => { /* al cargar no sabemos el orden actual; se arma al seleccionar */ }, [])

  const guardar = useMutation({
    mutationFn: () => http.put(`/examenes/${id}/preguntas`, { preguntas: sel.map((pid, i) => ({ preguntaId: Number(pid), orden: i })) }),
    onSuccess: () => setMsg('Preguntas asignadas'),
    onError: (e: unknown) => setMsg(((e as { mensaje?: string }).mensaje) ?? 'Error'),
  })

  function toggle(pid: string) {
    setSel((prev) => prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid])
  }
  function mover(pid: string, dir: -1 | 1) {
    setSel((prev) => {
      const i = prev.indexOf(pid); const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const copy = [...prev]; [copy[i], copy[j]] = [copy[j]!, copy[i]!]; return copy
    })
  }

  return (
    <div>
      <Link to="/examenes" className="text-sm text-blue-600 hover:underline">← Exámenes</Link>
      <h1 className="text-2xl font-semibold my-2">Preguntas de: {examen?.titulo}</h1>
      {msg && <p className="mb-3 text-sm text-slate-600 bg-slate-100 rounded-lg px-3 py-2">{msg}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-medium mb-3">Banco del curso</h2>
          <ul className="space-y-1 text-sm">
            {banco?.rows.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <input type="checkbox" checked={sel.includes(p.id)} onChange={() => toggle(p.id)} />
                <span dangerouslySetInnerHTML={{ __html: p.enunciado }} />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-medium mb-3">Orden del examen ({sel.length})</h2>
          <ol className="space-y-1 text-sm">
            {sel.map((pid, i) => {
              const p = banco?.rows.find((x) => x.id === pid)
              return (
                <li key={pid} className="flex items-center justify-between gap-2 border rounded-lg px-2 py-1">
                  <span>{i + 1}. <span dangerouslySetInnerHTML={{ __html: p?.enunciado ?? pid }} /></span>
                  <span className="flex gap-1">
                    <button onClick={() => mover(pid, -1)} aria-label="Subir" className="px-1">↑</button>
                    <button onClick={() => mover(pid, 1)} aria-label="Bajar" className="px-1">↓</button>
                  </span>
                </li>
              )
            })}
          </ol>
          <div className="mt-3"><Boton onClick={() => guardar.mutate()} disabled={sel.length === 0 || guardar.isPending}>Guardar</Boton></div>
        </Card>
      </div>
    </div>
  )
}
