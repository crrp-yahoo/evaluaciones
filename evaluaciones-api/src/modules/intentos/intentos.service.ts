import { prisma } from '../../config/db'
import type { Prisma } from '@prisma/client'
import type { UsuarioAuth } from '../../middlewares/auth'
import { intentoNoPermitido, modoExamenSinFeedback, noEncontrado, prohibido, tiempoAgotado } from '../../utils/AppError'
import { asegurarEstudianteInscrito } from '../auth/authz'
import { aPreguntaParaIntento, aPreguntaConRetroalimentacion, type PreguntaDB } from './serializadores'
import { barajarConSemilla, nuevaSemilla } from './aleatorizar'
import { calcularFinLimite, dentroDeLimite, tiempoRestanteSeg } from './tiempo'
import { calificarPregunta, type PreguntaCalif, type TipoPregunta } from '../calificacion/calificacion'

type ModoIntento = 'examen' | 'practica'

// Carga la pregunta completa (con opciones) para calificación/serialización.
async function cargarPreguntas(ids: bigint[]): Promise<Map<string, PreguntaDB>> {
  const rows = await prisma.pregunta.findMany({ where: { id: { in: ids } }, include: { opciones: true } })
  return new Map(rows.map((p) => [p.id.toString(), p as unknown as PreguntaDB]))
}

function aPreguntaCalif(p: PreguntaDB): PreguntaCalif {
  return {
    tipo: p.tipo as TipoPregunta, puntaje: Number(p.puntaje),
    opciones: p.opciones.map((o) => ({ id: o.id.toString(), esCorrecta: o.esCorrecta })),
  }
}

// ─── Iniciar intento (Req 6.1-6.3, 7.1-7.2) ──────────────────────────────────
export async function iniciar(usuario: UsuarioAuth, examenId: bigint, modo: ModoIntento, soloFalladas = false, ip?: string, userAgent?: string) {
  const examen = await prisma.examen.findUnique({ where: { id: examenId }, include: { examenPreguntas: true } })
  if (!examen) throw noEncontrado('Examen no encontrado')
  if (examen.estado !== 'publicado') throw intentoNoPermitido('El examen no está publicado')
  await asegurarEstudianteInscrito(usuario, examen.cursoId)

  const ahora = new Date()

  if (modo === 'examen') {
    if (ahora < examen.fechaInicio || ahora > examen.fechaFin) throw intentoNoPermitido('Fuera de la ventana de disponibilidad')
  } else {
    if (!examen.permitePractica) throw intentoNoPermitido('Este examen no permite modo práctica')
  }

  // Transacción con "bloqueo" lógico para evitar intentos duplicados por doble clic.
  return prisma.$transaction(async (tx) => {
    // Reanudar intento en curso del mismo examen y modo (Req 6.3).
    const enCurso = await tx.intento.findFirst({
      where: { examenId, estudianteId: usuario.id, modo, estado: 'en_curso' },
      orderBy: { id: 'desc' },
    })
    if (enCurso) return armarVistaIntento(tx, enCurso.id)

    if (modo === 'examen') {
      // Contar intentos oficiales (la práctica no cuenta — Req 7.9).
      const usados = await tx.intento.count({ where: { examenId, estudianteId: usuario.id, modo: 'examen' } })
      if (usados >= examen.intentosMax) throw intentoNoPermitido('Has agotado el número máximo de intentos')
    }

    // Preguntas del examen; en práctica con soloFalladas, filtra las que falló antes.
    let preguntaIds = [...examen.examenPreguntas].sort((a, b) => a.orden - b.orden).map((ep) => ep.preguntaId)
    if (modo === 'practica' && soloFalladas) {
      const falladas = await tx.respuesta.findMany({
        where: { intento: { estudianteId: usuario.id, examenId }, esCorrecta: false },
        select: { preguntaId: true }, distinct: ['preguntaId'],
      })
      const set = new Set(falladas.map((f) => f.preguntaId.toString()))
      const filtradas = preguntaIds.filter((id) => set.has(id.toString()))
      if (filtradas.length) preguntaIds = filtradas
    }

    const semilla = nuevaSemilla()
    const orden = examen.aleatorizar ? barajarConSemilla(preguntaIds, semilla) : preguntaIds

    const finLimite = modo === 'examen' ? calcularFinLimite(ahora, examen.duracionMin, examen.fechaFin) : null

    const intento = await tx.intento.create({
      data: {
        examenId, estudianteId: usuario.id, modo, estado: 'en_curso', inicio: ahora,
        finLimite, ordenSemilla: semilla, ip: ip ?? null, userAgent: userAgent ?? null,
      },
    })

    // Snapshot inmutable de preguntas y su versión/orden (Req 4.4, 6.1).
    const versiones = await tx.pregunta.findMany({ where: { id: { in: preguntaIds } }, select: { id: true, version: true } })
    const vmap = new Map(versiones.map((v) => [v.id.toString(), v.version]))
    await tx.intentoPregunta.createMany({
      data: orden.map((pid, i) => ({ intentoId: intento.id, preguntaId: pid, version: vmap.get(pid.toString()) ?? 1, orden: i })),
    })

    return armarVistaIntento(tx, intento.id)
  })
}

// ─── Vista del intento (Req 6.4): preguntas SIN respuestas correctas + tiempo ──
async function armarVistaIntento(tx: Prisma.TransactionClient | typeof prisma, intentoId: bigint) {
  const intento = await tx.intento.findUnique({
    where: { id: intentoId },
    include: { intentoPreguntas: { orderBy: { orden: 'asc' } }, respuestas: true },
  })
  if (!intento) throw noEncontrado('Intento no encontrado')

  const ids = intento.intentoPreguntas.map((ip) => ip.preguntaId)
  const preguntas = await cargarPreguntas(ids)
  const ordenOpciones = (p: PreguntaDB) =>
    intento.examenId && intento.ordenSemilla
      ? barajarConSemilla(p.opciones.map((o) => o.id.toString()), intento.ordenSemilla + Number(p.id % 1000n))
      : undefined

  const preguntasDTO = intento.intentoPreguntas.map((ip) => {
    const p = preguntas.get(ip.preguntaId.toString())!
    return aPreguntaParaIntento(p, ordenOpciones(p))
  })

  const respuestas = intento.respuestas.map((r) => ({
    preguntaId: r.preguntaId.toString(),
    opcionesElegidas: (r.opcionesElegidas as string[] | null) ?? [],
    texto: r.texto,
  }))

  return {
    id: intento.id.toString(), examenId: intento.examenId.toString(), modo: intento.modo, estado: intento.estado,
    inicio: intento.inicio, finLimite: intento.finLimite,
    tiempoRestanteSeg: tiempoRestanteSeg(intento.finLimite),
    preguntas: preguntasDTO, respuestas,
  }
}

export async function obtener(usuario: UsuarioAuth, intentoId: bigint) {
  const intento = await prisma.intento.findUnique({ where: { id: intentoId }, select: { estudianteId: true } })
  if (!intento) throw noEncontrado('Intento no encontrado')
  if (intento.estudianteId !== usuario.id) throw prohibido('Este intento no te pertenece')
  return armarVistaIntento(prisma, intentoId)
}

// ─── Autoguardado idempotente (Req 6.5, 6.6) ──────────────────────────────────
export async function guardarRespuestas(usuario: UsuarioAuth, intentoId: bigint, respuestas: Array<{ preguntaId: bigint; opcionesElegidas?: string[]; texto?: string }>) {
  const intento = await prisma.intento.findUnique({ where: { id: intentoId } })
  if (!intento) throw noEncontrado('Intento no encontrado')
  if (intento.estudianteId !== usuario.id) throw prohibido('Este intento no te pertenece')
  if (intento.estado !== 'en_curso') throw intentoNoPermitido('El intento no está en curso')
  if (!dentroDeLimite(intento.finLimite)) throw tiempoAgotado()

  // Upsert por (intentoId, preguntaId) para idempotencia.
  for (const r of respuestas) {
    await prisma.respuesta.upsert({
      where: { intentoId_preguntaId: { intentoId, preguntaId: r.preguntaId } },
      update: { opcionesElegidas: r.opcionesElegidas ?? [], texto: r.texto ?? null },
      create: { intentoId, preguntaId: r.preguntaId, opcionesElegidas: r.opcionesElegidas ?? [], texto: r.texto ?? null },
    })
  }
  return { ok: true, guardadas: respuestas.length }
}

// ─── Entregar y calificar (Req 6.7, 8.1, 8.5) ─────────────────────────────────
export async function entregar(usuario: UsuarioAuth, intentoId: bigint) {
  const intento = await prisma.intento.findUnique({ where: { id: intentoId }, include: { intentoPreguntas: true, respuestas: true } })
  if (!intento) throw noEncontrado('Intento no encontrado')
  if (intento.estudianteId !== usuario.id) throw prohibido('Este intento no te pertenece')
  if (intento.estado !== 'en_curso') throw intentoNoPermitido('El intento ya fue entregado')
  return calificarIntento(intentoId)
}

// Calificación de un intento (reutilizable por el job de cierre). Idempotente.
export async function calificarIntento(intentoId: bigint) {
  return prisma.$transaction(async (tx) => {
    const intento = await tx.intento.findUnique({ where: { id: intentoId }, include: { intentoPreguntas: true, respuestas: true } })
    if (!intento || intento.estado !== 'en_curso') return { yaCerrado: true }

    const ids = intento.intentoPreguntas.map((ip) => ip.preguntaId)
    const preguntas = await cargarPreguntas(ids)
    const respByPreg = new Map(intento.respuestas.map((r) => [r.preguntaId.toString(), r]))

    let total = 0
    let hayPendiente = false

    for (const ip of intento.intentoPreguntas) {
      const p = preguntas.get(ip.preguntaId.toString())!
      const r = respByPreg.get(ip.preguntaId.toString())
      const elegidas = (r?.opcionesElegidas as string[] | null) ?? []
      const res = calificarPregunta(aPreguntaCalif(p), elegidas)
      if (res.requiereRevision) hayPendiente = true
      total += res.puntaje
      await tx.respuesta.upsert({
        where: { intentoId_preguntaId: { intentoId, preguntaId: ip.preguntaId } },
        update: { esCorrecta: res.esCorrecta, puntajeObtenido: res.puntaje },
        create: { intentoId, preguntaId: ip.preguntaId, opcionesElegidas: elegidas, esCorrecta: res.esCorrecta, puntajeObtenido: res.puntaje },
      })
    }

    const estado = hayPendiente ? 'pendiente_revision' : 'calificado'
    await tx.intento.update({
      where: { id: intentoId },
      data: { estado, entregadoEn: new Date(), calificacion: hayPendiente ? null : total },
    })
    return { estado, calificacion: hayPendiente ? null : total, pendienteRevision: hayPendiente }
  })
}

// ─── Responder en PRÁCTICA con retroalimentación (Req 7.3-7.6) ────────────────
export async function responderPractica(usuario: UsuarioAuth, intentoId: bigint, preguntaId: bigint, opcionesElegidas: string[], texto?: string) {
  const intento = await prisma.intento.findUnique({ where: { id: intentoId } })
  if (!intento) throw noEncontrado('Intento no encontrado')
  if (intento.estudianteId !== usuario.id) throw prohibido('Este intento no te pertenece')
  // GUARDIA CRÍTICA: la retroalimentación solo existe en práctica (Req 7.6).
  if (intento.modo !== 'practica') throw modoExamenSinFeedback()

  const p = (await prisma.pregunta.findUnique({ where: { id: preguntaId }, include: { opciones: true } })) as unknown as PreguntaDB | null
  if (!p) throw noEncontrado('Pregunta no encontrada')

  // Guarda la respuesta (idempotente).
  const res = calificarPregunta(aPreguntaCalif(p), opcionesElegidas)
  await prisma.respuesta.upsert({
    where: { intentoId_preguntaId: { intentoId, preguntaId } },
    update: { opcionesElegidas, texto: texto ?? null, esCorrecta: res.esCorrecta, puntajeObtenido: res.puntaje },
    create: { intentoId, preguntaId, opcionesElegidas, texto: texto ?? null, esCorrecta: res.esCorrecta, puntajeObtenido: res.puntaje },
  })

  const fb = aPreguntaConRetroalimentacion(p)
  const correctas = fb.opciones.filter((o) => o.esCorrecta)
  const elegidaOpcion = fb.opciones.find((o) => opcionesElegidas.includes(o.id))

  // Abierta en práctica: mostrar respuesta modelo, sin calificación automática (Req 7.10).
  if (p.tipo === 'abierta') {
    return { correcta: null, respuestaModelo: fb.respuestaModelo, explicacion: fb.explicacion }
  }

  return {
    correcta: res.esCorrecta,
    respuestaCorrecta: correctas.map((o) => ({ id: o.id, texto: o.texto })),
    explicacion: fb.explicacion,                                   // puede ser null (Req 7.5)
    explicacionOpcion: elegidaOpcion?.explicacion ?? null,          // explicación de lo que eligió (Req 7.4)
  }
}
