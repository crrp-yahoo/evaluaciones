import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/errorHandler'
import { validate } from '../../middlewares/validate'
import { autenticar, requerirRol } from '../../middlewares/auth'
import { prisma } from '../../config/db'
import { noEncontrado, prohibido } from '../../utils/AppError'
import * as svc from './intentos.service'

export const examenesIntentosRouter = Router({ mergeParams: true }) // montado bajo /examenes/:id/intentos
export const intentosRouter = Router()

const soloEstudiante = requerirRol('estudiante')

// POST /examenes/:id/intentos — iniciar (examen o práctica)
const iniciarBody = z.object({ modo: z.enum(['examen', 'practica']), soloFalladas: z.boolean().optional() })
examenesIntentosRouter.post('/:id/intentos', autenticar, soloEstudiante, validate({ body: iniciarBody }), asyncHandler(async (req, res) => {
  const examenId = BigInt(req.params.id!)
  const { modo, soloFalladas } = req.body as z.infer<typeof iniciarBody>
  const ip = req.ip
  const ua = req.headers['user-agent']?.slice(0, 255)
  res.status(201).json(await svc.iniciar(req.usuario!, examenId, modo, soloFalladas, ip, ua))
}))

intentosRouter.use(autenticar, soloEstudiante)
const idParam = z.object({ id: z.coerce.bigint() })

// GET /intentos/:id
intentosRouter.get('/:id', validate({ params: idParam }), asyncHandler(async (req, res) => {
  res.json(await svc.obtener(req.usuario!, BigInt(req.params.id!)))
}))

// PUT /intentos/:id/respuestas — autoguardado
const respuestasBody = z.object({
  respuestas: z.array(z.object({
    preguntaId: z.coerce.bigint(),
    opcionesElegidas: z.array(z.string()).optional(),
    texto: z.string().optional(),
  })).min(1),
})
intentosRouter.put('/:id/respuestas', validate({ params: idParam, body: respuestasBody }), asyncHandler(async (req, res) => {
  const { respuestas } = req.body as z.infer<typeof respuestasBody>
  res.json(await svc.guardarRespuestas(req.usuario!, BigInt(req.params.id!), respuestas))
}))

// POST /intentos/:id/entregar
intentosRouter.post('/:id/entregar', validate({ params: idParam }), asyncHandler(async (req, res) => {
  res.json(await svc.entregar(req.usuario!, BigInt(req.params.id!)))
}))

// POST /intentos/:id/preguntas/:preguntaId/responder — SOLO práctica
const responderBody = z.object({ opcionesElegidas: z.array(z.string()).default([]), texto: z.string().optional() })
const responderParams = z.object({ id: z.coerce.bigint(), preguntaId: z.coerce.bigint() })
intentosRouter.post('/:id/preguntas/:preguntaId/responder', validate({ params: responderParams, body: responderBody }), asyncHandler(async (req, res) => {
  const { opcionesElegidas, texto } = req.body as z.infer<typeof responderBody>
  res.json(await svc.responderPractica(req.usuario!, BigInt(req.params.id!), BigInt(req.params.preguntaId!), opcionesElegidas, texto))
}))

// POST /intentos/:id/eventos — registra evento de integridad (Req 10.2)
const eventoBody = z.object({ tipo: z.enum(['perdida_foco', 'cambio_pestana', 'salida_pantalla_completa', 'pegado']) })
intentosRouter.post('/:id/eventos', validate({ params: idParam, body: eventoBody }), asyncHandler(async (req, res) => {
  const intentoId = BigInt(req.params.id!)
  const intento = await prisma.intento.findUnique({ where: { id: intentoId }, select: { estudianteId: true } })
  if (!intento) throw noEncontrado('Intento no encontrado')
  if (intento.estudianteId !== req.usuario!.id) throw prohibido('Este intento no te pertenece')
  const { tipo } = req.body as z.infer<typeof eventoBody>
  await prisma.eventoIntegridad.create({ data: { intentoId, tipo } })
  res.status(201).json({ ok: true })
}))
