import { prisma } from '../../config/db'
import { authInvalida, tokenInvalido } from '../../utils/AppError'
import { hashPassword, verifyPassword } from './password'
import { generateRefreshToken, hashRefreshToken, signAccessToken } from './jwt'

// ─────────────────────────────────────────────────────────────────────────────
// Servicio de autenticación. El refresh token se guarda hasheado y se rota en
// cada uso; si se detecta reutilización de un token ya revocado, se revocan
// todas las sesiones del usuario (Req 1.3).
// ─────────────────────────────────────────────────────────────────────────────

export interface SesionCreada {
  accessToken: string
  refreshToken: string
  refreshExpiraEn: Date
  usuario: { id: string; nombre: string; email: string; rol: string }
}

export async function login(email: string, password: string): Promise<SesionCreada> {
  const emailNorm = email.trim().toLowerCase()
  const usuario = await prisma.usuario.findUnique({ where: { email: emailNorm } })
  // Mensaje genérico: no revelar si el email existe (Req 1.2).
  if (!usuario || !usuario.activo) throw authInvalida()
  const ok = await verifyPassword(usuario.passwordHash, password)
  if (!ok) throw authInvalida()
  return crearSesion(usuario)
}

async function crearSesion(usuario: { id: bigint; nombre: string; email: string; rol: string }): Promise<SesionCreada> {
  const accessToken = signAccessToken({ sub: usuario.id.toString(), rol: usuario.rol as never, email: usuario.email })
  const { token, tokenHash, expiraEn } = generateRefreshToken()
  await prisma.refreshToken.create({ data: { usuarioId: usuario.id, tokenHash, expiraEn } })
  return {
    accessToken, refreshToken: token, refreshExpiraEn: expiraEn,
    usuario: { id: usuario.id.toString(), nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  }
}

export async function refresh(presentedToken: string): Promise<SesionCreada> {
  const tokenHash = hashRefreshToken(presentedToken)
  const registro = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { usuario: true } })

  if (!registro) throw tokenInvalido('Refresh token no reconocido')

  // Reutilización de un token ya revocado → posible robo: revocar todas las sesiones.
  if (registro.revocado) {
    await prisma.refreshToken.updateMany({ where: { usuarioId: registro.usuarioId }, data: { revocado: true } })
    throw tokenInvalido('Sesión comprometida; vuelve a iniciar sesión')
  }
  if (registro.expiraEn < new Date()) throw tokenInvalido('Refresh token expirado')
  if (!registro.usuario.activo) throw tokenInvalido('Usuario inactivo')

  // Rotación: revoca el actual y emite uno nuevo.
  await prisma.refreshToken.update({ where: { id: registro.id }, data: { revocado: true } })
  return crearSesion(registro.usuario)
}

export async function logout(presentedToken: string | undefined): Promise<void> {
  if (!presentedToken) return
  const tokenHash = hashRefreshToken(presentedToken)
  await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revocado: true } })
}

export async function perfil(usuarioId: bigint) {
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!u) throw tokenInvalido()
  return { id: u.id.toString(), nombre: u.nombre, email: u.email, rol: u.rol, activo: u.activo }
}

export { hashPassword }
