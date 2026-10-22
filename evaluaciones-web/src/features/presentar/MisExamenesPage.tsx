import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { http } from '../../api/cliente'
import type { Examen, VistaIntento } from '../../api/tipos'
import { Boton, Card } from '../../components/ui'

export default function MisExamenesPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['disponibles'], queryFn: () => http.get<Examen[]>('/examenes/disponibles') })

  const iniciar = useMutation({
    mutationFn: ({ examenId, modo }: { examenId: string; modo: 'examen' | 'practica' }) =>
      http.post<VistaIntento>(`/examenes/${examenId}/intentos`, { modo }),
    onSuccess: (intento) => {
      if (intento.modo === 'practica') navigate(`/practica/${intento.id}`)
      else navigate(`/intentos/${intento.id}`)
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Mis exámenes</h1>
      {isLoading ? <p className="text-slate-500">Cargando…</p> : data?.length === 0 ? <p className="text-slate-500">No hay exámenes disponibles ahora.</p> : (
        <div className="space-y-2">
          {data?.map((e) => (
            <Card key={e.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{e.titulo}</div>
                  <div className="text-xs text-slate-500">{e.curso} · {e.duracionMin} min · cierra {new Date(e.fechaFin).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  {e.permitePractica && <Boton variant="secondary" onClick={() => iniciar.mutate({ examenId: e.id, modo: 'practica' })}>Practicar</Boton>}
                  <Boton onClick={() => iniciar.mutate({ examenId: e.id, modo: 'examen' })}>Presentar</Boton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
