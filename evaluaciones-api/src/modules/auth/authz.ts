import { prisma } from '../../config/db'
import { prohibido } from '../../utils/AppError'
import type { UsuarioAuth } from '../../middlewares/auth'

// ─────────────────────────────────────────────────────────────────────────────
// Autorización a nivel de objeto (Req 2.4, 3.4). Se evalúa SIEMPRE en el servidor.
// ─────────────────────────────────────────────────────────────────────────────

/** El admin pasa siempre; el profesor debe ser dueño del curso. */
export async function asegurarProfesorDelCurso(usuario: UsuarioAuth, cursoId: bigint): Promise<void> {
  if (usuario.rol === 'admin') return
  const curso = await prisma.curso.findUnique({ where: { id: cursoId } })
  if (!curso || curso.profesorId !== usuario.id) throw prohibido('No eres responsable de este curso')
}

/** El estudiante debe estar inscrito en el curso. */
export async function asegurarEstudianteInscrito(usuario: UsuarioAuth, cursoId: bigint): Promise<void> {
  const insc = await prisma.inscripcion.findUnique({
    where: { cursoId_estudianteId: { cursoId, estudianteId: usuario.id } },
  })
  if (!insc) throw prohibido('No estás inscrito en este curso')
}

/** El estudiante debe ser dueño del intento. */
export async function asegurarDuenoDelIntento(usuario: UsuarioAuth, intentoId: bigint): Promise<void> {
  const intento = await prisma.intento.findUnique({ where: { id: intentoId }, select: { estudianteId: true } })
  if (!intento || intento.estudianteId !== usuario.id) throw prohibido('Este intento no te pertenece')
}
