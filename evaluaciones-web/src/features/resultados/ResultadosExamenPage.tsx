import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { http, getAccessToken } from '../../api/cliente'
import { Card } from '../../components/ui'

interface Resumen { totalIntentos: number; promedio: number; maximo: number; minimo: number; calificaciones: Array<{ estudiante: string; email: string; calificacion: number | null; estado: string }> }
interface AciertoPreg { preguntaId: string; enunciado: string; respuestas: number; correctas: number; porcentajeAcierto: number | null }

export default function ResultadosExamenPage() {
  const { id = '' } = useParams()
  const { data: resumen } = useQuery({ queryKey: ['resumen', id], queryFn: () => http.get<Resumen>(`/examenes/${id}/reportes/resumen`) })
  const { data: preguntas } = useQuery({ queryKey: ['acierto', id], queryFn: () => http.get<AciertoPreg[]>(`/examenes/${id}/reportes/preguntas`) })

  async function exportarCsv() {
    const res = await fetch(`/api/v1/examenes/${id}/reportes/export.csv`, { headers: { Authorization: `Bearer ${getAccessToken()}` }, credentials: 'include' })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `calificaciones-${id}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const chart = (preguntas ?? []).map((p, i) => ({ nombre: `P${i + 1}`, acierto: p.porcentajeAcierto ?? 0 }))

  return (
    <div>
      <Link to="/examenes" className="text-sm text-blue-600 hover:underline">← Exámenes</Link>
      <div className="flex items-center justify-between my-2">
        <h1 className="text-2xl font-semibold">Resultados</h1>
        <button onClick={exportarCsv} className="text-sm text-blue-600 hover:underline">Exportar CSV</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-4 mb-4">
        {[['Intentos', resumen?.totalIntentos], ['Promedio', resumen?.promedio], ['Máximo', resumen?.maximo], ['Mínimo', resumen?.minimo]].map(([l, v]) => (
          <Card key={l as string}><div className="text-slate-500 text-sm">{l}</div><div className="text-2xl font-semibold">{v ?? '—'}</div></Card>
        ))}
      </div>
      <Card className="mb-4">
        <h2 className="font-medium mb-2">Acierto por pregunta (%)</h2>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer><BarChart data={chart}><XAxis dataKey="nombre" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="acierto" fill="#2563eb" /></BarChart></ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <h2 className="font-medium mb-2">Calificaciones</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b"><th className="py-2">Estudiante</th><th>Correo</th><th>Calificación</th><th>Estado</th></tr></thead>
          <tbody>
            {resumen?.calificaciones.map((c, i) => (
              <tr key={i} className="border-b last:border-0"><td className="py-2">{c.estudiante}</td><td>{c.email}</td><td>{c.calificacion ?? '—'}</td><td>{c.estado}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
