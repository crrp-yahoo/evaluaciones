import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/errorHandler'
import { validate } from '../../middlewares/validate'
import { autenticar, requerirRol } from '../../middlewares/auth'
import * as svc from './examenes.service'
import { crearExamenSchema, actualizarExamenSchema, preguntasExamenSchema } from './examenes.schema'

export const examenesRouter = Router()
examenesRouter.use(autenticar)

const idParam = z.object({ id: z.coerce.bigint() })
const soloProfe = requerirRol('admin', 'profesor')

// GET /examenes/disponibles — estudiantes (antes de /:id para no colisionar).
examenesRouter.get('/disponibles', requerirRol('estudiante'), asyncHandler(async (req, res) => {
  res.json(await svc.disponiblesParaEstudiante(req.usuario!))
}))

examenesRouter.get('/', soloProfe, asyncHandler(async (req, res) => {
  const cursoId = req.query.cursoId ? BigInt(String(req.query.cursoId)) : undefined
  res.json(await svc.listar(req.usuario!, cursoId))
}))

examenesRouter.get('/:id', soloProfe, validate({ params: idParam }), asyncHandler(async (req, res) => {
  res.json(await svc.obtener(req.usuario!, BigInt((req.params as unknown as { id: bigint }).id)))
}))

examenesRouter.post('/', soloProfe, validate({ body: crearExamenSchema }), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.crear(req.usuario!, req.body))
}))

examenesRouter.patch('/:id', soloProfe, validate({ params: idParam, body: actualizarExamenSchema }), asyncHandler(async (req, res) => {
  res.json(await svc.actualizar(req.usuario!, BigInt((req.params as unknown as { id: bigint }).id), req.body))
}))

examenesRouter.put('/:id/preguntas', soloProfe, validate({ params: idParam, body: preguntasExamenSchema }), asyncHandler(async (req, res) => {
  const { preguntas } = req.body as z.infer<typeof preguntasExamenSchema>
  res.json(await svc.definirPreguntas(req.usuario!, BigInt((req.params as unknown as { id: bigint }).id), preguntas))
}))

examenesRouter.post('/:id/publicar', soloProfe, validate({ params: idParam }), asyncHandler(async (req, res) => {
  res.json(await svc.publicar(req.usuario!, BigInt((req.params as unknown as { id: bigint }).id)))
}))
