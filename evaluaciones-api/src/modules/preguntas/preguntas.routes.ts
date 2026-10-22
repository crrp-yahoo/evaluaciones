import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/errorHandler'
import { validate } from '../../middlewares/validate'
import { autenticar, requerirRol } from '../../middlewares/auth'
import * as svc from './preguntas.service'
import { crearPreguntaSchema, actualizarPreguntaSchema, filtroPreguntasSchema } from './preguntas.schema'

export const preguntasRouter = Router()
preguntasRouter.use(autenticar, requerirRol('admin', 'profesor'))

const idParam = z.object({ id: z.coerce.bigint() })

preguntasRouter.get('/', validate({ query: filtroPreguntasSchema }), asyncHandler(async (req, res) => {
  const f = req.query as unknown as z.infer<typeof filtroPreguntasSchema>
  res.json(await svc.listar(req.usuario!, f))
}))

preguntasRouter.get('/:id', validate({ params: idParam }), asyncHandler(async (req, res) => {
  res.json(await svc.obtener(req.usuario!, BigInt((req.params as unknown as { id: bigint }).id)))
}))

preguntasRouter.post('/', validate({ body: crearPreguntaSchema }), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.crear(req.usuario!, req.body))
}))

preguntasRouter.put('/:id', validate({ params: idParam, body: actualizarPreguntaSchema }), asyncHandler(async (req, res) => {
  res.json(await svc.actualizar(req.usuario!, BigInt((req.params as unknown as { id: bigint }).id), req.body))
}))

preguntasRouter.delete('/:id', validate({ params: idParam }), asyncHandler(async (req, res) => {
  await svc.eliminar(req.usuario!, BigInt((req.params as unknown as { id: bigint }).id))
  res.json({ ok: true })
}))
