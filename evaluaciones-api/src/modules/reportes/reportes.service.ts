import { prisma } from '../../config/db'
import type { UsuarioAuth } from '../../middlewares/auth'
import { noEncontrado, prohibido, validacion } from '../../utils/AppError'
import { asegurarProfesorDelCurso } from '../auth/authz'
import { aPreguntaConRetroalimentacion, type PreguntaDB } from '../intentos/serializadores'

// ─── Resultado del estudiante respetando mostrar_resultados (Req 9.1) ─────────
export async function resultadoEstudiante(usuario: UsuarioAuth, intentoId: bigint) {
  const intento = await prisma.intento.findUnique({
    where: { id: intentoId },
    include: { examen: true, respuestas: true, intentoPreguntas: { orderBy: { orden: 'asc' } } },
  })
  if (!intento) throw noEncontrado('Intento no encontrado')
  if (intento.estudianteId !== usuario.id) throw prohibido('Este intento no te pertenece')

  const modo = intento.examen.mostrarResultados
  // En modo examen, si la política es 'nunca', no se revela nada de corrección.
  const puedeVerDetalle =
    intento.modo === 'practica' ||
    modo === 'al_entregar' ||
    (modo === 'al_cerrar_examen' && new Date() >= intento.examen.fechaFin)

  const base = {
    id: intento.id.toString(), modo: intento.modo, estado: intento.estado,
    calificacion: intento.calificacion != null ? Number(intento.calificacion) : null,
    entregadoEn: intento.entregadoEn,
  }
  if (!puedeVerDetalle) return { ...base, detalle: null, mensaje: 'Los resultados aún no están disponibles' }

  const ids = intento.intentoPreguntas.map((ip) => ip.preguntaId)
  const preguntas = await prisma.pregunta.findMany({ where: { id: { in: ids } }, include: { opciones: true } })
  const pmap = new Map(preguntas.map((p) => [p.id.toString(), p as unknown as PreguntaDB]))
  const rmap = new Map(intento.respuestas.map((r) => [r.preguntaId.toString(), r]))

  const detalle = intento.intentoPreguntas.map((ip) => {
    const fb = aPreguntaConRetroalimentacion(pmap.get(ip.preguntaId.toString())!)
    const r = rmap.get(ip.preguntaId.toString())
    return {
      pregunta: fb,
      respuesta: { opcionesElegidas: (r?.opcionesElegidas as string[] | null) ?? [], texto: r?.texto ?? null },
      esCorrecta: r?.esCorrecta ?? null,
      puntajeObtenido: r?.puntajeObtenido != null ? Number(r.puntajeObtenido) : null,
      comentarioProfesor: r?.comentarioProfesor ?? null,
    }
  })
  return { ...base, detalle }
}

// ─── Calificación manual de respuestas abiertas (Req 8.4) ─────────────────────
export async function calificarManual(usuario: UsuarioAuth, intentoId: bigint, preguntaId: bigint, puntaje: number, comentario?: string) {
  const intento = await prisma.intento.findUnique({ where: { id: intentoId }, include: { examen: true, intentoPreguntas: true } })
  if (!intento) throw noEncontrado('Intento no encontrado')
  await asegurarProfesorDelCurso(usuario, intento.examen.cursoId)

  const pregunta = await prisma.pregunta.findUnique({ where: { id: preguntaId } })
  if (!pregunta) throw noEncontrado('Pregunta no encontrada')
  if (puntaje < 0 || puntaje > Number(pregunta.puntaje)) throw validacion(`El puntaje debe estar entre 0 y ${pregunta.puntaje}`)

  await prisma.respuesta.upsert({
    where: { intentoId_preguntaId: { intentoId, preguntaId } },
    update: { puntajeObtenido: puntaje, esCorrecta: puntaje > 0, comentarioProfesor: comentario ?? null },
    create: { intentoId, preguntaId, puntajeObtenido: puntaje, esCorrecta: puntaje > 0, comentarioProfesor: comentario ?? null, opcionesElegidas: [] },
  })

  // Recalcula la nota; si ya no quedan abiertas sin calificar, pasa a 'calificado' (Req 8.4).
  return recalcular(intentoId)
}

async function recalcular(intentoId: bigint) {
  const intento = await prisma.intento.findUnique({ where: { id: intentoId }, include: { intentoPreguntas: true, respuestas: true } })
  if (!intento) throw noEncontrado('Intento no encontrado')
  const preguntas = await prisma.pregunta.findMany({ where: { id: { in: intento.intentoPreguntas.map((ip) => ip.preguntaId) } } })
  const abiertas = new Set(preguntas.filter((p) => p.tipo === 'abierta').map((p) => p.id.toString()))
  const rmap = new Map(intento.respuestas.map((r) => [r.preguntaId.toString(), r]))

  let total = 0
  let faltaCalificar = false
  for (const ip of intento.intentoPreguntas) {
    const r = rmap.get(ip.preguntaId.toString())
    if (abiertas.has(ip.preguntaId.toString()) && (!r || r.puntajeObtenido == null)) faltaCalificar = true
    total += r?.puntajeObtenido != null ? Number(r.puntajeObtenido) : 0
  }
  const estado = faltaCalificar ? 'pendiente_revision' : 'calificado'
  await prisma.intento.update({ where: { id: intentoId }, data: { estado, calificacion: faltaCalificar ? null : total } })
  return { estado, calificacion: faltaCalificar ? null : total }
}

// ─── Reportes del profesor (Req 9.2, 9.3) ─────────────────────────────────────
export async function resumenExamen(usuario: UsuarioAuth, examenId: bigint) {
  const examen = await prisma.examen.findUnique({ where: { id: examenId } })
  if (!examen) throw noEncontrado('Examen no encontrado')
  await asegurarProfesorDelCurso(usuario, examen.cursoId)

  const intentos = await prisma.intento.findMany({
    where: { examenId, modo: 'examen', estado: { in: ['entregado', 'calificado'] } },
    include: { estudiante: { select: { id: true, nombre: true, email: true } } },
  })
  const notas = intentos.map((i) => (i.calificacion != null ? Number(i.calificacion) : 0))
  const n = notas.length
  const promedio = n ? notas.reduce((a, b) => a + b, 0) / n : 0
  return {
    totalIntentos: n,
    promedio: Math.round(promedio * 100) / 100,
    maximo: n ? Math.max(...notas) : 0,
    minimo: n ? Math.min(...notas) : 0,
    calificaciones: intentos.map((i) => ({
      estudiante: i.estudiante.nombre, email: i.estudiante.email,
      calificacion: i.calificacion != null ? Number(i.calificacion) : null, estado: i.estado,
    })),
  }
}

// Porcentaje de acierto por pregunta (Req 9.3).
export async function aciertoPorPregunta(usuario: UsuarioAuth, examenId: bigint) {
  const examen = await prisma.examen.findUnique({ where: { id: examenId }, include: { examenPreguntas: { include: { pregunta: true } } } })
  if (!examen) throw noEncontrado('Examen no encontrado')
  await asegurarProfesorDelCurso(usuario, examen.cursoId)

  const salida = []
  for (const ep of examen.examenPreguntas) {
    const total = await prisma.respuesta.count({ where: { preguntaId: ep.preguntaId, intento: { examenId, modo: 'examen' } } })
    const correctas = await prisma.respuesta.count({ where: { preguntaId: ep.preguntaId, esCorrecta: true, intento: { examenId, modo: 'examen' } } })
    salida.push({
      preguntaId: ep.preguntaId.toString(),
      enunciado: ep.pregunta.enunciado,
      respuestas: total,
      correctas,
      porcentajeAcierto: total ? Math.round((correctas / total) * 1000) / 10 : null,
    })
  }
  return salida
}

// Intentos de un examen con conteo de eventos de integridad (Req 10.3).
export async function intentosDeExamen(usuario: UsuarioAuth, examenId: bigint) {
  const examen = await prisma.examen.findUnique({ where: { id: examenId } })
  if (!examen) throw noEncontrado('Examen no encontrado')
  await asegurarProfesorDelCurso(usuario, examen.cursoId)
  const intentos = await prisma.intento.findMany({
    where: { examenId },
    include: { estudiante: { select: { nombre: true, email: true } }, _count: { select: { eventos: true } } },
    orderBy: { id: 'desc' },
  })
  return intentos.map((i) => ({
    id: i.id.toString(), estudiante: i.estudiante.nombre, email: i.estudiante.email, modo: i.modo, estado: i.estado,
    calificacion: i.calificacion != null ? Number(i.calificacion) : null, eventosSospechosos: i._count.eventos,
    ip: i.ip, userAgent: i.userAgent,
  }))
}

// Exportación CSV de calificaciones (Req 9.4).
export async function exportarCsv(usuario: UsuarioAuth, examenId: bigint): Promise<string> {
  const resumen = await resumenExamen(usuario, examenId)
  const filas = [['estudiante', 'email', 'calificacion', 'estado']]
  for (const c of resumen.calificaciones) filas.push([c.estudiante, c.email, String(c.calificacion ?? ''), c.estado])
  return filas.map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
}

// Resumen de práctica por tema para el estudiante (Req 9.5, 7.7).
export async function resumenPractica(usuario: UsuarioAuth) {
  const respuestas = await prisma.respuesta.findMany({
    where: { intento: { estudianteId: usuario.id, modo: 'practica' }, esCorrecta: { not: null } },
    include: { intento: false },
  })
  // Agrupar por tema requiere la pregunta; cargamos sus temas.
  const preguntaIds = [...new Set(respuestas.map((r) => r.preguntaId))]
  const preguntas = await prisma.pregunta.findMany({ where: { id: { in: preguntaIds } }, select: { id: true, tema: true } })
  const tema = new Map(preguntas.map((p) => [p.id.toString(), p.tema ?? 'Sin tema']))

  const porTema = new Map<string, { total: number; correctas: number }>()
  for (const r of respuestas) {
    const t = tema.get(r.preguntaId.toString()) ?? 'Sin tema'
    const acc = porTema.get(t) ?? { total: 0, correctas: 0 }
    acc.total++
    if (r.esCorrecta) acc.correctas++
    porTema.set(t, acc)
  }
  return [...porTema.entries()].map(([t, v]) => ({
    tema: t, respondidas: v.total, correctas: v.correctas,
    porcentaje: v.total ? Math.round((v.correctas / v.total) * 1000) / 10 : 0,
  }))
}
