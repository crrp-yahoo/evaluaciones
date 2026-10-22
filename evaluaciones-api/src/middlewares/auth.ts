import type { NextFunction, Request, Response } from 'express'
import type { Rol } from '@prisma/client'
import { verifyAccessToken } from '../modules/auth/jwt'
import { prohibido, tokenInvalido } from '../utils/AppError'

// Usuario autenticado adjuntado a la request.
export interface UsuarioAuth {
  id: bigint
  rol: Rol
  email: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAuth
    }
  }
}

// Verifica el access token del header Authorization: Bearer (Req 2.3).
export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return next(tokenInvalido('Falta el token de acceso'))
  try {
    const payload = verifyAccessToken(header.slice(7))
    req.usuario = { id: BigInt(payload.sub), rol: payload.rol, email: payload.email }
    next()
  } catch {
    next(tokenInvalido('Token inválido o expirado'))
  }
}

// Exige uno de los roles indicados (Req 2.2).
export function requerirRol(...roles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) return next(tokenInvalido())
    if (!roles.includes(req.usuario.rol)) return next(prohibido('Tu rol no permite esta acción'))
    next()
  }
}
