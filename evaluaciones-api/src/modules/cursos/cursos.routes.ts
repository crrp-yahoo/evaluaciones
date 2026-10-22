import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/errorHandler'
import { validate } from '../../middlewares/validate'
import { autenticar, requerirRol } from '../../middlewares/auth'
import * as svc from './cursos.service'

export const cursosRouter = Router()
export const misCursosRouter = Router()

cursosRouter.use(autenticar)

const idParam = z.object({ id: z.coerce.bigint() })
const cursoBody = z.object({ nombre: z.string().min(1), profesorId: z.coerce.bigint().optional() })
const inscripcionBody = z.object({ estudianteId: z.coerce.bigint() })
const inscParams = z.object({ id: z.coerce.bigint(), estudianteId: z.coerce.bigint() })

// GET /cursos — admin y profesor
cursosRouter.get('/', requerirRol('admin', 'profesor'), asyncHandler(async (req, res) => {
  res.json(await svc.listar(req.usuario!))
}))

cursosRouter.post('/', requerirRol('admin', 'profesor'), validate({ body: cursoBody }), asyncHandler(async (req, res) => {
  const { nombre, profesorId } = req.body as z.infer<typeof cursoBody>
  res.status(201).json(await svc.crear(req.usuario!, nombre, profesorId))
}))

cursosRouter.patch('/:id', requerirRol('admin', 'profesor'), validate({ params: idParam, body: z.object({ nombre: z.string().min(1) }) }), asyncHandler(async (req, res) => {
  const id = BigInt((req.params as unknown as { id: bigint }).id)
  res.json(await svc.actualizar(req.usuario!, id, req.body.nombre))
}))

cursosRouter.delete('/:id', requerirRol('admin', 'profesor'), validate({ params: idParam }), asyncHandler(async (req, res) => {
  const id = BigInt((req.params as unknown as { id: bigint }).id)
  await svc.eliminar(req.usuario!, id)
  res.json({ ok: true })
}))

// Inscripciones
cursosRouter.get('/:id/estudiantes', requerirRol('admin', 'profesor'), validate({ params: idParam }), asyncHandler(async (req, res) => {
  const id = BigInt((req.params as unknown as { id: bigint }).id)
  res.json(await svc.estudiantesDeCurso(req.usuario!, id))
}))

cursosRouter.post('/:id/inscripciones', requerirRol('admin', 'profesor'), validate({ params: idParam, body: inscripcionBody }), asyncHandler(async (req, res) => {
  const id = BigInt((req.params as unknown as { id: bigint }).id)
  const { estudianteId } = req.body as z.infer<typeof inscripcionBody>
  await svc.inscribir(req.usuario!, id, estudianteId)
  res.status(201).json({ ok: true })
}))

cursosRouter.delete('/:id/inscripciones/:estudianteId', requerirRol('admin', 'profesor'), validate({ params: inscParams }), asyncHandler(async (req, res) => {
  const p = req.params as unknown as { id: bigint; estudianteId: bigint }
  await svc.desinscribir(req.usuario!, BigInt(p.id), BigInt(p.estudianteId))
  res.json({ ok: true })
}))

// GET /mis-cursos — estudiante y profesor (Req 3.3)
misCursosRouter.get('/', autenticar, requerirRol('estudiante', 'profesor'), asyncHandler(async (req, res) => {
  res.json(await svc.misCursos(req.usuario!))
}))
