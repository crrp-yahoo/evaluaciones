import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import LoginPage from '../features/auth/LoginPage'
import Dashboard from '../features/Dashboard'
import UsuariosPage from '../features/admin/UsuariosPage'
import CursosPage from '../features/cursos/CursosPage'
import PreguntasPage from '../features/preguntas/PreguntasPage'
import ExamenesPage from '../features/examenes/ExamenesPage'
import ExamenPreguntasPage from '../features/examenes/ExamenPreguntasPage'
import ResultadosExamenPage from '../features/resultados/ResultadosExamenPage'
import MisExamenesPage from '../features/presentar/MisExamenesPage'
import ExamRunner from '../features/presentar/ExamRunner'
import PracticeRunner from '../features/practica/PracticeRunner'
import EstadisticasPractica from '../features/practica/EstadisticasPractica'
import ResultadoIntentoPage from '../features/resultados/ResultadoIntentoPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          {/* Admin */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/usuarios" element={<UsuariosPage />} />
          </Route>
          {/* Profesor / admin */}
          <Route element={<ProtectedRoute roles={['admin', 'profesor']} />}>
            <Route path="/cursos" element={<CursosPage />} />
            <Route path="/preguntas" element={<PreguntasPage />} />
            <Route path="/examenes" element={<ExamenesPage />} />
            <Route path="/examenes/:id/preguntas" element={<ExamenPreguntasPage />} />
            <Route path="/examenes/:id/resultados" element={<ResultadosExamenPage />} />
          </Route>
          {/* Estudiante */}
          <Route element={<ProtectedRoute roles={['estudiante']} />}>
            <Route path="/mis-examenes" element={<MisExamenesPage />} />
            <Route path="/practica/estadisticas" element={<EstadisticasPractica />} />
            <Route path="/intentos/:id" element={<ExamRunner />} />
            <Route path="/practica/:id" element={<PracticeRunner />} />
            <Route path="/intentos/:id/resultado" element={<ResultadoIntentoPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
