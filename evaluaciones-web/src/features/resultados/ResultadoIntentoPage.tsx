import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../api/cliente'
import { Card } from '../../components/ui'

interface DetalleItem {
  pregunta: { id: string; enunciado: string; explicacion: string | null; opciones: Array<{ id: string; texto: string; esCorrecta: boolean }> }
  respuesta: { opcionesElegidas: string[]; texto: string | null }
  esCorrecta: boolean | null
  puntajeObtenido: number | null
  comentarioProfesor: string | null
}
interface Resultado { id: string; modo: string; estado: string; calificacion: number | null; detalle: DetalleItem[] | null; mensaje?: string }

export default function ResultadoIntentoPage() {
  const { id = '' } = useParams()
  const { data, isLoading } = useQuery({ queryKey: ['resultado', id], queryFn: () => http.get<Resultado>(`/intentos/${id}/resultado`) })

  if (isLoading || !data) return <p className="text-slate-500">Cargando…</p>

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/mis-examenes" className="text-sm text-blue-600 hover:underline">← Mis exámenes</Link>
      <h1 className="text-2xl font-semibold my-2">Resultado</h1>
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Estado: {data.estado}</span>
          <span className="text-2xl font-semibold">{data.calificacion != null ? data.calificacion : '—'}</span>
        </div>
        {data.mensaje && <p className="text-sm text-slate-500 mt-2">{data.mensaje}</p>}
      </Card>

      {data.detalle?.map((d, i) => (
        <Card key={d.pregunta.id} className={`mb-2 border-l-4 ${d.esCorrecta === true ? 'border-l-green-400' : d.esCorrecta === false ? 'border-l-red-400' : 'border-l-slate-300'}`}>
          <div className="text-xs text-slate-500">Pregunta {i + 1} · {d.puntajeObtenido ?? 0} pto(s)</div>
          <div className="font-medium mb-2" dangerouslySetInnerHTML={{ __html: d.pregunta.enunciado }} />
          <ul className="text-sm space-y-1">
            {d.pregunta.opciones.map((o) => (
              <li key={o.id} className={o.esCorrecta ? 'text-green-700' : d.respuesta.opcionesElegidas.includes(o.id) ? 'text-red-600' : ''}>
                {o.esCorrecta ? '✓ ' : d.respuesta.opcionesElegidas.includes(o.id) ? '✗ ' : '• '}{o.texto}
              </li>
            ))}
          </ul>
          {d.pregunta.explicacion && <p className="text-sm text-slate-600 mt-2">{d.pregunta.explicacion}</p>}
          {d.comentarioProfesor && <p className="text-sm text-blue-700 mt-1">Comentario: {d.comentarioProfesor}</p>}
        </Card>
      ))}
    </div>
  )
}
