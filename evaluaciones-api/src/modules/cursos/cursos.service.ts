import { prisma } from '../../config/db'
import type { UsuarioAuth } from '../../middlewares/auth'
import { noEncontrado, validacion } from '../../utils/AppError'
import { asegurarProfesorDelCurso } from '../auth/authz'

const serializar = (c: { id: bigint; nombre: string; profesorId: bigint }) => ({
  id: c.id.toString(), nombre: c.nombre, profesorId: c.profesorId.toString(),
})

// Lista cursos: admin ve todos; profesor solo los suyos (Req 2.4).
export async function listar(usuario: UsuarioAuth) {
  const where = usuario.rol === 'admin' ? {} : { profesorId: usuario.id }
  const rows = await prisma.curso.findMany({ where, orderBy: { id: 'desc' } })
  return rows.map(serializar)
}

export async function crear(usuario: UsuarioAuth, nombre: string, profesorId?: bigint) {
  // El profesor se asigna a sí mismo; el admin puede indicar el profesor responsable.
  const pid = usuario.rol === 'admin' ? (profesorId ?? usuario.id) : usuario.id
  const profe = await prisma.usuario.findUnique({ where: { id: pid } })
  if (!profe || (profe.rol !== 'profesor' && profe.rol !== 'admin')) throw validacion('El responsable debe ser un profesor')
  const c = await prisma.curso.create({ data: { nombre: nombre.trim(), profesorId: pid } })
  return serializar(c)
}

export async function actualizar(usuario: UsuarioAuth, id: bigint, nombre: string) {
  await asegurarProfesorDelCurso(usuario, id)
  const c = await prisma.curso.update({ where: { id }, data: { nombre: nombre.trim() } })
  return serializar(c)
}

export async function eliminar(usuario: UsuarioAuth, id: bigint) {
  await asegurarProfesorDelCurso(usuario, id)
  await prisma.curso.delete({ where: { id } })
}

// ── Inscripciones (Req 3.2: sin duplicados) ──────────────────────────────────
export async function inscribir(usuario: UsuarioAuth, cursoId: bigint, estudianteId: bigint) {
  await asegurarProfesorDelCurso(usuario, cursoId)
  const est = await prisma.usuario.findUnique({ where: { id: estudianteId } })
  if (!est || est.rol !== 'estudiante') throw validacion('El usuario a inscribir debe ser estudiante')
  const existe = await prisma.inscripcion.findUnique({
    where: { cursoId_estudianteId: { cursoId, estudianteId } },
  })
  if (existe) throw validacion('El estudiante ya está inscrito en este curso')
  await prisma.inscripcion.create({ data: { cursoId, estudianteId } })
}

export async function desinscribir(usuario: UsuarioAuth, cursoId: bigint, estudianteId: bigint) {
  await asegurarProfesorDelCurso(usuario, cursoId)
  const existe = await prisma.inscripcion.findUnique({ where: { cursoId_estudianteId: { cursoId, estudianteId } } })
  if (!existe) throw noEncontrado('El estudiante no está inscrito')
  await prisma.inscripcion.delete({ where: { cursoId_estudianteId: { cursoId, estudianteId } } })
}

export async function estudiantesDeCurso(usuario: UsuarioAuth, cursoId: bigint) {
  await asegurarProfesorDelCurso(usuario, cursoId)
  const insc = await prisma.inscripcion.findMany({
    where: { cursoId }, include: { estudiante: { select: { id: true, nombre: true, email: true } } },
  })
  return insc.map((i) => ({ id: i.estudiante.id.toString(), nombre: i.estudiante.nombre, email: i.estudiante.email }))
}

// Cursos del usuario actual (Req 3.3): profesor → los suyos; estudiante → inscritos.
export async function misCursos(usuario: UsuarioAuth) {
  if (usuario.rol === 'estudiante') {
    const insc = await prisma.inscripcion.findMany({ where: { estudianteId: usuario.id }, include: { curso: true } })
    return insc.map((i) => serializar(i.curso))
  }
  const rows = await prisma.curso.findMany({ where: { profesorId: usuario.id }, orderBy: { id: 'desc' } })
  return rows.map(serializar)
}
