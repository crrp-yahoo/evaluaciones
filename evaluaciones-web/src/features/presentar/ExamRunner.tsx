import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../api/cliente'
import type { VistaIntento } from '../../api/tipos'
import { Boton, Card } from '../../components/ui'
import { formatearTiempo, guardarCola, leerCola, limpiarCola, fusionarRespuestas } from './runnerUtils'

export default function ExamRunner() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['intento', id], queryFn: () => http.get<VistaIntento>(`/intentos/${id}`) })

  const [respuestas, setRespuestas] = useState<Record<string, string[]>>({})
  const [restante, setRestante] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Inicializa respuestas y temporizador cuando llega el intento.
  useEffect(() => {
    if (!data) return
    const base: Record<string, string[]> = {}
    for (const r of data.respuestas) base[r.preguntaId] = r.opcionesElegidas
    // Recupera la cola local si existe (reconexión) — la local tiene prioridad.
    setRespuestas(fusionarRespuestas(base, leerCola(id)))
    setRestante(data.tiempoRestanteSeg)
  }, [data, id])

  // Cuenta regresiva basada en el tiempo del servidor.
  useEffect(() => {
    if (restante == null) return
    if (restante <= 0) { void entregar(); return }
    const t = setTimeout(() => setRestante((s) => (s == null ? s : s - 1)), 1000)
    return () => clearTimeout(t)
  }, [restante]) // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = useCallback(async (next: Record<string, string[]>) => {
    guardarCola(id, next)
    setGuardando(true)
    try {
      const payload = Object.entries(next).map(([preguntaId, opcionesElegidas]) => ({ preguntaId: Number(preguntaId), opcionesElegidas }))
      if (payload.length) await http.put(`/intentos/${id}/respuestas`, { respuestas: payload })
      limpiarCola(id) // confirmado en servidor
    } catch { /* se reintentará; queda en localStorage */ }
    finally { setGuardando(false) }
  }, [id])

  function marcar(preguntaId: string, opcionId: string, multiple: boolean) {
    setRespuestas((prev) => {
      const actual = prev[preguntaId] ?? []
      const next = { ...prev, [preguntaId]: multiple ? (actual.includes(opcionId) ? actual.filter((o) => o !== opcionId) : [...actual, opcionId]) : [opcionId] }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => void guardar(next), 1500) // debounce
      return next
    })
  }

  // Detección de pérdida de foco / cambio de pestaña (Req 10.2).
  useEffect(() => {
    const reportar = (tipo: string) => () => { void http.post(`/intentos/${id}/eventos`, { tipo }).catch(() => {}) }
    const onVis = () => { if (document.hidden) reportar('cambio_pestana')() }
    const onBlur = reportar('perdida_foco')
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('blur', onBlur)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', onBlur) }
  }, [id])

  async function entregar() {
    await guardar(respuestas)
    await http.post(`/intentos/${id}/entregar`).catch(() => {})
    navigate(`/intentos/${id}/resultado`)
  }

  if (isLoading || !data) return <p className="text-slate-500">Cargando intento…</p>

  const tiempo = formatearTiempo(restante)

  return (
    <div>
      <div className="sticky top-0 bg-slate-50 py-2 flex items-center justify-between z-10">
        <h1 className="text-xl font-semibold">Examen en curso</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{guardando ? 'Guardando…' : 'Guardado'}</span>
          <span aria-live="polite" className="font-mono text-lg px-3 py-1 rounded-lg bg-white border">{tiempo}</span>
        </div>
      </div>
      <div className="space-y-4 mt-3">
        {data.preguntas.map((p, i) => {
          const multiple = p.tipo === 'seleccion_multiple'
          const abierta = p.tipo === 'abierta'
          return (
            <Card key={p.id}>
              <div className="text-xs text-slate-500 mb-1">Pregunta {i + 1} · {p.puntaje} pto(s)</div>
              <div className="font-medium mb-3" dangerouslySetInnerHTML={{ __html: p.enunciado }} />
              {abierta ? (
                <textarea className="w-full border rounded-lg px-3 py-2" rows={3}
                  onChange={(e) => { const next = { ...respuestas }; (next as Record<string, unknown>)[p.id] = []; marcarTexto(p.id, e.target.value) }} />
              ) : (
                <div className="space-y-2">
                  {p.opciones.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 cursor-pointer">
                      <input type={multiple ? 'checkbox' : 'radio'} name={`p-${p.id}`}
                        checked={(respuestas[p.id] ?? []).includes(o.id)} onChange={() => marcar(p.id, o.id, multiple)} />
                      <span>{o.texto}</span>
                    </label>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>
      <div className="flex justify-end mt-4">
        <Boton onClick={entregar}>Entregar examen</Boton>
      </div>
    </div>
  )

  // Autoguardado de texto para preguntas abiertas.
  function marcarTexto(preguntaId: string, texto: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void http.put(`/intentos/${id}/respuestas`, { respuestas: [{ preguntaId: Number(preguntaId), texto }] }).catch(() => {})
    }, 1500)
  }
}
