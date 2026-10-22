import { prisma } from '../../config/db'
import type { Rol } from '@prisma/client'
import { noEncontrado, validacion } from '../../utils/AppError'
import { hashPassword } from '../auth/password'

const serializar = (u: { id: bigint; nombre: string; email: string; rol: Rol; activo: boolean; creadoEn: Date }) => ({
  id: u.id.toString(), nombre: u.nombre, email: u.email, rol: u.rol, activo: u.activo, creadoEn: u.creadoEn,
})

export async function listar(page: number, pageSize: number, q?: string, rol?: Rol) {
  const where = {
    ...(rol ? { rol } : {}),
    ...(q ? { OR: [{ nombre: { contains: q } }, { email: { contains: q } }] } : {}),
  }
  const [rows, total] = await Promise.all([
    prisma.usuario.findMany({ where, orderBy: { creadoEn: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.usuario.count({ where }),
  ])
  return { rows: rows.map(serializar), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export async function crear(data: { nombre: string; email: string; password: string; rol: Rol }) {
  const email = data.email.trim().toLowerCase()
  const existe = await prisma.usuario.findUnique({ where: { email } })
  if (existe) throw validacion('El email ya está registrado')
  const u = await prisma.usuario.create({
    data: { nombre: data.nombre.trim(), email, passwordHash: await hashPassword(data.password), rol: data.rol },
  })
  return serializar(u)
}

export async function actualizar(id: bigint, data: { nombre?: string; rol?: Rol; password?: string }) {
  const u = await prisma.usuario.findUnique({ where: { id } })
  if (!u) throw noEncontrado('Usuario no encontrado')
  const updated = await prisma.usuario.update({
    where: { id },
    data: {
      ...(data.nombre ? { nombre: data.nombre.trim() } : {}),
      ...(data.rol ? { rol: data.rol } : {}),
      ...(data.password ? { passwordHash: await hashPassword(data.password) } : {}),
    },
  })
  return serializar(updated)
}

export async function cambiarActivo(id: bigint, activo: boolean) {
  const u = await prisma.usuario.findUnique({ where: { id } })
  if (!u) throw noEncontrado('Usuario no encontrado')
  // Si se desactiva, revocar sus sesiones.
  if (!activo) await prisma.refreshToken.updateMany({ where: { usuarioId: id }, data: { revocado: true } })
  return serializar(await prisma.usuario.update({ where: { id }, data: { activo } }))
}
