import { prisma } from '../../config/db'
import type { Prisma } from '@prisma/client'
import type { UsuarioAuth } from '../../middlewares/auth'
import { noEncontrado, prohibido, validacion, intentoNoPermitido } from '../../utils/AppError'
import { asegurarProfesorDelCurso } from '../auth/authz'

function serializar(e: Prisma.ExamenGetPayload<{ include: { examenPreguntas: true } }>) {
  return {
    id: e.id.toString(), cursoId: e.cursoId.toString(), titulo: e.titulo, instrucciones: e.instrucciones,
    duracionMin: e.duracionMin, fechaInicio: e.fechaInicio, fechaFin: e.fechaFin, intentosMax: e.intentosMax,
    aleatorizar: e.aleatorizar, permitePractica: e.permitePractica, mostrarResultados: e.mostrarResultados,
    estado: e.estado, preguntas: e.examenPreguntas.length,
  }
}

// Verifica que no haya intentos OFICIALES entregados (bloquea edición, Req 5.5).
async function tieneIntentosOficialesEntregados(examenId: bigint): Promise<boolean> {
  const n = await prisma.intento.count({
    where: { examenId, modo: 'examen', estado: { in: ['entregado', 'calificado', 'pendiente_revision'] } },
  })
  return n > 0
}

export async function listar(usuario: UsuarioAuth, cursoId?: bigint) {
  const where: Prisma.ExamenWhereInput = {}
  if (usuario.rol !== 'admin') where.curso = { profesorId: usuario.id }
  if (cursoId) where.cursoId = cursoId
  const rows = await prisma.examen.findMany({ where, include: { examenPreguntas: true }, orderBy: { id: 'desc' } })
  return rows.map(serializar)
}

export async function obtener(usuario: UsuarioAuth, id: bigint) {
  const e = await prisma.examen.findUnique({ where: { id }, include: { examenPreguntas: true } })
  if (!e) throw noEncontrado('Examen no encontrado')
  await asegurarProfesorDelCurso(usuario, e.cursoId)
  return serializar(e)
}

export async function crear(usuario: UsuarioAuth, data: Prisma.ExamenUncheckedCreateInput & { cursoId: bigint }) {
  await asegurarProfesorDelCurso(usuario, data.cursoId)
  const e = await prisma.examen.create({ data: { ...data, estado: 'borrador' }, include: { examenPreguntas: true } })
  return serializar(e)
}

export async function actualizar(usuario: UsuarioAuth, id: bigint, data: Prisma.ExamenUpdateInput) {
  const e = await prisma.examen.findUnique({ where: { id } })
  if (!e) throw noEncontrado('Examen no encontrado')
  await asegurarProfesorDelCurso(usuario, e.cursoId)
  if (await tieneIntentosOficialesEntregados(id)) throw prohibido('El examen ya tiene intentos entregados; no se puede modificar')
  const upd = await prisma.examen.update({ where: { id }, data, include: { examenPreguntas: true } })
  return serializar(upd)
}

// Asigna preguntas con su orden y puntaje opcional (Req 5.1). Bloquea si hay intentos (Req 5.5).
export async function definirPreguntas(usuario: UsuarioAuth, id: bigint, preguntas: Array<{ preguntaId: bigint; orden: number; puntaje?: number }>) {
  const e = await prisma.examen.findUnique({ where: { id } })
  if (!e) throw noEncontrado('Examen no encontrado')
  await asegurarProfesorDelCurso(usuario, e.cursoId)
  if (await tieneIntentosOficialesEntregados(id)) throw prohibido('El examen ya tiene intentos entregados; no se pueden cambiar las preguntas')

  // Todas las preguntas deben existir y pertenecer al mismo curso del examen.
  const ids = preguntas.map((p) => p.preguntaId)
  const existentes = await prisma.pregunta.findMany({ where: { id: { in: ids } }, select: { id: true, cursoId: true } })
  if (existentes.length !== ids.length) throw validacion('Alguna pregunta no existe')
  if (existentes.some((p) => p.cursoId !== e.cursoId)) throw validacion('Todas las preguntas deben ser del mismo curso del examen')

  await prisma.$transaction(async (tx) => {
    await tx.examenPregunta.deleteMany({ where: { examenId: id } })
    await tx.examenPregunta.createMany({
      data: preguntas.map((p) => ({ examenId: id, preguntaId: p.preguntaId, orden: p.orden, puntaje: p.puntaje ?? null })),
    })
  })
  return obtener(usuario, id)
}

// Publica el examen validando preguntas y fechas coherentes (Req 5.6).
export async function publicar(usuario: UsuarioAuth, id: bigint) {
  const e = await prisma.examen.findUnique({ where: { id }, include: { examenPreguntas: true } })
  if (!e) throw noEncontrado('Examen no encontrado')
  await asegurarProfesorDelCurso(usuario, e.cursoId)
  if (e.examenPreguntas.length === 0) throw intentoNoPermitido('El examen debe tener al menos una pregunta')
  if (e.fechaFin <= e.fechaInicio) throw intentoNoPermitido('Las fechas del examen no son coherentes')
  const upd = await prisma.examen.update({ where: { id }, data: { estado: 'publicado' }, include: { examenPreguntas: true } })
  return serializar(upd)
}

// Exámenes disponibles para el estudiante: publicados, de sus cursos y en ventana (Req 3.3, 3.4).
export async function disponiblesParaEstudiante(usuario: UsuarioAuth) {
  const ahora = new Date()
  const rows = await prisma.examen.findMany({
    where: {
      estado: 'publicado',
      fechaInicio: { lte: ahora },
      fechaFin: { gte: ahora },
      curso: { inscripciones: { some: { estudianteId: usuario.id } } },
    },
    include: { examenPreguntas: true, curso: { select: { nombre: true } } },
    orderBy: { fechaFin: 'asc' },
  })
  return rows.map((e) => ({ ...serializar(e), curso: e.curso.nombre }))
}
