import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../api/cliente'
import type { FeedbackPractica, VistaIntento } from '../../api/tipos'
import { Boton, Card } from '../../components/ui'

export default function PracticeRunner() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['practica', id], queryFn: () => http.get<VistaIntento>(`/intentos/${id}`) })
  const [idx, setIdx] = useState(0)
  const [sel, setSel] = useState<string[]>([])
  const [texto, setTexto] = useState('')
  const [fb, setFb] = useState<FeedbackPractica | null>(null)
  const [aciertos, setAciertos] = useState(0)
  const [respondidas, setRespondidas] = useState(0)

  if (isLoading || !data) return <p className="text-slate-500">Cargando práctica…</p>
  const p = data.preguntas[idx]
  if (!p) return null
  const multiple = p.tipo === 'seleccion_multiple'
  const abierta = p.tipo === 'abierta'
  const esFin = idx >= data.preguntas.length - 1

  async function comprobar() {
    const res = await http.post<FeedbackPractica>(`/intentos/${id}/preguntas/${p!.id}/responder`, { opcionesElegidas: sel, texto: abierta ? texto : undefined })
    setFb(res)
    setRespondidas((n) => n + 1)
    if (res.correcta) setAciertos((n) => n + 1)
  }
  function siguiente() {
    setFb(null); setSel([]); setTexto('')
    if (esFin) navigate(`/intentos/${id}/resultado`)
    else setIdx((i) => i + 1)
  }
  function marcar(opcionId: string) {
    if (fb) return
    setSel((prev) => multiple ? (prev.includes(opcionId) ? prev.filter((o) => o !== opcionId) : [...prev, opcionId]) : [opcionId])
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Práctica</h1>
        <span className="text-sm text-slate-500">Pregunta {idx + 1} de {data.preguntas.length} · {aciertos}/{respondidas} aciertos</span>
      </div>
      <Card>
        <div className="font-medium mb-3" dangerouslySetInnerHTML={{ __html: p.enunciado }} />
        {abierta ? (
          <textarea className="w-full border rounded-lg px-3 py-2" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} disabled={!!fb} />
        ) : (
          <div className="space-y-2">
            {p.opciones.map((o) => {
              const elegida = sel.includes(o.id)
              const esCorrecta = fb?.respuestaCorrecta?.some((r) => r.id === o.id)
              const cls = fb ? (esCorrecta ? 'bg-green-50 border-green-300' : elegida ? 'bg-red-50 border-red-300' : '') : elegida ? 'bg-blue-50 border-blue-300' : ''
              return (
                <label key={o.id} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer ${cls}`}>
                  <input type={multiple ? 'checkbox' : 'radio'} name={`p-${p.id}`} checked={elegida} onChange={() => marcar(o.id)} disabled={!!fb} />
                  <span>{o.texto}</span>
                </label>
              )
            })}
          </div>
        )}
      </Card>

      {fb && <FeedbackPanel fb={fb} />}

      <div className="flex justify-end mt-4">
        {!fb ? <Boton onClick={comprobar} disabled={!abierta && sel.length === 0}>Comprobar</Boton>
          : <Boton onClick={siguiente}>{esFin ? 'Ver resumen' : 'Siguiente'}</Boton>}
      </div>
    </div>
  )
}

function FeedbackPanel({ fb }: { fb: FeedbackPractica }) {
  const correcta = fb.correcta === true
  const abierta = fb.correcta === null
  return (
    <div aria-live="polite" className={`mt-3 rounded-xl p-4 border ${abierta ? 'bg-slate-50 border-slate-200' : correcta ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
      <div className="font-medium mb-1">{abierta ? 'Respuesta modelo' : correcta ? '✓ ¡Correcto!' : '✗ Incorrecto'}</div>
      {!abierta && fb.respuestaCorrecta && (
        <p className="text-sm">Respuesta correcta: <strong>{fb.respuestaCorrecta.map((r) => r.texto).join(', ')}</strong></p>
      )}
      {abierta && fb.respuestaModelo && <p className="text-sm">{fb.respuestaModelo}</p>}
      {fb.explicacion && <p className="text-sm mt-1 text-slate-700">{fb.explicacion}</p>}
      {fb.explicacionOpcion && <p className="text-sm mt-1 text-slate-600">Sobre tu respuesta: {fb.explicacionOpcion}</p>}
    </div>
  )
}
