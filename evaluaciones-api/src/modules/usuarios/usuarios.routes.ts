import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/errorHandler'
import { validate } from '../../middlewares/validate'
import { autenticar, requerirRol } from '../../middlewares/auth'
import { registrarAuditoria } from '../../utils/auditoria'
import * as svc from './usuarios.service'

export const usuariosRouter = Router()

// Toda la gestión de usuarios es exclusiva de admin (Req 2.5).
usuariosRouter.use(autenticar, requerirRol('admin'))

const rolEnum = z.enum(['admin', 'profesor', 'estudiante'])
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  rol: rolEnum.optional(),
})
const crearBody = z.object({ nombre: z.string().min(1), email: z.string().email(), password: z.string().min(8), rol: rolEnum })
const actualizarBody = z.object({ nombre: z.string().min(1).optional(), rol: rolEnum.optional(), password: z.string().min(8).optional() })
const activoBody = z.object({ activo: z.boolean() })
const idParam = z.object({ id: z.coerce.bigint() })

usuariosRouter.get('/', validate({ query: listQuery }), asyncHandler(async (req, res) => {
  const { page, pageSize, q, rol } = req.query as unknown as z.infer<typeof listQuery>
  res.json(await svc.listar(page, pageSize, q, rol))
}))

usuariosRouter.post('/', validate({ body: crearBody }), asyncHandler(async (req, res) => {
  const u = await svc.crear(req.body)
  await registrarAuditoria(req.usuario!.id, 'USUARIO_CREAR', { usuarioCreado: u.id, rol: u.rol })
  res.status(201).json(u)
}))

usuariosRouter.patch('/:id', validate({ params: idParam, body: actualizarBody }), asyncHandler(async (req, res) => {
  const id = BigInt((req.params as unknown as { id: bigint }).id)
  const u = await svc.actualizar(id, req.body)
  await registrarAuditoria(req.usuario!.id, 'USUARIO_ACTUALIZAR', { usuario: u.id })
  res.json(u)
}))

usuariosRouter.patch('/:id/activo', validate({ params: idParam, body: activoBody }), asyncHandler(async (req, res) => {
  const id = BigInt((req.params as unknown as { id: bigint }).id)
  const { activo } = req.body as z.infer<typeof activoBody>
  const u = await svc.cambiarActivo(id, activo)
  await registrarAuditoria(req.usuario!.id, activo ? 'USUARIO_ACTIVAR' : 'USUARIO_DESACTIVAR', { usuario: u.id })
  res.json(u)
}))
