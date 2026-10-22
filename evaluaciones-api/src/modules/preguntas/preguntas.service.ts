import { prisma } from '../../config/db'
import type { Prisma, TipoPregunta } from '@prisma/client'
import type { UsuarioAuth } from '../../middlewares/auth'
import { noEncontrado, prohibido } from '../../utils/AppError'
import { asegurarProfesorDelCurso } from '../auth/authz'
import { sanitizar } from '../../utils/sanitizar'
import type { CrearPregunta } from './preguntas.schema'

// Forma de una opción de entrada (desde el schema Zod ya parseado).
interface OpcionInput { texto: string; esCorrecta: boolean; explicacion?: string; orden: number }

function serializar(p: Prisma.PreguntaGetPayload<{ include: { opciones: true } }>) {
  return {
    id: p.id.toString(), cursoId: p.cursoId.toString(), autorId: p.autorId.toString(),
    tipo: p.tipo, enunciado: p.enunciado, puntaje: Number(p.puntaje),
    explicacion: p.explicacion, respuestaModelo: p.respuestaModelo, version: p.version, tema: p.tema,
    opciones: p.opciones.sort((a, b) => a.orden - b.orden).map((o) => ({
      id: o.id.toString(), texto: o.texto, esCorrecta: o.esCorrecta, explicacion: o.explicacion, orden: o.orden,
    })),
  }
}

export async function listar(usuario: UsuarioAuth, f: {
  page: number; pageSize: number; cursoId?: bigint; tema?: string; tipo?: TipoPregunta; q?: string
}) {
  const where: Prisma.PreguntaWhereInput = {}
  // Profesor: solo preguntas de sus cursos (Req 2.4). Admin: todas.
  if (usuario.rol !== 'admin') where.curso = { profesorId: usuario.id }
  if (f.cursoId) where.cursoId = f.cursoId
  if (f.tema) where.tema = { contains: f.tema }
  if (f.tipo) where.tipo = f.tipo
  if (f.q) where.enunciado = { contains: f.q }

  const [rows, total] = await Promise.all([
    prisma.pregunta.findMany({ where, include: { opciones: true }, orderBy: { id: 'desc' }, skip: (f.page - 1) * f.pageSize, take: f.pageSize }),
    prisma.pregunta.count({ where }),
  ])
  return { rows: rows.map(serializar), total, page: f.page, pageSize: f.pageSize, totalPages: Math.max(1, Math.ceil(total / f.pageSize)) }
}

export async function obtener(usuario: UsuarioAuth, id: bigint) {
  const p = await prisma.pregunta.findUnique({ where: { id }, include: { opciones: true } })
  if (!p) throw noEncontrado('Pregunta no encontrada')
  await asegurarProfesorDelCurso(usuario, p.cursoId)
  return serializar(p)
}

export async function crear(usuario: UsuarioAuth, data: CrearPregunta) {
  await asegurarProfesorDelCurso(usuario, data.cursoId)
  const opciones: OpcionInput[] = 'opciones' in data ? (data.opciones as OpcionInput[]) : []
  const p = await prisma.pregunta.create({
    data: {
      cursoId: data.cursoId, autorId: usuario.id, tipo: data.tipo,
      enunciado: sanitizar(data.enunciado)!, puntaje: data.puntaje,
      explicacion: sanitizar(data.explicacion), tema: data.tema?.trim() || null,
      respuestaModelo: 'respuestaModelo' in data ? (data.respuestaModelo?.trim() || null) : null,
      opciones: opciones.length ? { create: opciones.map((o) => ({
        texto: sanitizar(o.texto)!, esCorrecta: o.esCorrecta, explicacion: sanitizar(o.explicacion), orden: o.orden,
      })) } : undefined,
    },
    include: { opciones: true },
  })
  return serializar(p)
}

/**
 * Edita una pregunta. Si ya fue usada en intentos finalizados, guarda una copia
 * inmutable de la versión anterior e incrementa `version` (Req 4.4).
 * Solo el autor (o admin) puede editar (Req 4.6).
 */
export async function actualizar(usuario: UsuarioAuth, id: bigint, data: CrearPregunta) {
  const actual = await prisma.pregunta.findUnique({ where: { id }, include: { opciones: true } })
  if (!actual) throw noEncontrado('Pregunta no encontrada')
  if (usuario.rol !== 'admin' && actual.autorId !== usuario.id) throw prohibido('Solo el autor puede editar esta pregunta')

  const usadaEnIntentosFinalizados = await prisma.intentoPregunta.count({
    where: { preguntaId: id, intento: { estado: { in: ['entregado', 'calificado', 'pendiente_revision'] } } },
  })

  const opciones: OpcionInput[] = 'opciones' in data ? (data.opciones as OpcionInput[]) : []

  const actualizada = await prisma.$transaction(async (tx) => {
    if (usadaEnIntentosFinalizados > 0) {
      // Snapshot de la versión vigente antes de modificar.
      await tx.preguntaHistorial.create({
        data: {
          preguntaId: id, version: actual.version,
          contenido: {
            enunciado: actual.enunciado, tipo: actual.tipo, puntaje: actual.puntaje.toString(),
            explicacion: actual.explicacion, respuestaModelo: actual.respuestaModelo, tema: actual.tema,
            opciones: actual.opciones.map((o) => ({ texto: o.texto, esCorrecta: o.esCorrecta, explicacion: o.explicacion, orden: o.orden })),
          } as object,
        },
      })
    }
    // Reemplaza opciones.
    await tx.opcion.deleteMany({ where: { preguntaId: id } })
    return tx.pregunta.update({
      where: { id },
      data: {
        tipo: data.tipo, enunciado: sanitizar(data.enunciado)!, puntaje: data.puntaje,
        explicacion: sanitizar(data.explicacion), tema: data.tema?.trim() || null,
        respuestaModelo: 'respuestaModelo' in data ? (data.respuestaModelo?.trim() || null) : null,
        version: usadaEnIntentosFinalizados > 0 ? actual.version + 1 : actual.version,
        opciones: opciones.length ? { create: opciones.map((o) => ({
          texto: sanitizar(o.texto)!, esCorrecta: o.esCorrecta, explicacion: sanitizar(o.explicacion), orden: o.orden,
        })) } : undefined,
      },
      include: { opciones: true },
    })
  })
  return serializar(actualizada)
}

export async function eliminar(usuario: UsuarioAuth, id: bigint) {
  const p = await prisma.pregunta.findUnique({ where: { id } })
  if (!p) throw noEncontrado('Pregunta no encontrada')
  if (usuario.rol !== 'admin' && p.autorId !== usuario.id) throw prohibido('Solo el autor puede eliminar esta pregunta')
  const usada = await prisma.examenPregunta.count({ where: { preguntaId: id } })
  if (usada > 0) throw prohibido('La pregunta está asignada a un examen; no se puede eliminar')
  await prisma.pregunta.delete({ where: { id } })
}
