import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/cliente'
import type { Curso, Paginado, Pregunta, TipoPregunta } from '../../api/tipos'
import { Boton, Card, Campo, inputCls } from '../../components/ui'

const TIPOS: Array<{ v: TipoPregunta; l: string }> = [
  { v: 'opcion_multiple', l: 'Opción múltiple' },
  { v: 'seleccion_multiple', l: 'Selección múltiple' },
  { v: 'verdadero_falso', l: 'Verdadero / Falso' },
  { v: 'abierta', l: 'Respuesta abierta' },
]

export default function PreguntasPage() {
  const qc = useQueryClient()
  const { data: cursos } = useQuery({ queryKey: ['cursos'], queryFn: () => http.get<Curso[]>('/cursos') })
  const [filtro, setFiltro] = useState({ cursoId: '', tipo: '', q: '' })
  const { data, isLoading } = useQuery({
    queryKey: ['preguntas', filtro],
    queryFn: () => {
      const qs = new URLSearchParams({ pageSize: '100' })
      if (filtro.cursoId) qs.set('cursoId', filtro.cursoId)
      if (filtro.tipo) qs.set('tipo', filtro.tipo)
      if (filtro.q) qs.set('q', filtro.q)
      return http.get<Paginado<Pregunta>>(`/preguntas?${qs}`)
    },
  })
  const [abierto, setAbierto] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Banco de preguntas</h1>
        <Boton onClick={() => setAbierto(true)}>Nueva pregunta</Boton>
      </div>
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <select className={inputCls} value={filtro.cursoId} onChange={(e) => setFiltro({ ...filtro, cursoId: e.target.value })}>
            <option value="">Todos los cursos</option>
            {cursos?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select className={inputCls} value={filtro.tipo} onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value })}>
            <option value="">Todos los tipos</option>
            {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <input className={inputCls} placeholder="Buscar en enunciado…" value={filtro.q} onChange={(e) => setFiltro({ ...filtro, q: e.target.value })} />
        </div>
      </Card>

      {isLoading ? <p className="text-slate-500">Cargando…</p> : (
        <div className="space-y-2">
          {data?.rows.length === 0 ? <p className="text-slate-500">Sin preguntas.</p> :
            data?.rows.map((p) => (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500">{TIPOS.find((t) => t.v === p.tipo)?.l} · {p.puntaje} pto(s){p.tema ? ` · ${p.tema}` : ''}</div>
                    <div dangerouslySetInnerHTML={{ __html: p.enunciado }} />
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      {abierto && cursos && <EditorPregunta cursos={cursos} onClose={() => setAbierto(false)} onSaved={() => { setAbierto(false); qc.invalidateQueries({ queryKey: ['preguntas'] }) }} />}
    </div>
  )
}

function EditorPregunta({ cursos, onClose, onSaved }: { cursos: Curso[]; onClose: () => void; onSaved: () => void }) {
  const [tipo, setTipo] = useState<TipoPregunta>('opcion_multiple')
  const [cursoId, setCursoId] = useState(cursos[0]?.id ?? '')
  const [enunciado, setEnunciado] = useState('')
  const [puntaje, setPuntaje] = useState(1)
  const [tema, setTema] = useState('')
  const [explicacion, setExplicacion] = useState('')
  const [respuestaModelo, setRespuestaModelo] = useState('')
  const [opciones, setOpciones] = useState([
    { texto: '', esCorrecta: false, explicacion: '', orden: 0 },
    { texto: '', esCorrecta: false, explicacion: '', orden: 1 },
  ])
  const [err, setErr] = useState<string | null>(null)

  const esCerrada = tipo !== 'abierta'
  const vf = tipo === 'verdadero_falso'

  const guardar = useMutation({
    mutationFn: () => {
      const base = { cursoId: Number(cursoId), tipo, enunciado, puntaje, tema: tema || undefined, explicacion: explicacion || undefined }
      const body = esCerrada
        ? { ...base, opciones: (vf ? opciones.slice(0, 2) : opciones).map((o, i) => ({ ...o, orden: i, explicacion: o.explicacion || undefined })) }
        : { ...base, respuestaModelo: respuestaModelo || undefined }
      return http.post('/preguntas', body)
    },
    onSuccess: onSaved,
    onError: (e: unknown) => setErr(((e as { mensaje?: string }).mensaje) ?? 'No se pudo guardar'),
  })

  function setOpcion(i: number, patch: Partial<typeof opciones[number]>) {
    setOpciones((prev) => prev.map((o, idx) => idx === i ? { ...o, ...patch } : o))
  }
  function marcarCorrecta(i: number) {
    // Opción múltiple y V/F: solo una correcta.
    if (tipo === 'opcion_multiple' || vf) setOpciones((prev) => prev.map((o, idx) => ({ ...o, esCorrecta: idx === i })))
    else setOpcion(i, { esCorrecta: !opciones[i]!.esCorrecta })
  }

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4 z-10" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-3">Nueva pregunta</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Curso"><select className={inputCls} value={cursoId} onChange={(e) => setCursoId(e.target.value)}>{cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Campo>
          <Campo label="Tipo"><select className={inputCls} value={tipo} onChange={(e) => { setTipo(e.target.value as TipoPregunta); if (e.target.value === 'verdadero_falso') setOpciones([{ texto: 'Verdadero', esCorrecta: true, explicacion: '', orden: 0 }, { texto: 'Falso', esCorrecta: false, explicacion: '', orden: 1 }]) }}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select></Campo>
        </div>
        <Campo label="Enunciado"><textarea className={inputCls} rows={2} value={enunciado} onChange={(e) => setEnunciado(e.target.value)} /></Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Puntaje"><input type="number" min={0.5} step={0.5} className={inputCls} value={puntaje} onChange={(e) => setPuntaje(Number(e.target.value))} /></Campo>
          <Campo label="Tema (opcional)"><input className={inputCls} value={tema} onChange={(e) => setTema(e.target.value)} /></Campo>
        </div>
        <Campo label="Explicación general (modo práctica)"><textarea className={inputCls} rows={2} value={explicacion} onChange={(e) => setExplicacion(e.target.value)} /></Campo>

        {esCerrada ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">Opciones {tipo === 'seleccion_multiple' ? '(marca todas las correctas)' : '(marca la correcta)'}</div>
            {opciones.map((o, i) => (
              <div key={i} className="border rounded-lg p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input type={tipo === 'seleccion_multiple' ? 'checkbox' : 'radio'} name="correcta" checked={o.esCorrecta} onChange={() => marcarCorrecta(i)} aria-label={`Opción ${i + 1} correcta`} />
                  <input className={inputCls} placeholder={`Opción ${i + 1}`} value={o.texto} onChange={(e) => setOpcion(i, { texto: e.target.value })} disabled={vf} />
                </div>
                <input className={inputCls} placeholder="Explicación de esta opción (opcional)" value={o.explicacion} onChange={(e) => setOpcion(i, { explicacion: e.target.value })} />
              </div>
            ))}
            {!vf && <button className="text-blue-600 text-sm hover:underline" onClick={() => setOpciones([...opciones, { texto: '', esCorrecta: false, explicacion: '', orden: opciones.length }])}>+ Agregar opción</button>}
          </div>
        ) : (
          <Campo label="Respuesta modelo (se muestra en práctica)"><textarea className={inputCls} rows={2} value={respuestaModelo} onChange={(e) => setRespuestaModelo(e.target.value)} /></Campo>
        )}

        {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <Boton variant="secondary" onClick={onClose}>Cancelar</Boton>
          <Boton onClick={() => guardar.mutate()} disabled={!enunciado || guardar.isPending}>Guardar</Boton>
        </div>
      </div>
    </div>
  )
}
