import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { http } from '../../api/cliente'
import { Card } from '../../components/ui'

interface TemaStat { tema: string; respondidas: number; correctas: number; porcentaje: number }

// Estadísticas de práctica por tema para el estudiante (Req 9.5).
export default function EstadisticasPractica() {
  const { data, isLoading } = useQuery({ queryKey: ['practica-resumen'], queryFn: () => http.get<TemaStat[]>('/practica/resumen') })

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/mis-examenes" className="text-sm text-blue-600 hover:underline">← Mis exámenes</Link>
      <h1 className="text-2xl font-semibold my-2">Mi práctica por tema</h1>
      {isLoading ? <p className="text-slate-500">Cargando…</p> : !data || data.length === 0 ? (
        <p className="text-slate-500">Aún no has practicado. Inicia una práctica desde tus exámenes.</p>
      ) : (
        <>
          <Card className="mb-4">
            <h2 className="font-medium mb-2">Porcentaje de acierto por tema</h2>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={data}>
                  <XAxis dataKey="tema" /><YAxis domain={[0, 100]} /><Tooltip />
                  <Bar dataKey="porcentaje" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b"><th className="py-2">Tema</th><th>Respondidas</th><th>Correctas</th><th>% Acierto</th></tr></thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.tema} className="border-b last:border-0">
                    <td className="py-2">{t.tema}</td><td>{t.respondidas}</td><td>{t.correctas}</td><td>{t.porcentaje}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
