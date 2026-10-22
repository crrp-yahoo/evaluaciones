import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/cliente'
import type { Curso, Examen } from '../../api/tipos'
import { Boton, Card, Campo, inputCls } from '../../components/ui'

export default function ExamenesPage() {
  const qc = useQueryClient()
  const { data: cursos } = useQuery({ queryKey: ['cursos'], queryFn: () => http.get<Curso[]>('/cursos') })
  const { data: examenes, isLoading } = useQuery({ queryKey: ['examenes'], queryFn: () => http.get<Examen[]>('/examenes') })
  const [abierto, setAbierto] = useState(false)

  const publicar = useMutation({
    mutationFn: (id: string) => http.post(`/examenes/${id}/publicar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['examenes'] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Exámenes</h1>
        <Boton onClick={() => setAbierto(true)}>Nuevo examen</Boton>
      </div>
      {isLoading ? <p className="text-slate-500">Cargando…</p> : (
        <div className="space-y-2">
          {examenes?.length === 0 ? <p className="text-slate-500">Sin exámenes.</p> :
            examenes?.map((e) => (
              <Card key={e.id}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{e.titulo}</div>
                    <div className="text-xs text-slate-500">
                      {e.estado} · {e.preguntas} pregunta(s) · {e.duracionMin} min · intentos: {e.intentosMax}
                      {e.permitePractica && ' · práctica'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/examenes/${e.id}/preguntas`} className="text-sm text-blue-600 hover:underline self-center">Preguntas</Link>
                    <Link to={`/examenes/${e.id}/resultados`} className="text-sm text-blue-600 hover:underline self-center">Resultados</Link>
                    {e.estado === 'borrador' && <Boton variant="secondary" onClick={() => publicar.mutate(e.id)}>Publicar</Boton>}
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}
      {abierto && cursos && <FormExamen cursos={cursos} onClose={() => setAbierto(false)} onSaved={() => { setAbierto(false); qc.invalidateQueries({ queryKey: ['examenes'] }) }} />}
    </div>
  )
}

function FormExamen({ cursos, onClose, onSaved }: { cursos: Curso[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    cursoId: cursos[0]?.id ?? '', titulo: '', instrucciones: '', duracionMin: 30,
    fechaInicio: '', fechaFin: '', intentosMax: 1, aleatorizar: false, permitePractica: false,
    mostrarResultados: 'al_entregar' as const,
  })
  const [err, setErr] = useState<string | null>(null)
  const crear = useMutation({
    mutationFn: () => http.post('/examenes', {
      ...f, cursoId: Number(f.cursoId),
      fechaInicio: new Date(f.fechaInicio).toISOString(), fechaFin: new Date(f.fechaFin).toISOString(),
    }),
    onSuccess: onSaved,
    onError: (e: unknown) => setErr(((e as { mensaje?: string }).mensaje) ?? 'No se pudo crear'),
  })

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4 z-10" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-3">Nuevo examen</h2>
        <Campo label="Curso"><select className={inputCls} value={f.cursoId} onChange={(e) => setF({ ...f, cursoId: e.target.value })}>{cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Campo>
        <Campo label="Título"><input className={inputCls} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></Campo>
        <Campo label="Instrucciones"><textarea className={inputCls} rows={2} value={f.instrucciones} onChange={(e) => setF({ ...f, instrucciones: e.target.value })} /></Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Duración (min)"><input type="number" min={1} className={inputCls} value={f.duracionMin} onChange={(e) => setF({ ...f, duracionMin: Number(e.target.value) })} /></Campo>
          <Campo label="Intentos máximos"><input type="number" min={1} className={inputCls} value={f.intentosMax} onChange={(e) => setF({ ...f, intentosMax: Number(e.target.value) })} /></Campo>
          <Campo label="Inicio"><input type="datetime-local" className={inputCls} value={f.fechaInicio} onChange={(e) => setF({ ...f, fechaInicio: e.target.value })} /></Campo>
          <Campo label="Fin"><input type="datetime-local" className={inputCls} value={f.fechaFin} onChange={(e) => setF({ ...f, fechaFin: e.target.value })} /></Campo>
        </div>
        <Campo label="Mostrar resultados">
          <select className={inputCls} value={f.mostrarResultados} onChange={(e) => setF({ ...f, mostrarResultados: e.target.value as typeof f.mostrarResultados })}>
            <option value="nunca">Nunca</option><option value="al_entregar">Al entregar</option><option value="al_cerrar_examen">Al cerrar el examen</option>
          </select>
        </Campo>
        <div className="flex gap-6 my-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.aleatorizar} onChange={(e) => setF({ ...f, aleatorizar: e.target.checked })} /> Aleatorizar</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.permitePractica} onChange={(e) => setF({ ...f, permitePractica: e.target.checked })} /> Permitir práctica</label>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
          <Boton onClick={() => crear.mutate()} disabled={!f.titulo || !f.fechaInicio || !f.fechaFin || crear.isPending}>Crear</Boton>
        </div>
      </div>
    </div>
  )
}
